import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, ChevronDown, ChevronLeft, ChevronRight, Pencil, SlidersHorizontal, X, Check, ArrowRight, MapPin, MoreHorizontal } from 'lucide-react'
import { Page, useRole } from '../../components/Shell'
import { Avatar, AvatarStack, ringColor } from '../../components/ui'
import { FormModal } from '../../components/Overlays'
import { useStore, roomSummary, staffById, STAFF, fmtTime, TASK_STATUS } from '../../data/store'
import TaskEditor from '../../components/TaskEditor'

const TYPES = ['All rooms', 'Treatment', 'Wellness', 'Fitness', 'Reception']
const FLOORS = ['LG', 'L1', 'L2']

export default function Rooms() {
  const role = useRole()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { rooms, tasks, dispatch, notify } = useStore()
  const floor = params.get('floor') || 'LG'
  const [type, setType] = useState('All rooms')
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [modal, setModal] = useState(false)
  const [open, setOpen] = useState(null)
  const [editor, setEditor] = useState(null)     // { mode: 'assign' | 'edit', room, staffId?, task? }
  const [drag, setDrag] = useState(null)         // staff avatar being dragged: { id, x, y, over }
  const [page, setPage] = useState(0)
  const [allStaff, setAllStaff] = useState(false)

  const editTask = (t) => setEditor({ mode: 'edit', task: t, room: rooms.find(r => r.id === t.room) })

  /* drag a staff avatar onto a room card → assign a task there */
  const toStage = (cx, cy) => {
    const r = document.querySelector('.stage').getBoundingClientRect(), k = r.width / 1552
    return { x: (cx - r.left) / k, y: (cy - r.top) / k }
  }
  const roomAt = (cx, cy) => document.elementFromPoint(cx, cy)?.closest('[data-room-id]')?.dataset.roomId || null
  const startDrag = (id, e) => {
    e.preventDefault()
    setDrag({ id, ...toStage(e.clientX, e.clientY), over: null })
    const move = ev => setDrag(d => d && { ...d, ...toStage(ev.clientX, ev.clientY), over: roomAt(ev.clientX, ev.clientY) })
    const up = ev => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      const over = roomAt(ev.clientX, ev.clientY)
      setDrag(null)
      if (over) setEditor({ mode: 'assign', room: rooms.find(r => r.id === over), staffId: id })
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const list = useMemo(() => rooms.filter(r =>
    !r.hidden && r.floor === floor && (role === 'staff' || !r.staffOnly) &&
    (type === 'All rooms' || r.type === type.toLowerCase()))
    .sort((a, b) => a.block && b.block ? (a.block.r - b.block.r) || (a.block.c - b.block.c) : 0), [rooms, floor, type, role])
  const cards = role === 'manager' ? [{ create: true }, ...list] : list
  const pages = Math.max(1, Math.ceil(cards.length / 8))
  const pg = Math.min(page, pages - 1)

  return (
    <Page view="location" nav={false}>
      {/* type filter */}
      <div className="abs" style={{ left: 1160, top: 146, zIndex: 10 }}>
        <button className="pill-btn ghost" style={{ height: 46, padding: '0 16px 0 20px', fontSize: 12.5, gap: 12 }} onClick={() => setMenu(m => !m)}>
          {type} <ChevronDown size={15} />
        </button>
        {menu && (
          <div className="paper rise" style={{ position: 'absolute', right: 0, top: 54, width: 170, padding: 6, borderRadius: 18 }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => { setType(t); setMenu(false) }} style={{ display: 'flex', width: '100%', padding: '9px 12px', borderRadius: 12, fontSize: 13, background: t === type ? '#e5eded' : 'transparent' }}>
                <span style={{ flex: 1, textAlign: 'left' }}>{t}</span>{t === type && <Check size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div key={floor + type + pg} className={editing ? 'editing' : ''} style={{ position: 'absolute', left: 274, top: 212, width: 1000, display: 'grid', gridTemplateColumns: 'repeat(4, 232px)', gap: 24 }}>
        {cards.slice(pg * 8, pg * 8 + 8).map((r, i) => (
          <div key={r.id || 'create'} className="widget rise" data-room-id={r.create ? undefined : r.id}
            style={{ animationDelay: `${i * 45}ms`, borderRadius: 30, transition: 'transform .2s, box-shadow .2s',
              transform: drag?.over && drag.over === r.id ? 'scale(1.04)' : 'none', boxShadow: drag?.over && drag.over === r.id ? '0 0 0 3px var(--teal), 0 0 30px rgba(60,198,181,.5)' : 'none' }}>
            {r.create ? <CreateRoom onClick={() => setModal(true)} />
              : <RoomCard room={r} tasks={tasks} onOpen={() => setOpen(r)} onTask={editTask} />}
          </div>
        ))}
        {!cards.length && <div className="glass" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', opacity: .8 }}>No {type.toLowerCase()} on {floor}.</div>}
      </div>

      {pages > 1 && (
        <div className="abs" style={{ left: 1168, top: 714, display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="circle-btn" style={{ width: 40, height: 40 }} onClick={() => setPage(Math.max(0, pg - 1))} disabled={pg === 0}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 12, width: 28, textAlign: 'center' }}>{pg + 1}/{pages}</span>
          <button className="circle-btn" style={{ width: 40, height: 40 }} onClick={() => setPage(Math.min(pages - 1, pg + 1))} disabled={pg === pages - 1}><ChevronRight size={16} /></button>
        </div>
      )}

      {/* toolbar */}
      <div className="abs" style={{ left: 274, top: 710, display: 'flex', gap: 4, alignItems: 'center' }}>
        <button className="pill-btn" style={{ width: 102, justifyContent: 'center', background: 'rgba(255,255,255,.28)' }} onClick={() => role === 'manager' ? setModal(true) : notify('Ask your manager to add a room')}>Add</button>
        <button className="circle-btn" style={{ width: 40, height: 40, background: editing ? 'var(--teal-dark)' : '#fff', color: editing ? '#fff' : 'var(--ink)' }} onClick={() => setEditing(e => !e)} title="Arrange"><Pencil size={16} /></button>
        <button className="circle-btn white" style={{ width: 40, height: 40 }} onClick={() => setMenu(m => !m)} title="Filter"><SlidersHorizontal size={16} /></button>
        <button className="circle-btn" style={{ width: 40, height: 40, background: 'transparent' }} onClick={() => { setEditing(false); setType('All rooms') }} title="Reset"><X size={16} /></button>
      </div>

      {/* floors */}
      <div className="abs" style={{ left: 706, top: 718, display: 'flex', gap: 4 }}>
        {FLOORS.map(f => (
          <button key={f} onClick={() => { setParams({ floor: f }); setPage(0) }} style={{ width: 32, height: 32, borderRadius: '50%', fontSize: 10, background: f === floor ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.1)' }}>{f}</button>
        ))}
        <button onClick={() => notify('Floor editor is coming soon')} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'grid', placeItems: 'center' }}><Plus size={14} /></button>
      </div>

      {role === 'manager' && (
        <div className="abs" style={{ left: 0, right: 0, top: 772, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(allStaff ? STAFF.filter(s => !s.self).map(s => s.id) : ['marcus', 'elena', 'sofia', 'daniel', 'maya', 'chloe']).map(id => (
              <button key={id} onPointerDown={e => startDrag(id, e)} title={`Drag ${staffById[id].name} onto a room to assign a task`}
                style={{ cursor: 'grab', touchAction: 'none', opacity: drag?.id === id ? .35 : 1, transition: 'transform .2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <Avatar id={id} size={36} ring={ringColor(staffById[id].status)} style={{ border: '2px solid #fff', pointerEvents: 'none' }} />
              </button>
            ))}
            <button onClick={() => setAllStaff(a => !a)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', fontSize: 11 }}>{allStaff ? <X size={13} /> : '+16'}</button>
          </div>
          <div style={{ fontSize: 10, opacity: .55 }}>Drag a team member onto a room to assign a task</div>
        </div>
      )}

      {drag && (
        <div style={{ position: 'absolute', left: drag.x - 28, top: drag.y - 28, pointerEvents: 'none', zIndex: 60 }}>
          <Avatar id={drag.id} size={56} style={{ border: '3px solid #fff', boxShadow: '0 16px 30px -8px rgba(0,0,0,.45)' }} />
          <div className="chip" style={{ position: 'absolute', top: 62, left: '50%', transform: 'translateX(-50%)', background: drag.over ? 'var(--teal)' : 'rgba(0,0,0,.45)', height: 24, fontSize: 11 }}>
            {drag.over ? `Assign to ${rooms.find(r => r.id === drag.over)?.name}` : staffById[drag.id].name}
          </div>
        </div>
      )}
      {editor && <TaskEditor {...editor} onClose={() => setEditor(null)} />}

      {open && <RoomDetail room={open} onClose={() => setOpen(null)} onTask={t => { setOpen(null); editTask(t) }} />}
      {modal && (
        <FormModal title="Create a room" submit="Create room" onClose={() => setModal(false)}
          fields={[
            { name: 'name', label: 'Room name', placeholder: 'e.g. Treatment Room 8', required: true },
            { name: 'type', label: 'Type', options: ['Treatment', 'Wellness', 'Fitness', 'Reception'] },
            { name: 'floor', label: 'Floor', options: FLOORS, value: floor },
          ]}
          onSubmit={v => {
            dispatch({ type: 'addRoom', room: { id: 'r' + Date.now(), name: v.name, type: v.type.toLowerCase(), floor: v.floor, mode: 'ready', booking: 'No bookings yet', sanitized: 'just now', therapist: 'Unassigned' } })
            setModal(false); setParams({ floor: v.floor }); notify(`${v.name} added to ${v.floor}`)
          }} />
      )}
    </Page>
  )
}

function CreateRoom({ onClick }) {
  return (
    <button className="glass soft card-link" onClick={onClick} style={{ width: 232, height: 232, textAlign: 'center' }}>
      <Plus size={24} strokeWidth={1.5} />
      <div style={{ fontSize: 14, marginTop: 14 }}>Create a room</div>
    </button>
  )
}

export function StatusLine({ room, sum }) {
  if (room.mode === 'inuse') return <Line dot="#c9d2d3" text="STATUS: IN USE" />
  if (room.mode === 'ready') return <Line dot="var(--teal)" text="STATUS: READY" color="var(--teal)" />
  // headline = the most urgent status present in the room
  const k = ['overdue', 'soon', 'progress', 'pending'].find(x => sum.list.some(t => t.status === x))
  const plural = sum.total === 1 ? 'TASK' : 'TASKS'
  if (!k) return <Line dot={TASK_STATUS.done.color} text={<><b style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{sum.total ? 'ALL DONE' : 'NO TASKS'}</b>{sum.total ? ` / ${sum.total} ${plural}` : ''}</>} />
  const st = TASK_STATUS[k], n = sum.list.filter(t => t.status === k).length
  return <Line dot={st.color} text={<><b style={{ color: st.color, fontWeight: 600 }}>{n} {st.caps}</b> / {sum.total} {plural}</>} />
}
const Line = ({ dot, text, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: '.12em', color: color || 'var(--muted)', marginTop: 8, fontWeight: 500 }}>
    <span className="dot" style={{ background: dot }} />{text}
  </div>
)

export function TaskChip({ t, onClick, compact }) {
  const st = TASK_STATUS[t.status]
  const badge = (bg, child) => <span style={{ width: 20, height: 20, borderRadius: '50%', background: bg, color: '#fff', fontSize: 9, display: 'grid', placeItems: 'center', flex: 'none' }}>{child}</span>
  const v = {
    progress: { bg: st.chip, icon: <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--teal)', borderRightColor: 'transparent', animation: 'spin 1.6s linear infinite' }} /> },
    done: { bg: st.chip, faded: true, icon: <Check size={13} color="#b9c4c5" /> },
    overdue: { bg: st.chip, title: st.color, icon: badge(st.color, '!') },
    soon: { bg: st.chip, icon: badge(st.color, '!') },
    pending: { bg: st.chip, icon: badge('#a9b3b5', <MoreHorizontal size={12} />) },
  }[t.status]
  const who = staffById[t.people[0]]
  return (
    <button onClick={e => { e.stopPropagation(); onClick?.(t) }} className="card-link"
      style={{ display: 'flex', alignItems: 'center', width: '100%', height: 44, padding: '0 10px 0 16px', borderRadius: 22, background: v.bg, textAlign: 'left', opacity: v.faded ? .75 : 1 }}>
      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
        <div style={{ fontSize: 12.5, color: v.faded ? '#a9b3b4' : v.title || 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
        <div style={{ fontSize: 7.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {who && <Avatar id={who.id} size={11} />}{who ? who.name : <span style={{ color: '#b07d14' }}>Unassigned</span>}{t.people.length > 1 && ` +${t.people.length - 1}`} · {fmtTime(t.due)}
        </div>
      </span>
      {v.icon}
    </button>
  )
}

function RoomCard({ room, tasks, onOpen, onTask }) {
  const sum = roomSummary(room, tasks)
  if (room.mode === 'inuse' || room.mode === 'ready') {
    const faded = room.mode === 'inuse'
    return (
      <div className="glass card-link" onClick={onOpen} style={{ width: 232, height: 232, padding: 22, position: 'relative', background: faded ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.14)', color: faded ? 'rgba(255,255,255,.5)' : '#fff' }}>
        <div style={{ fontSize: 19, fontWeight: 400 }}>{room.name}</div>
        <span className={`tag ${room.type}`} style={{ marginTop: 6, background: faded ? '#e6f3f0' : '#d7f2ec' }}>{room.type} room</span>
        <StatusLine room={room} sum={sum} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 10, letterSpacing: '.12em', color: faded ? 'rgba(255,255,255,.6)' : '#fff', alignItems: 'flex-start' }}>
          {room.guest && <Avatar id={room.guest} size={18} style={{ opacity: faded ? .6 : 1 }} />}
          <span style={{ lineHeight: 1.5, textTransform: 'uppercase' }}>{room.booking}</span>
        </div>
        {room.sanitized && <div style={{ fontSize: 10, letterSpacing: '.1em', opacity: .6, marginTop: 6 }}>SANITIZED {room.sanitized}</div>}
        <div style={{ position: 'absolute', left: 22, bottom: 22, fontSize: 10, letterSpacing: '.14em', fontWeight: 600, textTransform: 'uppercase' }}>{room.therapist}</div>
      </div>
    )
  }
  if (room.mode === 'zone') {
    const zoneTasks = sum.list
    return (
      <div className="paper card-link" onClick={onOpen} style={{ width: 232, height: 232, padding: '22px 22px 18px', position: 'relative' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, fontSize: 19 }}>{room.name}</div>
          <Plus size={18} strokeWidth={1.4} color="var(--ink-2)" />
        </div>
        <span className={`tag ${room.type}`} style={{ marginTop: 4 }}>{room.type}</span>
        <Line dot="var(--red)" text={<><b style={{ color: 'var(--red)', fontWeight: 600 }}>{zoneTasks.filter(t => t.status === 'overdue').length} OVERDUE</b> / 11 TASK</>} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8, marginLeft: -14, marginRight: -14 }}>
          {room.zones.map(z => (
            <div key={z.name} style={{ height: 58, borderRadius: 18, background: z.alert ? '#f6e3dc' : '#e5ebeb', display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: 9, color: z.done ? '#a9b4b5' : 'var(--ink)' }}>
              <div>
                {z.people && <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 4, opacity: z.done ? .6 : 1 }}>
                  {z.done && <Check size={12} color="#9aa" style={{ marginRight: 4, marginTop: 2 }} />}
                  <AvatarStack ids={z.people} size={15} max={3} />
                </div>}
                {z.name}{z.count ? `(${z.count})` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  const shown = [...sum.list].sort((a, b) => order(a) - order(b)).slice(0, 2)
  return (
    <div className="paper card-link" onClick={onOpen} style={{ width: 232, height: 232, padding: '22px 22px 0', position: 'relative' }}>
      <div style={{ fontSize: 19 }}>{room.name}</div>
      <span className={`tag ${room.type}`} style={{ marginTop: 4 }}>{tagLabel(room.type)}</span>
      <StatusLine room={room} sum={sum} />
      <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
        {shown.map(t => <TaskChip key={t.id} t={t} onClick={onTask} />)}
      </div>
      <div style={{ position: 'absolute', left: 22, bottom: 12 }}>
        <AvatarStack ids={room.people || []} size={30} max={room.people?.length > 3 ? 3 : 2} extra={0} />
      </div>
    </div>
  )
}
const order = t => ({ overdue: 0, soon: 1, progress: 2, pending: 3, done: 4 }[t.status])
export const tagLabel = type => ({ treatment: 'treatment room', boh: 'back of house' }[type] || type)

function RoomDetail({ room, onClose, onTask }) {
  const { tasks, dispatch, notify } = useStore()
  const role = useRole()
  const nav = useNavigate()
  const sum = roomSummary(room, tasks)
  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal paper rise" style={{ left: 506, top: 150, width: 540, maxHeight: 600, padding: 28, borderRadius: 32, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26 }}>{room.name}</div>
            <span className={`tag ${room.type}`} style={{ marginTop: 6 }}>{room.type}</span>
            <StatusLine room={room} sum={sum} />
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {room.booking && <div style={{ marginTop: 16, padding: 14, background: '#e7eeee', borderRadius: 16, fontSize: 13 }}>{room.booking}<div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{room.therapist}{room.sanitized ? ` · sanitised ${room.sanitized}` : ''}</div></div>}
        <div className="scroll" style={{ marginTop: 16, display: 'grid', gap: 8, flex: 1 }}>
          {sum.list.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No tasks for this room right now.</div>}
          {sum.list.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}><TaskChip t={t} onClick={onTask} /></div>
              {t.status !== 'done' && (
                <button className="circle-btn" title="Mark done" style={{ width: 40, height: 40, background: 'var(--teal-dark)', color: '#fff' }}
                  onClick={() => { dispatch({ type: 'setTaskStatus', id: t.id, status: 'done' }); notify(`${t.title} marked done`) }}><Check size={16} /></button>
              )}
            </div>
          ))}
        </div>
        <button className="pill-btn dark" style={{ marginTop: 18, justifyContent: 'center', height: 46 }} onClick={() => nav(`/${role}/map?room=${room.id}`)} disabled={!room.block}>
          <MapPin size={15} /> {room.block ? 'Show on the plan' : `No plan for ${room.floor} yet`} <ArrowRight size={15} />
        </button>
      </div>
    </>
  )
}
