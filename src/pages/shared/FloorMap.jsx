import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, ArrowUpRight, ArrowRight, Plus, Minus, Play, Pause, ClipboardList, PenLine, MessageCircle, X, Check, Mic, Camera, StickyNote, MapPin, Square, LayoutGrid } from 'lucide-react'
import { Page, useRole } from '../../components/Shell'
import { Avatar, AvatarStack, Bar, ringColor } from '../../components/ui'
import TaskEditor from '../../components/TaskEditor'
import { TaskChip, tagLabel } from './Rooms'
import { useStore, STAFF_PINS, STAFF, staffById, roomSummary, taskStats } from '../../data/store'
import { img } from '../../data/assets'

const STATUS_COLOR = { overdue: '#d8321f', soon: '#e3b02b', ontrack: '#0f8a76' }
const PLAN_W = 2260, PLAN_H = 2138 // floorplan.webp pixels
const BASE = 0.5                   // plan pixels → canvas pixels at 100%
const START = { x: 70, y: 86 }     // where the plan's top-left sits at 100%
const FOCUS = { x: 560, y: 500 }   // zoom anchor for the +/- buttons (centre of the open map area)

/** Status of a room on the map — derived from the same tasks the Location page shows */
export function roomStatus(room, tasks) {
  const sum = roomSummary(room, tasks)
  const status = sum.overdue ? 'overdue' : sum.list.some(t => t.status === 'soon') ? 'soon' : 'ontrack'
  return { status, sum }
}

export default function FloorMap() {
  const role = useRole()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { tasks, rooms, notes, dispatch, notify, setAssistantOpen } = useStore()
  const [filters, setFilters] = useState({ overdue: true, soon: true, ontrack: true })
  const [showStaff, setShowStaff] = useState(true)
  const [floor, setFloor] = useState('LG')
  const [menu, setMenu] = useState(null)
  const [view, setView] = useState({ z: 1, x: START.x, y: START.y })
  const [dragging, setDragging] = useState(false)
  const [sel, setSel] = useState(role === 'manager' ? 'hydro' : null)
  const [placing, setPlacing] = useState(false)   // "drop a pin" mode for a new note
  const [draft, setDraft] = useState(null)        // { x, y } of a dropped pin waiting for its note
  const [openNote, setOpenNote] = useState(null)
  const [editor, setEditor] = useState(null)
  const drag = useRef(null)
  const justDragged = useRef(false)
  const layer = useRef(null)

  // one pin per LG room — the same rooms and tasks as the Location page
  const pins = useMemo(() => rooms.filter(r => r.floor === 'LG' && r.pin).map(room => ({ room, x: room.pin.x, y: room.pin.y, ...roomStatus(room, tasks) })), [rooms, tasks])
  const selPin = pins.find(p => p.room.id === sel)
  const stats = taskStats(role === 'manager' ? tasks : tasks.filter(t => t.people.includes('amy')))
  const base = role === 'manager' ? { done: 37, all: 33 } : { done: 3, all: 8 }
  const done = stats.done + base.done, all = stats.all + base.all
  const attention = pins.filter(p => p.status === 'overdue')

  /* ── pan & zoom ── the plan fills the whole canvas; everything else floats over it */
  const k = BASE * view.z
  const at = (px, py) => ({ left: view.x + px * k, top: view.y + py * k })
  const clamp = v => {
    const w = PLAN_W * BASE * v.z, h = PLAN_H * BASE * v.z, m = 220
    return { ...v, x: Math.min(1552 - m, Math.max(m - w, v.x)), y: Math.min(872 - m, Math.max(m - h, v.y)) }
  }
  const zoomTo = (z, ax = FOCUS.x, ay = FOCUS.y) => setView(v => {
    const nz = Math.min(2.5, Math.max(0.6, z)), r = nz / v.z
    return clamp({ z: nz, x: ax - (ax - v.x) * r, y: ay - (ay - v.y) * r })
  })
  const toStage = (cx, cy) => {
    const r = layer.current.getBoundingClientRect(), sc = r.width / 1552
    return { x: (cx - r.left) / sc, y: (cy - r.top) / sc, sc }
  }
  const onDown = e => {
    if (e.button !== 0) return
    if (e.target === layer.current) e.preventDefault() // no text/image selection while dragging
    justDragged.current = false
    drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, id: e.pointerId }
  }
  const onMove = e => {
    const d = drag.current
    if (!d) return
    const { sc } = toStage(0, 0)
    const dx = (e.clientX - d.sx) / sc, dy = (e.clientY - d.sy) / sc
    if (!justDragged.current) {
      if (Math.abs(dx) + Math.abs(dy) < 5) return
      justDragged.current = true
      setDragging(true)
      layer.current.setPointerCapture?.(d.id)
    }
    setView(v => clamp({ ...v, x: d.vx + dx, y: d.vy + dy }))
  }
  const onUp = e => {
    const wasDrag = justDragged.current
    drag.current = null
    setDragging(false)
    // a tap (not a drag) on the plan while in pin mode drops the note pin there
    if (placing && !wasDrag && e.target === layer.current) {
      const p = toStage(e.clientX, e.clientY)
      const x = Math.round((p.x - view.x) / k), y = Math.round((p.y - view.y) / k)
      if (x < 0 || y < 0 || x > PLAN_W || y > PLAN_H) return notify('Drop the pin inside the floor plan')
      setDraft({ x, y }); setPlacing(false)
    }
  }
  const onWheel = e => {
    const p = toStage(e.clientX, e.clientY)
    zoomTo(view.z * (1 - e.deltaY * 0.0015), p.x, p.y)
  }
  const focusPin = (p) => {
    setSel(p.room.id)
    setView(v => { const z = Math.max(v.z, 1.3); return clamp({ z, x: FOCUS.x - p.x * BASE * z, y: FOCUS.y - p.y * BASE * z }) })
  }
  // arriving from a room card ("Show on floor map") focuses that room
  useEffect(() => {
    const id = params.get('room')
    const p = id && pins.find(x => x.room.id === id)
    if (p) { setFilters({ overdue: true, soon: true, ontrack: true }); focusPin(p) }
  }, [params.get('room')]) // eslint-disable-line

  const nearestRoom = (x, y) => pins.reduce((best, p) => {
    const d = Math.hypot(p.x - x, p.y - y)
    return d < best.d ? { d, room: p.room } : best
  }, { d: Infinity, room: null }).room
  const ease = dragging ? 'none' : 'left .45s cubic-bezier(.2,.8,.2,1), top .45s cubic-bezier(.2,.8,.2,1), width .45s cubic-bezier(.2,.8,.2,1), height .45s cubic-bezier(.2,.8,.2,1)'
  const tap = fn => () => { if (!justDragged.current && !placing) fn() }
  const startPlacing = () => { setPlacing(true); setSel(null); setMenu(null) }
  const editTask = t => setEditor({ mode: 'edit', task: t, room: rooms.find(r => r.id === t.room) })

  const mapLayer = (
    <div ref={layer} className="abs" style={{ inset: 0, overflow: 'hidden', cursor: placing ? 'crosshair' : dragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; setDragging(false) }} onWheel={onWheel}>
      <img src={img.floorplan} alt="Lower ground floor plan" draggable={false}
        style={{ position: 'absolute', ...at(0, 0), width: PLAN_W * k, height: PLAN_H * k, transition: ease, userSelect: 'none', pointerEvents: 'none',
          filter: floor === 'LG' ? 'drop-shadow(0 30px 40px rgba(0,25,30,.35))' : 'grayscale(1) blur(3px) opacity(.45)' }} />

      {floor === 'LG' && showStaff && STAFF_PINS.map(p => {
        const s = staffById[p.staff], pos = at(p.x, p.y)
        return (
          <div key={p.staff} title={`${s.name} · ${s.note}`} style={{ position: 'absolute', left: pos.left - 19, top: pos.top - 44, transition: ease, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.3))', pointerEvents: placing ? 'none' : 'auto' }}>
            <div style={{ position: 'absolute', left: 13, top: 30, width: 12, height: 12, background: ringColor(s.status), transform: 'rotate(45deg)', borderRadius: 2 }} />
            <Avatar id={p.staff} size={38} style={{ border: `3px solid ${ringColor(s.status)}`, position: 'relative' }} />
          </div>
        )
      })}

      {floor === 'LG' && pins.map(p => {
        if (!filters[p.status]) return null
        const c = STATUS_COLOR[p.status], pos = at(p.x, p.y), on = sel === p.room.id
        return (
          <div key={p.room.id} style={{ position: 'absolute', left: pos.left - 23, top: pos.top - 23, transition: ease, pointerEvents: placing ? 'none' : 'auto' }}>
            <button onClick={tap(() => setSel(on ? null : p.room.id))} title={p.room.name}
              style={{ position: 'relative', width: 46, height: 46, borderRadius: '50%', background: `${c}55`, display: 'grid', placeItems: 'center' }}>
              {p.status === 'overdue' && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `${c}44`, animation: 'ping 2s ease-out infinite' }} />}
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: c, color: '#fff', fontSize: 11, display: 'grid', placeItems: 'center', boxShadow: on ? '0 0 0 3px #fff' : 'none' }}>
                !
              </span>
            </button>
            {(on || view.z >= 1.4) && (
              <span className="chip float" style={{ position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)', height: 20, fontSize: 9.5, background: 'rgba(12,45,50,.6)', pointerEvents: 'none' }}>{p.room.name}</span>
            )}
          </div>
        )
      })}

      {floor === 'LG' && notes.map(n => {
        const pos = at(n.x, n.y)
        const style = { position: 'absolute', left: pos.left, top: pos.top - 17, transition: ease, pointerEvents: placing ? 'none' : 'auto' }
        if (n.kind === 'voice') return <VoiceChip key={n.id} v={n} style={style} />
        return (
          <button key={n.id} onClick={tap(() => setOpenNote(n))} title={`${n.title} · ${staffById[n.by]?.name}`}
            style={{ ...style, top: pos.top - 21, display: 'flex', alignItems: 'center', gap: 8, padding: 4, paddingRight: 14, borderRadius: 999, background: 'rgba(250,240,225,.92)', color: 'var(--ink)', maxWidth: 190 }}>
            {n.photo ? <img src={n.photo} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
              : <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#f1d9a6', display: 'grid', placeItems: 'center' }}><StickyNote size={15} /></span>}
            <span style={{ lineHeight: 1.1, textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.kind === 'photo' ? (n.count || 1) : n.title}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{n.kind === 'photo' ? `photo${(n.count || 1) > 1 ? 's' : ''}` : 'note'}</div>
            </span>
          </button>
        )
      })}

      {draft && (() => { const pos = at(draft.x, draft.y); return (
        <div style={{ position: 'absolute', left: pos.left - 16, top: pos.top - 40, transition: ease, pointerEvents: 'none', animation: 'rise .4s both' }}>
          <MapPin size={36} fill="var(--teal)" color="#fff" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.35))' }} />
        </div>
      ) })()}

      {selPin && floor === 'LG' && filters[selPin.status] && !placing &&
        <PinCard pin={selPin} pos={at(selPin.x, selPin.y)} ease={ease} onClose={() => setSel(null)} onTask={editTask}
          onLocation={() => nav(`/${role}/rooms?floor=LG`)} />}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120, pointerEvents: 'none', background: 'linear-gradient(rgba(30,62,68,.55), rgba(30,62,68,0))' }} />
      {floor !== 'LG' && <div className="glass" style={{ position: 'absolute', left: 340, top: 360, padding: '22px 28px', textAlign: 'center' }}>No live plan uploaded for {floor} yet.<div style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>Rooms on {floor} are still tracked in the Location view.</div></div>}
    </div>
  )

  return (
    <Page view="map" bg="dark" nav={false} under={mapLayer}>
      {/* filter chips */}
      <div className="abs" style={{ left: 40, top: 122, display: 'flex', gap: 8, zIndex: 12 }}>
        <Drop label={floor} open={menu === 'floor'} onToggle={() => setMenu(menu === 'floor' ? null : 'floor')}
          items={['LG', 'L1', 'L2']} value={floor} onPick={v => { setFloor(v); setMenu(null) }} />
        <Drop label={showStaff ? 'All staff' : 'No staff'} open={menu === 'staff'} onToggle={() => setMenu(menu === 'staff' ? null : 'staff')}
          items={['All staff', 'No staff']} value={showStaff ? 'All staff' : 'No staff'} onPick={v => { setShowStaff(v === 'All staff'); setMenu(null) }} />
        <Drop label="All rooms" open={menu === 'rooms'} onToggle={() => setMenu(menu === 'rooms' ? null : 'rooms')}
          items={pins.map(p => p.room.name)} onPick={v => { focusPin(pins.find(p => p.room.name === v)); setMenu(null) }} />
        {[['overdue', 'Overdue', '#d8321f', 'rgba(150,40,30,.35)', '#ff4a35'], ['soon', 'Due soon', '#e3b02b', 'rgba(200,160,60,.4)', '#ffcd4a'], ['ontrack', 'On track', '#0f8a76', 'rgba(20,110,95,.35)', '#18c4a5']].map(([key, label, c, bg, text]) => (
          <button key={key} onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))} className="chip float"
            style={{ height: 34, padding: '0 14px', fontSize: 13, background: bg, color: text, opacity: filters[key] ? 1 : .4, gap: 8, transition: 'opacity .2s' }}>
            <span className="dot" style={{ background: c }} />{label}
          </button>
        ))}
      </div>

      {placing && (
        <div className="abs rise float" style={{ left: '50%', top: 98, transform: 'translateX(-50%)', zIndex: 25, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px 8px 18px', borderRadius: 999, background: 'rgba(12,45,50,.75)', boxShadow: '0 12px 30px -10px rgba(0,0,0,.4)' }}>
          <MapPin size={16} color="var(--teal)" />
          <span style={{ fontSize: 13 }}>Tap anywhere on the plan to drop your note</span>
          <button className="pill-btn white" style={{ height: 32, fontSize: 12 }} onClick={() => setPlacing(false)}>Cancel</button>
        </div>
      )}

      {/* zoom */}
      <div className="abs" style={{ left: 40, top: 795, display: 'flex', gap: 6, zIndex: 12 }}>
        <button className="circle-btn" style={{ width: 42, height: 42 }} onClick={() => zoomTo(+(view.z - 0.2).toFixed(1))}><Minus size={14} /></button>
        <button className="pill-btn ghost" style={{ height: 42, width: 76, justifyContent: 'center', fontSize: 14 }} onClick={() => setView({ z: 1, ...START })} title="Reset view">{Math.round(view.z * 100)}%</button>
        <button className="circle-btn" style={{ width: 42, height: 42 }} onClick={() => zoomTo(+(view.z + 0.2).toFixed(1))}><Plus size={14} /></button>
      </div>

      {/* right panel */}
      <div className="glass abs rise" style={{ left: 1121, top: 128, width: 347, height: 167, padding: '18px 16px', background: 'rgba(255,255,255,.2)' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, fontSize: 16, color: 'var(--teal)' }}>Needs attention</div>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(60,198,181,.25)', color: 'var(--teal)', fontSize: 10, display: 'grid', placeItems: 'center' }}>{attention.length}</span>
        </div>
        <div style={{ fontSize: 9.5, color: 'var(--teal)', marginTop: 2, opacity: .9 }}>{attention.length} rooms overdue · 1 blocked{attention.length > 2 ? ` · showing 2 of ${attention.length}` : ''}</div>
        <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
          {attention.slice(0, 2).map(p => (
            <button key={p.room.id} onClick={() => focusPin(p)} style={{ textAlign: 'left', fontSize: 11.5 }}>
              {p.room.name} · {p.sum.list.find(t => t.status === 'overdue')?.title.toLowerCase()} · due {p.sum.list.find(t => t.status === 'overdue')?.due}
            </button>
          ))}
          {!attention.length && <div style={{ fontSize: 11.5, opacity: .8 }}>All rooms on track 🎉</div>}
        </div>
        <button className="pill-btn teal" style={{ position: 'absolute', left: 16, bottom: 16, height: 32, fontSize: 11, padding: '0 14px' }} onClick={() => nav(`/${role}/rooms`)}>Open rooms <ArrowUpRight size={14} /></button>
      </div>

      <div className="glass abs rise" style={{ left: 1125, top: 310, width: 165, height: 165, padding: '16px 14px', animationDelay: '60ms' }}>
        <div style={{ fontSize: 13 }}>Completion rate</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <span style={{ fontSize: 30, fontWeight: 300 }}>{Math.round((done / all) * 100)}%</span>
          <span style={{ fontSize: 8, lineHeight: 1.3 }}>{done} / {all}<br />tasks done</span>
        </div>
        <Bar value={done / all} h={3} color="#fff" style={{ marginTop: 6 }} />
        <div style={{ fontSize: 9, marginTop: 14, lineHeight: 1.45, opacity: .85 }}>{all - done} remaining<br />{stats.overdue} overdue{role === 'manager' && ' · 1 blocked'}</div>
        <button onClick={() => nav(`/${role}/tasks`)} style={{ fontSize: 10, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>View progress <ArrowRight size={11} /></button>
      </div>

      {role === 'manager' ? (
        <>
          <div className="glass abs rise" style={{ left: 1298, top: 310, width: 165, height: 165, padding: '16px 14px', animationDelay: '90ms' }}>
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
          <VoiceCard notes={notes} style={{ left: 1298, top: 490 }} />
          <NoteCard notes={notes} style={{ left: 1125, top: 490 }} onOpen={setOpenNote} onAdd={startPlacing} />
          <AddNote style={{ left: 1125, top: 668 }} onClick={startPlacing} active={placing} />
          <div className="glass soft abs rise" style={{ left: 1298, top: 668, width: 165, height: 165, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, placeItems: 'center', animationDelay: '200ms' }}>
            <button className="card-link" title="Assign tasks in Location" onClick={() => nav('/manager/rooms')} style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>{['elena', 'daniel', 'marcus', 'sofia'].map(id => <Avatar key={id} id={id} size={20} />)}</div>
            </button>
            <QA title="Task list" onClick={() => nav('/manager/tasks')}><ClipboardList size={20} strokeWidth={1.5} /></QA>
            <QA title="Drop a note" onClick={startPlacing}><PenLine size={19} strokeWidth={1.5} /></QA>
            <QA title="Assistant" onClick={() => setAssistantOpen(true)}><MessageCircle size={19} strokeWidth={1.5} /></QA>
          </div>
        </>
      ) : (
        <>
          <VoiceCard notes={notes} style={{ left: 1306, top: 310 }} />
          <NoteCard notes={notes} style={{ left: 1130, top: 490 }} onOpen={setOpenNote} onAdd={startPlacing} />
          <AddNote style={{ left: 1310, top: 490 }} onClick={startPlacing} active={placing} />
        </>
      )}

      {draft && <NoteModal where={nearestRoom(draft.x, draft.y)?.name || 'LG'} onClose={() => setDraft(null)}
        onSave={n => {
          dispatch({ type: 'addNote', note: { id: 'n' + Date.now(), x: draft.x, y: draft.y, by: role === 'manager' ? 'elena' : 'amy', when: 'just now', ...n } })
          setDraft(null); notify(`${n.kind === 'voice' ? 'Voice' : n.kind === 'photo' ? 'Photo' : 'Text'} note pinned at ${n.where}`)
        }} />}
      {openNote && <NoteView note={openNote} onClose={() => setOpenNote(null)} onFocus={() => { setOpenNote(null); setView(v => { const z = Math.max(v.z, 1.3); return clamp({ z, x: FOCUS.x - openNote.x * BASE * z, y: FOCUS.y - openNote.y * BASE * z }) }) }} />}
      {editor && <TaskEditor {...editor} onClose={() => setEditor(null)} />}
    </Page>
  )
}

const QA = ({ children, onClick, title }) => (
  <button className="card-link" title={title} onClick={onClick} style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center' }}>{children}</button>
)

function Drop({ label, open, onToggle, items, value, onPick }) {
  return (
    <div style={{ position: 'relative' }}>
      <button className="chip float" onClick={onToggle} style={{ height: 34, padding: '0 14px', fontSize: 13, background: 'rgba(255,255,255,.22)', gap: 6 }}>{label} <ChevronDown size={11} /></button>
      {open && (
        <div className="paper rise scroll" style={{ position: 'absolute', top: 40, left: 0, minWidth: 180, maxHeight: 380, padding: 6, borderRadius: 16, zIndex: 20 }}>
          {items.map(i => (
            <button key={i} onClick={() => onPick(i)} style={{ display: 'flex', width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 12.5, background: i === value ? '#e5eded' : 'transparent', textAlign: 'left' }}>
              <span style={{ flex: 1 }}>{i}</span>{i === value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PinCard({ pin, pos, ease, onClose, onTask, onLocation }) {
  const { room, sum } = pin
  const overdue = sum.list.filter(t => t.status === 'overdue')
  const open = sum.list.filter(t => t.status !== 'done')
  const shown = [...open].sort((a, b) => (a.status === 'overdue' ? -1 : 0) - (b.status === 'overdue' ? -1 : 0)).slice(0, 3)
  // keep the card inside the open map area (left of the side panel, below the filter chips)
  const h = 150 + shown.length * 48
  const left = Math.max(20, Math.min(pos.left - 30, 1100 - 270))
  const top = Math.max(170, Math.min(pos.top > 470 ? pos.top - h - 30 : pos.top + 34, 860 - h))
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

function AddNote({ style, onClick, active }) {
  return (
    <button className="glass soft abs rise card-link" onClick={onClick} style={{ width: 165, height: 165, textAlign: 'center', animationDelay: '180ms', boxShadow: active ? '0 0 0 2px var(--teal)' : undefined, ...style }}>
      {active ? <MapPin size={20} color="var(--teal)" /> : <Plus size={18} strokeWidth={1.5} />}
      <div style={{ fontSize: 11.5, marginTop: 10 }}>{active ? 'Tap the plan…' : 'Add note'}</div>
      <div style={{ fontSize: 7.5, opacity: .45, marginTop: 10, lineHeight: 1.4 }}>drop a pin, then add a<br />photo, voice or text note</div>
    </button>
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
