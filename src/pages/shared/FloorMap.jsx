import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Plus, Play, Pause, X, Check, Mic, Camera, StickyNote, MapPin, Square, LayoutGrid, Pencil, Trash2,
  ListChecks, MessageSquare, Layers, Shirt, User, Package, Wrench, Contact, Sparkles,
  ConciergeBell, Sofa, Dumbbell, BedSingle, Waves, Flame, CloudFog, Snowflake, Coffee, Archive, ShoppingBag, Users,
} from 'lucide-react'
import { Page, useRole } from '../../components/Shell'
import { Avatar, AvatarStack, Bar, ringColor } from '../../components/ui'
import TaskEditor from '../../components/TaskEditor'
import { FormModal } from '../../components/Overlays'
import { TaskChip, tagLabel, StatusLine } from './Rooms'
import { useStore, STAFF_PINS, STAFF, staffById, roomSummary, taskStats, PLAN_COLS, PLAN_ROWS, blockFits, freeCell, TASK_STATUS, fmtTime } from '../../data/store'
import { img } from '../../data/assets'

/*
 * Customisable spa plan: each LG room is a block on a 6 × 4 grid. Clients build their own layout —
 * add blocks, drag to move, drag the corner to resize, rename or remove — instead of uploading a floor plan.
 * Blocks show RFID stock (towels, items…), task status pins, staff and notes; a block = a room on the Location page.
 */
const CONT = { x: 80, y: 196, w: 992, h: 640 }               // the glass panel holding the plan
const GRID = { x: 92, y: 210, w: 968, h: 540, gap: 8 }        // the block grid inside it
const COL = (GRID.w - (PLAN_COLS - 1) * GRID.gap) / PLAN_COLS
const ROW = (GRID.h - (PLAN_ROWS - 1) * GRID.gap) / PLAN_ROWS
const rectOf = b => ({
  left: GRID.x + b.c * (COL + GRID.gap), top: GRID.y + b.r * (ROW + GRID.gap),
  width: b.w * COL + (b.w - 1) * GRID.gap, height: b.h * ROW + (b.h - 1) * GRID.gap,
})

const STATUS_COLOR = { overdue: '#d8321f', soon: '#e3b02b', ontrack: '#0f8a76' }
const LAYERS = [
  { k: 'tasks', label: 'Tasks', icon: ListChecks },
  { k: 'comments', label: 'Comments', icon: MessageSquare },
  { k: 'towels', label: 'Towels', icon: Layers, unit: 'towels' },
  { k: 'robes', label: 'Robes', icon: Shirt, unit: 'robes' },
  { k: 'guests', label: 'Guests', icon: User, unit: 'guests' },
  { k: 'products', label: 'Products', icon: Package, unit: 'items' },
  { k: 'equipment', label: 'Equipment', icon: Wrench, unit: 'equipment' },
  { k: 'staff', label: 'Staff', icon: Contact },
]
const ROOM_ICON = { reception: ConciergeBell, relax: Sofa, gym: Dumbbell, hydro: Waves, thermal: Flame, steam: CloudFog, ice: Snowflake, cafe: Coffee, linen: Archive, retail: ShoppingBag, boh: Users }
const TYPE_ICON = { treatment: BedSingle, wellness: Waves, fitness: Dumbbell, reception: ConciergeBell, boh: Archive }
const iconFor = room => ROOM_ICON[room.id] || TYPE_ICON[room.type] || LayoutGrid
const TYPES = [['Treatment', 'treatment'], ['Wellness', 'wellness'], ['Fitness', 'fitness'], ['Reception', 'reception'], ['Back of house', 'boh']]
const SIZES = { '1 × 1': [1, 1], '2 × 1': [2, 1], '1 × 2': [1, 2], '2 × 2': [2, 2] }

const countOf = v => (Array.isArray(v) ? v[0] : v) || 0
const level = v => { if (!Array.isArray(v)) return 'ok'; const q = v[0] / v[1]; return q < 0.35 ? 'low' : q < 0.6 ? 'mid' : 'ok' }

/** Status of a room on the map — derived from the same tasks the Location page shows */
export function roomStatus(room, tasks) {
  const sum = roomSummary(room, tasks)
  const open = sum.list.filter(t => t.status !== 'done')
  const status = sum.overdue ? 'overdue' : sum.list.some(t => t.status === 'soon') ? 'soon' : 'ontrack'
  return { status, sum, open: open.length }
}

export default function FloorMap() {
  const role = useRole()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { tasks, rooms, notes, dispatch, notify, setAssignOpen } = useStore()
  const [layers, setLayers] = useState({ tasks: true, comments: true, towels: true, robes: false, guests: false, products: true, equipment: false, staff: true })
  const [sel, setSel] = useState(params.get('room') || (role === 'manager' ? 'hydro' : null))
  const [hover, setHover] = useState(null)       // room whose pulsing blip is hovered
  const [editing, setEditing] = useState(false)
  const [drag, setDrag] = useState(null)          // { id, block, valid } while moving / resizing in edit mode
  const [placing, setPlacing] = useState(false)   // dropping a note pin
  const [draft, setDraft] = useState(null)        // { room, fx, fy } waiting for its note
  const [openNote, setOpenNote] = useState(null)
  const [editor, setEditor] = useState(null)
  const [modal, setModal] = useState(null)        // 'add' | { rename: room }
  const [restockDone, setRestockDone] = useState(false)
  const dragRef = useRef(null)

  const plan = rooms.filter(r => r.floor === 'LG' && r.block)
  const info = useMemo(() => Object.fromEntries(plan.map(r => [r.id, roomStatus(r, tasks)])), [plan, tasks])
  const selRoom = plan.find(r => r.id === sel)
  const totals = Object.fromEntries(LAYERS.map(l => [l.k, l.k === 'staff' ? STAFF_PINS.length : plan.reduce((n, r) => n + countOf(r.stock?.[l.k]), 0)]))
  const stats = taskStats(role === 'manager' ? tasks : tasks.filter(t => t.people.includes('amy')))
  const base = role === 'manager' ? { done: 37, all: 33 } : { done: 3, all: 8 }
  const done = stats.done + base.done, all = stats.all + base.all
  const addSlot = role === 'manager' ? freeCell(plan) : null

  // arriving from a room card ("Show on floor map") selects that block
  useEffect(() => { const id = params.get('room'); if (id) setSel(id) }, [params.get('room')]) // eslint-disable-line

  // Predictive restock: the stocked item furthest below par
  const restock = useMemo(() => {
    let worst = null
    plan.forEach(r => ['towels', 'robes', 'products'].forEach(k => {
      const v = r.stock?.[k]
      if (Array.isArray(v) && v[0] / v[1] < 0.35 && (!worst || v[0] / v[1] < worst.q)) worst = { room: r, k, n: v[0], par: v[1], q: v[0] / v[1] }
    }))
    if (!worst) return null
    const src = plan.find(r => r.id !== worst.room.id && Array.isArray(r.stock?.[worst.k]) && r.stock[worst.k][0] > worst.par)
    return { ...worst, src }
  }, [plan])

  /* ── edit mode: drag a block to move it, drag its corner to resize ── */
  const scale = () => document.querySelector('.stage').getBoundingClientRect().width / 1552
  const startDrag = (e, room, mode) => {
    if (!editing) return
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { id: room.id, mode, x: e.clientX, y: e.clientY, start: room.block, moved: false }
    const move = ev => {
      const d = dragRef.current, k = scale()
      const dc = Math.round((ev.clientX - d.x) / k / (COL + GRID.gap)), dr = Math.round((ev.clientY - d.y) / k / (ROW + GRID.gap))
      if (dc || dr) d.moved = true
      const b = d.mode === 'move'
        ? { ...d.start, c: d.start.c + dc, r: d.start.r + dr }
        : { ...d.start, w: Math.max(1, d.start.w + dc), h: Math.max(1, d.start.h + dr) }
      setDrag({ id: d.id, block: b, valid: blockFits(rooms, b, d.id) })
    }
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      setDrag(cur => {
        if (cur && cur.valid) dispatch({ type: 'updateRoom', room: { id: cur.id, block: cur.block } })
        else if (cur && dragRef.current?.moved) notify('That space is taken — blocks can’t overlap')
        return null
      })
      if (!dragRef.current?.moved) setSel(room.id)
      dragRef.current = null
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const onBlockClick = (e, room) => {
    if (editing) return
    if (placing) {
      const r = e.currentTarget.getBoundingClientRect()
      setDraft({ room: room.id, where: room.name, fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height })
      setPlacing(false)
      return
    }
    setSel(room.id)
  }
  const editTask = t => setEditor({ mode: 'edit', task: t, room: rooms.find(r => r.id === t.room) })
  const removeBlock = room => {
    const open = info[room.id]?.open || 0
    if (open) return notify(`${room.name} still has ${open} open task${open > 1 ? 's' : ''} — finish or move them first`)
    dispatch({ type: 'removeRoom', id: room.id }); setSel(null); notify(`${room.name} removed from the plan`)
  }
  const createRestock = () => {
    const { room, k } = restock
    dispatch({ type: 'addTask', task: { id: 't-' + Date.now(), title: `Restock ${k}`, room: room.id, location: room.name, due: '12:30', status: 'soon', people: [] } })
    setRestockDone(true)
    setAssignOpen(true)
  }

  const plan2 = plan.map(r => (drag?.id === r.id ? { ...r, block: drag.block } : r))
  return (
    <Page view="map" bg="dark" nav={false}>
      {/* layer chips — tasks, comments and RFID-tagged items */}
      <div className="abs" style={{ left: CONT.x, top: 144, display: 'flex', gap: 6, zIndex: 12 }}>
        {LAYERS.map(l => {
          const on = layers[l.k], I = l.icon
          return (
            <button key={l.k} onClick={() => setLayers(x => ({ ...x, [l.k]: !x[l.k] }))} className="chip float"
              title={`${on ? 'Hide' : 'Show'} ${l.label.toLowerCase()} on the plan`}
              style={{ height: 34, padding: '0 13px', fontSize: 12, gap: 6, background: on ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.08)', color: on ? '#fff' : 'rgba(255,255,255,.65)', transition: 'background .2s' }}>
              <I size={13} />{l.label}{!['tasks', 'comments'].includes(l.k) && <span style={{ opacity: .55, fontSize: 10.5 }}>{totals[l.k]}</span>}
            </button>
          )
        })}
      </div>
      {role === 'manager' && (
        <button className="chip float abs" onClick={() => { setEditing(e => !e); setPlacing(false) }}
          style={{ left: CONT.x + CONT.w - 116, top: 144, width: 116, height: 34, justifyContent: 'center', fontSize: 12, gap: 6, zIndex: 12,
            background: editing ? 'var(--teal)' : 'rgba(255,255,255,.14)', color: '#fff' }}>
          {editing ? <><Check size={13} /> Done</> : <><Pencil size={13} /> Edit plan</>}
        </button>
      )}

      {/* the plan */}
      <div className="glass abs" style={{ left: CONT.x, top: CONT.y, width: CONT.w, height: CONT.h, borderRadius: 30, background: 'rgba(255,255,255,.06)' }} />
      {editing && (
        <div className="abs fade" style={{ left: GRID.x, top: GRID.y, width: GRID.w, height: GRID.h, pointerEvents: 'none' }}>
          {Array.from({ length: PLAN_COLS * PLAN_ROWS }, (_, i) => {
            const rc = rectOf({ c: i % PLAN_COLS, r: Math.floor(i / PLAN_COLS), w: 1, h: 1 })
            return <div key={i} style={{ position: 'absolute', left: rc.left - GRID.x, top: rc.top - GRID.y, width: rc.width, height: rc.height, borderRadius: 16, border: '1px dashed rgba(255,255,255,.14)' }} />
          })}
        </div>
      )}

      {plan2.map(room => {
        const rc = rectOf(room.block)
        const st = info[room.id] || { status: 'ontrack', open: 0, sum: { list: [] } }
        const on = sel === room.id
        const dragging = drag?.id === room.id
        const I = iconFor(room)
        const chips = LAYERS.filter(l => l.unit && layers[l.k] && room.stock?.[l.k] != null).slice(0, room.block.h > 1 ? 4 : 2)
        const roomNotes = notes.filter(n => n.room === room.id)
        return (
          <div key={room.id} className="abs" onClick={e => onBlockClick(e, room)} onPointerDown={e => startDrag(e, room, 'move')}
            title={editing ? 'Drag to move · drag the corner to resize' : placing ? `Drop your note in ${room.name}` : room.name}
            style={{ ...rc, borderRadius: 18, zIndex: dragging ? 9 : on ? 3 : 2,
              background: on ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)',
              border: dragging ? `1.5px dashed ${drag.valid ? 'var(--teal)' : '#ff6a55'}` : editing ? '1.5px dashed rgba(255,255,255,.45)' : `1px solid rgba(255,255,255,${on ? .42 : .12})`,
              boxShadow: on && !editing ? '0 18px 40px -22px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.2)' : 'none',
              cursor: editing ? 'grab' : placing ? 'crosshair' : 'pointer', transition: dragging ? 'none' : 'left .3s, top .3s, width .3s, height .3s, background .25s, border-color .25s', touchAction: 'none' }}>
            {/* label */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: room.block.h > 1 ? '42%' : '30%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', fontWeight: 500, padding: '0 10px', pointerEvents: 'none' }}>
              <I size={12} strokeWidth={1.6} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</span>
            </div>
            {/* RFID stock chips */}
            {!editing && (
              <div style={{ position: 'absolute', left: 12, bottom: 10, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', pointerEvents: 'none' }}>
                {chips.map(l => {
                  const v = room.stock[l.k], lv = level(v), LI = l.icon
                  return (
                    <span key={l.k} className="chip" title={Array.isArray(v) ? `${v[0]} of ${v[1]} par` : `${v} tagged`}
                      style={{ height: 22, fontSize: 10, padding: '0 9px', gap: 5,
                        background: lv === 'low' ? 'rgba(216,67,47,.28)' : lv === 'mid' ? 'rgba(210,154,18,.28)' : 'rgba(255,255,255,.12)',
                        color: lv === 'low' ? '#ffb4a6' : lv === 'mid' ? '#ffd98a' : 'rgba(255,255,255,.85)' }}>
                      <LI size={10} />{countOf(v)} {l.unit}
                    </span>
                  )
                })}
              </div>
            )}
            {/* task status pin */}
            {!editing && layers.tasks && st.open > 0 && (() => {
              const c = STATUS_COLOR[st.status]
              return (
                <span onMouseEnter={() => setHover(room.id)} onMouseLeave={() => setHover(h => (h === room.id ? null : h))}
                  style={{ position: 'absolute', left: '50%', top: room.block.h > 1 ? '30%' : 18, transform: 'translate(-50%, -50%)', width: 40, height: 40, borderRadius: '50%', background: `${c}44`, display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 3 }}>
                  {st.status === 'overdue' && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `${c}44`, animation: 'ping 2s ease-out infinite' }} />}
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: c, color: '#fff', fontSize: 10, display: 'grid', placeItems: 'center', boxShadow: on ? '0 0 0 2px #fff' : 'none' }}>!</span>
                </span>
              )
            })()}
            {/* comments badge */}
            {!editing && layers.comments && roomNotes.length > 0 && (
              <span title={`${roomNotes.length} note${roomNotes.length > 1 ? 's' : ''}`} style={{ position: 'absolute', right: 10, top: 10, minWidth: 18, height: 18, borderRadius: 9, background: '#3d7bd9', color: '#fff', fontSize: 9.5, display: 'grid', placeItems: 'center', padding: '0 5px', pointerEvents: 'none' }}>{roomNotes.length}</span>
            )}
            {/* edit controls */}
            {editing && (
              <>
                <span style={{ position: 'absolute', left: 10, bottom: 8, fontSize: 9.5, opacity: .55, pointerEvents: 'none' }}>{room.block.w} × {room.block.h}</span>
                <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex', gap: 4 }}>
                  <button title="Rename / change type" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setModal({ rename: room }) }}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center' }}><Pencil size={11} /></button>
                  <button title="Remove block" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); removeBlock(room) }}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(216,67,47,.5)', display: 'grid', placeItems: 'center' }}><Trash2 size={11} /></button>
                </div>
                <span title="Drag to resize" onPointerDown={e => startDrag(e, room, 'resize')}
                  style={{ position: 'absolute', right: -6, bottom: -6, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.4)', cursor: 'nwse-resize', zIndex: 2 }} />
              </>
            )}
          </div>
        )
      })}

      {/* "+ Add new block" tile in the first free cell */}
      {addSlot && (
        <button className="abs card-link" onClick={() => setModal('add')}
          style={{ ...rectOf(addSlot), borderRadius: 18, border: '1px dashed rgba(255,255,255,.22)', background: 'rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 9, letterSpacing: '.14em', color: 'rgba(255,255,255,.55)', zIndex: 2 }}>
          <Plus size={12} /> ADD NEW BLOCK
        </button>
      )}

      {/* staff and notes, drawn on top of their blocks */}
      {!editing && plan2.map(room => {
        const rc = rectOf(room.block)
        const at = (fx, fy) => ({ left: rc.left + fx * rc.width, top: rc.top + fy * rc.height })
        return (
          <div key={'o' + room.id} style={{ pointerEvents: placing ? 'none' : 'auto' }}>
            {layers.staff && STAFF_PINS.filter(p => p.room === room.id).map(p => {
              const s = staffById[p.staff], pos = at(p.fx, p.fy)
              return (
                <div key={p.staff} title={`${s.name} · ${s.note}`} className="abs" style={{ left: pos.left - 17, top: pos.top - 40, zIndex: 4, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.3))', transition: 'left .3s, top .3s' }}>
                  <div style={{ position: 'absolute', left: 11, top: 27, width: 12, height: 12, background: ringColor(s.status), transform: 'rotate(45deg)', borderRadius: 2 }} />
                  <Avatar id={p.staff} size={34} style={{ border: `3px solid ${ringColor(s.status)}`, position: 'relative' }} />
                </div>
              )
            })}
            {layers.comments && notes.filter(n => n.room === room.id).map(n => {
              const pos = at(n.fx, n.fy)
              const style = { position: 'absolute', left: pos.left, top: pos.top - 15, zIndex: 5, transition: 'left .3s, top .3s' }
              if (n.kind === 'voice') return null
              return (
                <button key={n.id} onClick={() => setOpenNote(n)} title={`${n.title} · ${staffById[n.by]?.name}`}
                  style={{ ...style, display: 'flex', alignItems: 'center', gap: 6, padding: 3, paddingRight: 11, borderRadius: 999, background: 'rgba(250,240,225,.92)', color: 'var(--ink)', maxWidth: 150 }}>
                  {n.photo ? <img src={n.photo} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#f1d9a6', display: 'grid', placeItems: 'center' }}><StickyNote size={12} /></span>}
                  <span style={{ fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.kind === 'photo' ? `${n.count || 1} photos` : n.title}</span>
                </button>
              )
            })}
          </div>
        )
      })}

      {draft && (() => {
        const room = plan.find(r => r.id === draft.room), rc = rectOf(room.block)
        return <MapPin className="abs" size={30} fill="var(--teal)" color="#fff" strokeWidth={1.5}
          style={{ left: rc.left + draft.fx * rc.width - 15, top: rc.top + draft.fy * rc.height - 30, zIndex: 6, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.35))' }} />
      })()}

      {/* hovering a pulsing blip previews that area's tasks */}
      {hover && !editing && !placing && (() => {
        const room = plan2.find(r => r.id === hover); if (!room) return null
        const st = info[room.id], rc = rectOf(room.block)
        const open = st.sum.list.filter(t => t.status !== 'done').sort((a, b) => ['overdue', 'soon', 'progress', 'pending'].indexOf(a.status) - ['overdue', 'soon', 'progress', 'pending'].indexOf(b.status))
        const px = rc.left + rc.width / 2, py = rc.top + (room.block.h > 1 ? rc.height * 0.3 : 18)
        const h = 62 + Math.min(4, open.length) * 34
        const top = py - h - 26 < CONT.y - 40 ? py + 26 : py - h - 26
        const left = Math.max(CONT.x + 8, Math.min(px - 130, CONT.x + CONT.w - 268))
        return (
          <div className="abs fade" style={{ left, top, width: 260, zIndex: 20, pointerEvents: 'none', borderRadius: 20, padding: '12px 14px', background: 'rgba(236,241,241,.94)', color: 'var(--ink)', boxShadow: '0 18px 40px -16px rgba(0,0,0,.55)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{room.name}</span>
              <span style={{ fontSize: 10, color: STATUS_COLOR[st.status], fontWeight: 600, letterSpacing: '.06em' }}>{st.open} OPEN</span>
            </div>
            <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              {open.slice(0, 4).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span className="dot" style={{ background: TASK_STATUS[t.status].color }} />
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)', flex: 'none' }}>{t.people[0] ? staffById[t.people[0]].name.split(' ')[0] : 'Unassigned'} · {fmtTime(t.due)}</span>
                </div>
              ))}
              {open.length > 4 && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>+{open.length - 4} more — click the block</div>}
            </div>
          </div>
        )
      })()}

      {/* Predictive restock */}
      {restock && !editing && (
        <div className="abs rise" style={{ left: GRID.x, top: 762, width: GRID.w, height: 62, borderRadius: 22, background: 'rgba(190,170,90,.28)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px 0 12px', zIndex: 7 }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(229,180,60,.45)', display: 'grid', placeItems: 'center', flex: 'none' }}><Sparkles size={16} color="#ffe6a3" /></span>
          <span style={{ flex: 1, lineHeight: 1.35, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#ffd98a', fontWeight: 600 }}>Predictive restock.</div>
            <div style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {restock.room.name} {restock.k} are at {restock.n} of {restock.par}. At today’s booking rate they run out by 13:20.{restock.src ? ` ${restock.src.name} has stock ready.` : ''}
            </div>
          </span>
          {role === 'manager' && (restockDone
            ? <span className="chip" style={{ background: 'rgba(255,255,255,.18)', height: 30, fontSize: 11.5, padding: '0 12px' }}><Check size={12} /> Restock task created</span>
            : <button className="pill-btn white" style={{ height: 34, fontSize: 12 }} onClick={createRestock}>Create restock task</button>)}
        </div>
      )}
      {editing && (
        <div className="abs fade" style={{ left: GRID.x, top: 762, width: GRID.w, height: 62, borderRadius: 22, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', fontSize: 12, zIndex: 7 }}>
          <Pencil size={14} /> <span style={{ flex: 1 }}>Build your spa plan: drag a block to move it, drag its white corner to resize, ✎ to rename, 🗑 to remove. Each block is a room on the Location page.</span>
          <button className="pill-btn teal" style={{ height: 34, fontSize: 12 }} onClick={() => setEditing(false)}><Check size={13} /> Done</button>
        </div>
      )}

      {placing && (
        <div className="abs rise float" style={{ left: '50%', top: 98, transform: 'translateX(-50%)', zIndex: 25, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px 8px 18px', borderRadius: 999, background: 'rgba(12,45,50,.75)', boxShadow: '0 12px 30px -10px rgba(0,0,0,.4)' }}>
          <MapPin size={16} color="var(--teal)" />
          <span style={{ fontSize: 13 }}>Tap a block to drop your note there</span>
          <button className="pill-btn white" style={{ height: 32, fontSize: 12 }} onClick={() => setPlacing(false)}>Cancel</button>
        </div>
      )}

      {/* right column */}
      <AreaCard room={selRoom} info={selRoom && info[selRoom.id]} onTask={editTask} onLocation={() => nav(`/${role}/rooms?floor=LG`)} />

      <div className="glass abs rise" style={{ left: 1112, top: 572, width: 166, height: 166, padding: '16px 14px', animationDelay: '60ms' }}>
        <div style={{ fontSize: 13 }}>Completion rate</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <span style={{ fontSize: 30, fontWeight: 300 }}>{Math.round((done / all) * 100)}%</span>
          <span style={{ fontSize: 8, lineHeight: 1.3 }}>{done} / {all}<br />tasks done</span>
        </div>
        <Bar value={done / all} h={3} color="#fff" style={{ marginTop: 6 }} />
        <div style={{ fontSize: 9, marginTop: 14, lineHeight: 1.45, opacity: .85 }}>{all - done} remaining<br />{stats.overdue} overdue{role === 'manager' && ' · 1 blocked'}</div>
        <button onClick={() => nav(`/${role}/tasks`)} style={{ fontSize: 10, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>View progress <ArrowRight size={11} /></button>
      </div>
      <div className="glass abs rise" style={{ left: 1286, top: 572, width: 166, height: 166, padding: '16px 14px', animationDelay: '90ms' }}>
        <div style={{ fontSize: 13 }}>Staff on shift</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 30, fontWeight: 300, flex: 1 }}>12</span>
          <span style={{ fontSize: 8, textAlign: 'right' }}><span style={{ color: '#7ee0a0' }}>●</span> live<br />On shift</span>
        </div>
        <div style={{ fontSize: 9, lineHeight: 1.45, marginTop: 4 }}>
          {STAFF.filter(s => s.status === 'busy').length + 5} <span style={{ opacity: .6 }}>working ·</span> 3 <span style={{ opacity: .6 }}>available</span><br />{STAFF.filter(s => s.status === 'break').length - 1} <span style={{ opacity: .6 }}>on break</span>
        </div>
        <div style={{ marginTop: 8 }}><AvatarStack ids={['elena', 'sofia', 'lucas']} size={30} max={2} extra={10} /></div>
      </div>
      <NotesStrip notes={notes} onOpen={setOpenNote} onAdd={() => { setPlacing(true); setEditing(false) }} />

      {draft && <NoteModal where={draft.where} onClose={() => setDraft(null)}
        onSave={n => {
          dispatch({ type: 'addNote', note: { id: 'n' + Date.now(), room: draft.room, fx: Math.min(.8, Math.max(.05, draft.fx)), fy: Math.min(.85, Math.max(.15, draft.fy)), by: role === 'manager' ? 'elena' : 'amy', when: 'just now', ...n } })
          setDraft(null); notify(`${n.kind === 'voice' ? 'Voice' : n.kind === 'photo' ? 'Photo' : 'Text'} note pinned in ${n.where}`)
        }} />}
      {openNote && <NoteView note={openNote} onClose={() => setOpenNote(null)} onFocus={() => { setSel(openNote.room); setOpenNote(null) }} />}
      {editor && <TaskEditor {...editor} onClose={() => setEditor(null)} />}
      {modal === 'add' && (
        <FormModal title="Add a block" submit="Add to plan" onClose={() => setModal(null)}
          fields={[
            { name: 'name', label: 'Room name', placeholder: 'e.g. Treatment Room 5', required: true },
            { name: 'type', label: 'Type', options: TYPES.map(t => t[0]) },
            { name: 'size', label: 'Size on the plan', options: Object.keys(SIZES) },
          ]}
          onSubmit={v => {
            const [w, h] = SIZES[v.size], spot = freeCell(plan, w, h)
            if (!spot) return notify(`No free ${v.size} space — resize or remove a block first`)
            const id = 'r' + Date.now()
            dispatch({ type: 'addRoom', room: { id, name: v.name.trim(), type: TYPES.find(t => t[0] === v.type)[1], floor: 'LG', block: spot, stock: {} } })
            setModal(null); setSel(id); notify(`${v.name} added — it’s on the Location page too`)
          }} />
      )}
      {modal?.rename && (
        <FormModal title={`Edit ${modal.rename.name}`} submit="Save block" onClose={() => setModal(null)}
          fields={[
            { name: 'name', label: 'Room name', value: modal.rename.name, required: true },
            { name: 'type', label: 'Type', options: TYPES.map(t => t[0]), value: (TYPES.find(t => t[1] === modal.rename.type) || TYPES[0])[0] },
          ]}
          onSubmit={v => {
            dispatch({ type: 'updateRoom', room: { id: modal.rename.id, name: v.name.trim(), type: TYPES.find(t => t[0] === v.type)[1] } })
            setModal(null); notify('Block updated')
          }} />
      )}
    </Page>
  )
}

/** Selected area: its RFID stock and the tasks in it (right column, top) */
function AreaCard({ room, info, onTask, onLocation }) {
  const box = { left: 1112, top: 196, width: 340, height: 360 }
  if (!room) return (
    <div className="glass abs rise" style={{ ...box, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div><LayoutGrid size={22} style={{ opacity: .6 }} /><div style={{ fontSize: 13, marginTop: 10, opacity: .8 }}>Tap a block to see its RFID stock and tasks</div></div>
    </div>
  )
  const rows = [
    ['towels', 'Towels', Layers], ['robes', 'Robes', Shirt], ['products', 'Products', Package],
    ['guests', 'Guests', User], ['equipment', 'Equipment', Wrench],
  ].filter(([k]) => room.stock?.[k] != null)
  const staffHere = STAFF_PINS.filter(p => p.room === room.id).length
  const order = ['overdue', 'soon', 'progress', 'pending', 'done']
  const list = [...(info?.sum.list || [])].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  return (
    <div key={room.id} className="glass abs rise" style={{ ...box, padding: '20px 18px 14px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 22, letterSpacing: '-.01em', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</span>
        <span className={`tag ${room.type}`}>{tagLabel(room.type)}</span>
      </div>

      <div style={{ fontSize: 9.5, letterSpacing: '.14em', opacity: .5, marginTop: 12 }}>RFID TAGS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', marginTop: 8 }}>
        {[...rows, ['staff', 'Staff', Contact]].map(([k, label, I]) => {
          const v = k === 'staff' ? staffHere : room.stock[k], lv = level(v)
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
              <I size={13} style={{ opacity: .7 }} /><span style={{ flex: 1, opacity: .85 }}>{label}</span>
              <b style={{ fontWeight: 600, color: lv === 'low' ? '#ffb4a6' : lv === 'mid' ? '#ffd98a' : '#fff' }}>{countOf(v)}</b>
              {Array.isArray(v) && <span style={{ fontSize: 9.5, opacity: .5, marginLeft: -3 }}>/{v[1]}</span>}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
        <span style={{ fontSize: 9.5, letterSpacing: '.14em', opacity: .5, flex: 1 }}>TASKS IN THIS AREA</span>
        <span style={{ fontSize: 10, opacity: .7 }}>{info?.open || 0} open / {list.length}</span>
      </div>
      <div className="scroll" style={{ marginTop: 8, display: 'grid', gap: 5, flex: 1, alignContent: 'start', paddingRight: 2 }}>
        {list.map(t => <TaskChip key={t.id} t={t} onClick={onTask} />)}
        {!list.length && <div style={{ fontSize: 12, opacity: .7, padding: '10px 2px' }}>No tasks in {room.name} right now.</div>}
      </div>
      <button onClick={onLocation} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, opacity: .8, marginTop: 8, alignSelf: 'flex-end' }}><LayoutGrid size={11} /> Location view</button>
    </div>
  )
}

/** Notes pinned on the plan: latest photo, voice notes to play, and + to drop a new one */
function NotesStrip({ notes, onOpen, onAdd }) {
  const photo = notes.find(n => n.kind !== 'voice')
  const voice = notes.filter(n => n.kind === 'voice')
  return (
    <div className="glass abs rise" style={{ left: 1112, top: 754, width: 340, height: 82, padding: '10px 10px 10px 12px', display: 'flex', alignItems: 'center', gap: 10, animationDelay: '120ms' }}>
      {photo && (
        <button onClick={() => onOpen(photo)} title={photo.title} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 'none', width: 120, textAlign: 'left' }}>
          {photo.photo ? <img src={photo.photo} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flex: 'none' }} />
            : <span style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center' }}><StickyNote size={16} /></span>}
          <span style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.title}</div>
            <div style={{ fontSize: 9, opacity: .6 }}>{photo.where}</div>
          </span>
        </button>
      )}
      <div style={{ display: 'grid', gap: 4, flex: 1, minWidth: 0 }}>
        {voice.slice(0, 2).map((v, i) => <VoiceChip key={v.id} v={{ ...v, wave: i === 0 }} onDark style={{ height: 30 }} />)}
      </div>
      <button onClick={onAdd} title="Drop a note on the plan" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', flex: 'none' }}><Plus size={16} /></button>
    </div>
  )
}

function PinCard({ pin, pos, ease, onClose, onTask, onLocation }) {
  const { room, sum } = pin
  const overdue = sum.list.filter(t => t.status === 'overdue')
  const open = sum.list.filter(t => t.status !== 'done')
  const shown = [...open].sort((a, b) => (a.status === 'overdue' ? -1 : 0) - (b.status === 'overdue' ? -1 : 0)).slice(0, 3)
  const { left, top } = pos // already placed beside its block by the map
  return (
    <div className="rise" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}
      style={{ position: 'absolute', left, top, transition: ease, width: 270, padding: '18px 16px 14px', borderRadius: 26, background: 'rgba(205, 212, 210, .78)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', color: 'var(--ink)', boxShadow: '0 20px 40px -18px rgba(0,0,0,.5)', cursor: 'default', zIndex: 5 }}>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, fontSize: 19 }}>{room.name}</div>
        <button onClick={onClose}><X size={15} /></button>
      </div>
      <span className={`tag ${room.type}`} style={{ marginTop: 4 }}>{tagLabel(room.type)}</span>
      <div style={{ fontSize: 10, letterSpacing: '.1em', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: overdue.length ? 'var(--red)' : 'var(--green)', fontWeight: 500 }}>
        <span className="dot" style={{ background: 'currentColor' }} />
        {room.mode === 'inuse' ? 'STATUS: IN USE' : room.mode === 'ready' ? 'STATUS: READY' : overdue.length ? `${overdue.length} OVERDUE / ${sum.total} TASKS` : `${open.length} OPEN / ${sum.total} TASKS`}
      </div>
      {room.booking && <div style={{ fontSize: 10, letterSpacing: '.08em', marginTop: 6, color: 'var(--ink-2)', textTransform: 'uppercase' }}>{room.booking}</div>}
      <div style={{ display: 'grid', gap: 4, marginTop: 10 }}>
        {shown.map(t => <TaskChip key={t.id} t={t} onClick={onTask} />)}
        {!shown.length && <div style={{ fontSize: 12, color: 'var(--ink-2)', padding: '6px 2px' }}>No open tasks in this room.</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
        <AvatarStack ids={room.people || []} size={30} max={2} />
        <button onClick={onLocation} style={{ marginLeft: 'auto', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-2)' }}><LayoutGrid size={12} /> Location view</button>
      </div>
    </div>
  )
}

function useFakePlayback(lenStr = '0:05') {
  const [playing, setPlaying] = useState(false)
  const [p, setP] = useState(0)
  const [m, s] = lenStr.split(':').map(Number)
  const total = Math.max(1, m * 60 + s)
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setP(x => { if (x >= 1) { setPlaying(false); return 0 } return x + 0.1 / total }), 100)
    return () => clearInterval(t)
  }, [playing, total])
  return { playing, toggle: () => setPlaying(v => !v), p, total }
}

function VoiceChip({ v, style, onDark }) {
  const { playing, toggle, p, total } = useFakePlayback(v.len)
  return (
    <button onClick={toggle} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} title={`${v.title} · ${staffById[v.by]?.name} · ${v.where}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px 0 4px', borderRadius: 999, background: onDark ? 'rgba(255,255,255,.22)' : 'rgba(240,244,244,.86)', color: onDark ? '#fff' : 'var(--ink-2)', ...style }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--teal)', display: 'grid', placeItems: 'center' }}>
        {playing ? <Pause size={10} fill="#fff" color="#fff" /> : <Play size={10} fill="#fff" color="#fff" />}
      </span>
      {v.wave && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 14 }}>
          {[3, 6, 4, 9, 12, 8, 11, 13, 7, 10, 5, 3].map((h, i) => (
            <span key={i} style={{ width: 1.5, height: h, background: i / 12 < p ? 'var(--teal)' : 'currentColor', borderRadius: 1, opacity: .8 }} />
          ))}
        </span>
      )}
      <span style={{ fontSize: 9.5 }}>{playing ? `0:${String(Math.floor(p * total)).padStart(2, '0')}` : v.len}</span>
    </button>
  )
}

function VoiceCard({ notes, style }) {
  const voice = notes.filter(n => n.kind === 'voice')
  return (
    <div className="glass abs rise" style={{ width: 165, height: 165, padding: '16px 13px', animationDelay: '120ms', ...style }}>
      <div style={{ fontSize: 13.5 }}>Voice notes</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12, justifyItems: 'start' }}>
        {voice.slice(0, 2).map((v, i) => <VoiceChip key={v.id} v={{ ...v, wave: i === 0 }} onDark />)}
      </div>
      <div style={{ fontSize: 10, marginTop: 14, display: 'flex', alignItems: 'center', gap: 4 }}>{notes.length} pinned notes <ArrowRight size={11} /></div>
    </div>
  )
}

function NoteCard({ notes, style, onOpen, onAdd }) {
  const n = notes.find(x => x.kind !== 'voice') || notes[0]
  return (
    <div className="glass abs rise card-link" onClick={() => onOpen(n)} style={{ width: 160, height: 165, padding: 6, animationDelay: '150ms', ...style }}>
      <div style={{ position: 'relative', height: 95, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {n.photo ? (
          <>
            <img src={n.photo} alt="" style={{ position: 'absolute', left: 12, top: 34, width: 110, height: 66, objectFit: 'cover', borderRadius: 6, transform: 'rotate(-8deg)', opacity: .7 }} />
            <img src={n.photo} alt="" style={{ position: 'relative', width: 128, height: 70, objectFit: 'cover', borderRadius: 8, transform: 'rotate(-3deg)' }} />
          </>
        ) : <StickyNote size={34} style={{ marginBottom: 20, opacity: .7 }} />}
        <button onClick={e => { e.stopPropagation(); onAdd() }} title="Drop a new note" style={{ position: 'absolute', right: 6, top: 2, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'grid', placeItems: 'center' }}><Plus size={14} /></button>
      </div>
      <div style={{ background: 'rgba(255,255,255,.88)', color: 'var(--ink)', borderRadius: 18, padding: '9px 12px', marginTop: 6, display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
          <div style={{ fontSize: 7.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.kind === 'photo' ? `${n.count || 1} Photos · ` : ''}{n.where} · {n.when}</div>
        </span>
        <ArrowRight size={13} />
      </div>
    </div>
  )
}

/** New note for a dropped pin: photo (upload), voice (recorder) or text */
function NoteModal({ where, onSave, onClose }) {
  const [kind, setKind] = useState('photo')
  const [title, setTitle] = useState('')
  const [photo, setPhoto] = useState(null)
  const [rec, setRec] = useState({ on: false, secs: 0 })
  useEffect(() => {
    if (!rec.on) return
    const t = setInterval(() => setRec(r => ({ ...r, secs: r.secs + 1 })), 1000)
    return () => clearInterval(t)
  }, [rec.on])
  const len = `0:${String(rec.secs).padStart(2, '0')}`
  const ok = title.trim() && (kind !== 'voice' || (rec.secs > 0 && !rec.on))
  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal rise" style={{ left: 556, top: 170, width: 440, padding: 26, borderRadius: 30, background: '#f4f7f7', color: 'var(--ink)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20 }}>New note</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> Pinned near {where}</div>
          </div>
          <button onClick={onClose} style={{ opacity: .5 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', gap: 6, margin: '16px 0 12px', background: '#e5ecec', padding: 4, borderRadius: 999 }}>
          {[['photo', 'Photo', Camera], ['voice', 'Voice', Mic], ['text', 'Text', StickyNote]].map(([k, l, I]) => (
            <button key={k} onClick={() => setKind(k)} style={{ flex: 1, height: 36, borderRadius: 999, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: kind === k ? '#fff' : 'transparent' }}><I size={14} />{l}</button>
          ))}
        </div>
        <label style={{ display: 'block', background: '#e9efef', borderRadius: 18, padding: '10px 14px' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '.06em', color: 'var(--ink-2)' }}>NOTE</div>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'voice' ? 'e.g. Steam room door sticking' : 'e.g. Leak under basin'}
            style={{ width: '100%', border: 0, outline: 'none', background: 'transparent', fontSize: 15, marginTop: 4, color: 'var(--ink)' }} />
        </label>
        {kind === 'photo' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, background: '#e9efef', borderRadius: 18, padding: 10, cursor: 'pointer' }}>
            {photo ? <img src={photo} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />
              : <span style={{ width: 64, height: 64, borderRadius: 12, background: '#dbe4e4', display: 'grid', placeItems: 'center' }}><Camera size={20} color="var(--ink-2)" /></span>}
            <span style={{ fontSize: 13 }}>{photo ? 'Change photo' : 'Add a photo'}<div style={{ fontSize: 11, color: 'var(--muted)' }}>Optional — choose a file</div></span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)) }} />
          </label>
        )}
        {kind === 'voice' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, background: '#0b3a40', color: '#fff', borderRadius: 18, padding: 10 }}>
            <button onClick={() => setRec(r => r.on ? { ...r, on: false } : { on: true, secs: 0 })}
              style={{ width: 46, height: 46, borderRadius: '50%', background: rec.on ? 'var(--red)' : 'var(--teal)', display: 'grid', placeItems: 'center' }}>
              {rec.on ? <Square size={14} fill="#fff" /> : <Mic size={18} />}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24, flex: 1 }}>
              {Array.from({ length: 28 }, (_, i) => <span key={i} style={{ width: 2, borderRadius: 1, background: '#fff', opacity: i < rec.secs * 3 ? .9 : .25, height: 4 + ((i * 7) % 16), animation: rec.on ? `pulse ${0.6 + (i % 5) * 0.1}s ease-in-out infinite` : 'none' }} />)}
            </span>
            <span style={{ fontSize: 13, width: 36 }}>{len}</span>
          </div>
        )}
        <button className="pill-btn" disabled={!ok}
          onClick={() => onSave({ kind, title: title.trim(), where, ...(kind === 'photo' ? { photo: photo || img.plantRoom, count: 1 } : {}), ...(kind === 'voice' ? { len, wave: true } : {}) })}
          style={{ width: '100%', justifyContent: 'center', height: 48, marginTop: 16, background: '#5ec1b2', color: '#fff', opacity: ok ? 1 : .5 }}>
          <MapPin size={15} /> Pin note to map
        </button>
        {kind === 'voice' && <div style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>Demo recorder — the preview can’t use your microphone, so no audio is captured.</div>}
      </div>
    </>
  )
}

function NoteView({ note, onClose, onFocus }) {
  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal rise" style={{ left: 536, top: 170, width: 480, padding: 22, borderRadius: 30, background: '#f4f7f7', color: 'var(--ink)' }}>
        {note.photo && <img src={note.photo} alt="" style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 20 }} />}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: note.photo ? 14 : 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19 }}>{note.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{staffById[note.by]?.name} · {note.where} · {note.when}{note.count > 1 ? ` · ${note.count} photos` : ''}</div>
          </div>
          <button onClick={onClose} style={{ opacity: .5 }}><X size={18} /></button>
        </div>
        <button className="pill-btn dark" style={{ marginTop: 14, width: '100%', justifyContent: 'center', height: 44 }} onClick={onFocus}><MapPin size={14} /> Show on plan</button>
      </div>
    </>
  )
}
