import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronDown, ChevronRight, Check, Plus, ClipboardList, PenLine, MessageCircle, Pencil, X, Search, ArrowRight, MapPin, Send } from 'lucide-react'
import { Page } from '../../components/Shell'
import { Avatar, AvatarStack, Bar, ringColor } from '../../components/ui'
import { FormModal } from '../../components/Overlays'
import { useStore, STAFF, staffById, scheduleStats, SCHEDULE_HOURS } from '../../data/store'

export default function ManagerHome() {
  const nav = useNavigate()
  const { dispatch, notify, blocks, setAssistantOpen } = useStore()
  const [editing, setEditing] = useState(false)
  const [modal, setModal] = useState(null)
  const [focus, setFocus] = useState('marcus')
  const [query, setQuery] = useState('')
  const [popover, setPopover] = useState(null)

  return (
    <Page back={false}>
      <div className={`layer ${editing ? 'editing' : ''}`}>
        <Bookings onOpen={() => nav('/manager/schedule')} />
        <StaffInsights onOpen={() => nav('/manager/schedule')} />
        <NextTask onOpen={() => nav('/manager/tasks')} />
        <AiAssistantCard onOpen={() => setAssistantOpen(true)} />
        <TrainingAnalysis onOpen={() => nav('/manager/training')} />
        <StaffGrid query={query} focus={focus} onPick={(s, rect) => { setFocus(s.id); setPopover(s) }} />
        <CreateBlock blocks={blocks} onCreate={() => setModal('block')} onRemove={id => dispatch({ type: 'removeBlock', id })} />
        <AiInsights />
        <QuickActions onTeam={() => nav('/manager/schedule')} onTasks={() => nav('/manager/tasks')} onNew={() => setModal('task')} onChat={() => setAssistantOpen(true)} />
      </div>

      {/* edit controls */}
      <div className="abs" style={{ left: 432, top: 712, display: 'flex', gap: 6 }}>
        <button className="pill-btn teal" style={{ width: 74, justifyContent: 'center' }} onClick={() => setModal('block')}>Add</button>
        <button className="circle-btn" style={{ width: 40, height: 40, background: editing ? 'var(--teal-dark)' : '#eef2f2', color: editing ? '#fff' : 'var(--ink)' }} onClick={() => setEditing(e => !e)} title="Edit layout"><Pencil size={16} /></button>
        <button className="circle-btn" style={{ width: 40, height: 40, background: 'rgba(255,255,255,.22)' }} onClick={() => setEditing(false)} title="Done"><X size={16} /></button>
      </div>

      {/* find staff */}
      <div className="abs" style={{ left: 880, top: 710, width: 196, height: 40, display: 'flex', alignItems: 'center', borderRadius: 999, background: 'rgba(255,255,255,.1)', paddingLeft: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find Staff" style={{ flex: 1, minWidth: 0, width: 0, background: 'transparent', border: 0, outline: 'none', fontSize: 12, color: '#fff' }} />
        <span className="circle-btn" style={{ width: 32, height: 32, marginRight: 4 }}><Search size={14} /></span>
      </div>

      <AvatarRail focus={focus} setFocus={(id) => { setFocus(id); setPopover(staffById[id]) }} />

      {popover && <StaffPopover s={popover} onClose={() => setPopover(null)} />}

      {modal === 'block' && (
        <FormModal title="Create a block" submit="Add block" onClose={() => setModal(null)}
          fields={[
            { name: 'title', label: 'Title', placeholder: 'e.g. Rota planning', required: true },
            { name: 'time', label: 'Time', value: '14:00–14:30' },
            { name: 'type', label: 'Type', options: ['Focus time', 'Team event', 'Room hold'] },
          ]}
          onSubmit={v => { dispatch({ type: 'addBlock', block: { id: Date.now(), ...v } }); setModal(null); notify(`“${v.title}” added for ${v.time}`) }} />
      )}
      {modal === 'task' && (
        <FormModal title="New task" submit="Create task" onClose={() => setModal(null)}
          fields={[
            { name: 'title', label: 'Task', placeholder: 'e.g. Restock robes', required: true },
            { name: 'location', label: 'Location', value: 'Treatment Room 3' },
            { name: 'due', label: 'Due', value: '14:00' },
            { name: 'repeat', label: 'Repeat', options: ['Once', 'Everyday', 'Every Friday'] },
          ]}
          onSubmit={v => {
            dispatch({ type: 'addTask', task: { id: 't-' + Date.now(), title: v.title, location: v.location, due: v.due, repeat: v.repeat === 'Once' ? undefined : v.repeat, status: 'pending', room: null } })
            setModal(null); notify('Task created and sent for AI assignment')
          }} />
      )}
    </Page>
  )
}

/* ───────────── Today's bookings — the same bookings as the calendar ───────────── */
const NOW_HOUR = '10:00' // the calendar's "now" (the time marker sits in the 09:00–10:00 hour)
function Bookings({ onOpen }) {
  const { schedule } = useStore()
  const nav = useNavigate()
  const st = scheduleStats(schedule)
  const rows = SCHEDULE_HOURS.flatMap(h => schedule[h].map((c, r) => c && { ...c, h, r, room: `TR-0${r + 1}` }).filter(Boolean))
  const next = rows.find(x => x.h > NOW_HOUR)
  const chipOf = c => c.state === 'past' ? null
    : c.state === 'manual' ? 'unassigned'
    : c.h === NOW_HOUR ? 'treatment' : c.h === '11:00' ? 'ready' : 'assigned'
  const chipStyle = {
    treatment: { label: 'In Treatment', bg: 'rgba(60,198,181,.22)', color: 'rgba(255,255,255,.7)' },
    ready: { label: 'Room ready', bg: 'var(--teal)', color: '#fff' },
    assigned: { label: 'Assigned', bg: 'rgba(255,255,255,.35)', color: 'rgba(255,255,255,.85)' },
    unassigned: { label: 'Unassigned', bg: 'var(--teal-dark)', color: 'rgba(255,255,255,.85)' },
  }

  // scroll with the wheel/trackpad or by dragging the list; a slim thumb shows where you are
  const list = useRef(null)
  const drag = useRef(null)
  const [pos, setPos] = useState({ top: 0, ratio: 0.3 })
  const update = () => { const el = list.current; if (el) setPos({ top: el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight), ratio: el.clientHeight / el.scrollHeight }) }
  useEffect(update, [rows.length])
  const onDown = e => { drag.current = { y: e.clientY, st: list.current.scrollTop, moved: false } }
  const onMove = e => {
    const d = drag.current; if (!d) return
    const k = list.current.getBoundingClientRect().height / list.current.clientHeight
    const dy = (e.clientY - d.y) / k
    if (Math.abs(dy) > 4) d.moved = true
    if (d.moved) list.current.scrollTop = d.st - dy
  }
  const onUp = () => setTimeout(() => (drag.current = null), 0)

  return (
    <div className="glass widget rise abs" style={{ left: 241, top: 160, width: 333, height: 356, padding: '20px 21px 0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>Today’s Bookings</div>
          <div style={{ fontSize: 8, opacity: .6, marginTop: 2 }}>{st.bookings} sessions · {st.manual} need a therapist</div>
        </div>
        <button className="circle-btn" style={{ width: 36, height: 36 }} onClick={onOpen} title="Open schedule"><CalendarDays size={16} /></button>
      </div>
      <div style={{ display: 'flex', gap: 7, margin: '12px 0 12px' }}>
        <Stat label="NEXT" value={next ? <><b style={{ fontWeight: 500, fontSize: 13 }}>{next.h}</b> <span style={{ fontSize: 10 }}>{next.room}</span></> : '—'} bg="rgba(255,255,255,.4)" />
        <Stat label="Assigned" value={st.bookings - st.manual - st.past} bg="rgba(255,255,255,.4)" />
        <Stat label="Unassigned" value={st.manual} bg="var(--teal-dark)" color="var(--teal)" />
      </div>
      <div style={{ position: 'relative' }}>
        <div ref={list} className="scroll" onScroll={update} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
          style={{ height: 250, display: 'flex', flexDirection: 'column', gap: 7, paddingBottom: 30, paddingRight: 6, cursor: 'grab', userSelect: 'none', WebkitMaskImage: 'linear-gradient(#000 82%, transparent)', maskImage: 'linear-gradient(#000 82%, transparent)' }}>
          {rows.map(b => {
            const kind = chipOf(b), c = chipStyle[kind]
            const dark = kind === 'treatment'
            return (
              <button key={b.h + b.r} onClick={() => { if (!drag.current?.moved) nav(`/manager/schedule?h=${b.h}&r=${b.r}`) }} className="card-link"
                title={`Open ${b.guest} in the calendar`}
                style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 41, flex: 'none', padding: '0 9px', borderRadius: 9, textAlign: 'left',
                  background: dark ? 'rgba(10, 52, 58, .85)' : b.state === 'past' ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.4)', opacity: b.state === 'past' ? .55 : 1 }}>
                <span style={{ fontSize: 11.5, width: 30, fontWeight: 500 }}>{b.h}</span>
                <span style={{ flex: 1, lineHeight: 1.2, minWidth: 0 }}>
                  <div style={{ fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.guest}</div>
                  <div style={{ fontSize: 6.5, opacity: .7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.treatment} · {b.room}</div>
                </span>
                {c ? <span className="chip" style={{ background: c.bg, color: c.color, height: 16, fontSize: 6.5, padding: '0 7px', flex: 'none' }}>{c.label}</span>
                   : <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'grid', placeItems: 'center', flex: 'none' }}><Check size={11} /></span>}
              </button>
            )
          })}
        </div>
        {/* scroll position thumb */}
        <div style={{ position: 'absolute', right: -12, top: 4, width: 3, height: 220, borderRadius: 2, background: 'rgba(255,255,255,.12)' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: `${pos.ratio * 100}%`, top: `${pos.top * (1 - pos.ratio) * 100}%`, borderRadius: 2, background: 'rgba(255,255,255,.55)', transition: 'top .1s' }} />
        </div>
      </div>
    </div>
  )
}
const Stat = ({ label, value, bg, color }) => (
  <div style={{ flex: 1, height: 38, borderRadius: 8, background: bg, padding: '6px 8px', lineHeight: 1.1 }}>
    <div style={{ fontSize: 6, opacity: .8, color }}>{label}</div>
    <div style={{ fontSize: 12, color: color || '#fff', fontWeight: 500, marginTop: 2 }}>{value}</div>
  </div>
)

/* ───────────── Staff insights (utilisation sparkline) ───────────── */
function StaffInsights({ onOpen }) {
  const [range, setRange] = useState('Today')
  const bars = useMemo(() => {
    const seed = range === 'Today' ? 3 : 11
    return Array.from({ length: 34 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 0.7 + seed) * Math.cos(i * 0.23 + seed / 3)))
  }, [range])
  return (
    <div className="paper white widget rise abs card-link" onClick={onOpen} style={{ left: 612, top: 160, width: 167, height: 167, padding: '18px 17px', animationDelay: '40ms' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Staff Insights</div>
        <button onClick={e => { e.stopPropagation(); setRange(r => r === 'Today' ? 'Week' : 'Today') }} title={`Showing ${range}`} style={{ display: 'flex', alignItems: 'center', fontSize: 9, color: 'var(--muted)' }}>
          {range === 'Week' && 'Week'}<ChevronDown size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 32, marginTop: 14 }}>
        {bars.map((v, i) => <span key={i} style={{ flex: 1, height: `${v * 100}%`, background: i % 6 === 3 ? '#9fe0d6' : 'var(--teal)', borderRadius: 1, transition: 'height .5s' }} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0 0', padding: '0 2px' }}>
        {['elena', 'sofia', 'lucas', 'chloe'].map((id, i) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar id={id} size={11} /><span style={{ fontSize: 6, color: 'var(--muted)' }}>{[7, 8, '', 6][i]}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
        <AvatarStack ids={['elena', 'lisa', 'marcus', 'daniel', 'sofia']} size={30} max={5} />
        <span style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: '50%', border: '1px solid #e1e6e6', display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--ink-2)' }}>16</span>
      </div>
    </div>
  )
}

function NextTask({ onOpen }) {
  return (
    <div className="glass widget rise abs card-link" onClick={onOpen} style={{ left: 803, top: 160, width: 166, height: 166, padding: '18px 16px', animationDelay: '80ms' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1, fontSize: 11, opacity: .7 }}>02 June 2026</span>
        <Avatar id="elena" size={28} style={{ border: '2px solid #fff' }} />
      </div>
      <div style={{ fontSize: 9, opacity: .45, marginTop: 20 }}>Next task:</div>
      <div style={{ fontSize: 16, marginTop: 2 }}>Monday</div>
      <div style={{ fontSize: 22, fontWeight: 300, opacity: .55, letterSpacing: '-.01em' }}>10:30-10:50</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>Team meeting</div>
    </div>
  )
}

function AiAssistantCard({ onOpen }) {
  return (
    <button className="teal-orb widget rise abs card-link" onClick={onOpen} style={{ left: 985, top: 160, width: 166, height: 166, textAlign: 'center', animationDelay: '120ms' }}>
      <div style={{ fontSize: 10, opacity: .7, marginTop: -4 }}>Hi, How can I help today!</div>
      <div style={{ position: 'relative', width: 54, height: 54, margin: '14px auto 10px' }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(160,255,240,.6)', animation: 'ping 2.4s ease-out infinite' }} />
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(190,255,245,.6)', background: 'rgba(255,255,255,.06)' }} />
        <span style={{ position: 'absolute', inset: 17, borderRadius: '50%', border: '2px solid rgba(220,255,250,.8)', animation: 'pulse 2.4s ease-in-out infinite' }} />
        <span style={{ position: 'absolute', inset: 24, borderRadius: '50%', background: '#e9fffb' }} />
      </div>
      <div style={{ fontSize: 10.5 }}>AI Assistant</div>
      <div style={{ fontSize: 10.5, opacity: .6 }}>Connected</div>
    </button>
  )
}

function TrainingAnalysis({ onOpen }) {
  return (
    <div className="glass widget rise abs card-link" onClick={onOpen} style={{ left: 612, top: 350, width: 167, height: 166, padding: '19px 17px', animationDelay: '160ms' }}>
      <div style={{ fontSize: 14 }}>Training Analysis</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 18 }}>
        <span style={{ fontSize: 42, fontWeight: 300, lineHeight: 1 }}>78</span>
        <span style={{ fontSize: 13 }}>% courses</span>
      </div>
      <Bar value={0.78} h={3} color="var(--teal)" track="#fff" style={{ marginTop: 8, width: 130 }} />
      <div style={{ fontSize: 7.5, marginTop: 8 }}>Completed In This Quater</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <AvatarStack ids={['elena', 'lisa', 'sofia', 'maya']} size={14} max={4} />
        <span style={{ fontSize: 8 }}>15 Attended</span>
      </div>
    </div>
  )
}

/* ───────────── Staff grid ───────────── */
function StaffGrid({ query, focus, onPick }) {
  const list = STAFF.filter(s => !s.self && (s.name + s.role).toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="glass widget rise abs" style={{ left: 801, top: 351, width: 350, height: 351, padding: 3, borderRadius: 22, animationDelay: '200ms' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 107px)', gap: '10px 10px', padding: 2 }}>
        {list.map((s, i) => (
          <button key={s.id} onClick={() => onPick(s)} className="card-link rise"
            style={{ position: 'relative', width: 107, height: 107, borderRadius: 16, overflow: 'hidden', textAlign: 'center', animationDelay: `${200 + i * 30}ms`,
              boxShadow: focus === s.id ? '0 0 0 2px #fff' : 'none' }}>
            <img src={s.photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(40,40,40,.15) 55%, rgba(30,30,30,.55) 100%)' }} />
            {/* status stroke, drawn above the photo */}
            <span style={{ position: 'absolute', inset: 0, borderRadius: 16, boxShadow: `inset 0 0 0 2.5px ${ringColor(s.status)}`, pointerEvents: 'none' }} />
            <span className="dot" title={{ available: 'Available', busy: 'Busy', break: 'On break' }[s.status]} style={{ position: 'absolute', right: 8, top: 8, width: 9, height: 9, background: ringColor(s.status), boxShadow: '0 0 0 2px rgba(255,255,255,.85)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, lineHeight: 1.15 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontSize: 8.5, opacity: .75 }}>{s.role}</div>
              <div style={{ fontSize: 8.5, opacity: .9 }}>{s.note}</div>
            </div>
          </button>
        ))}
        {!list.length && <div style={{ gridColumn: '1 / -1', padding: 30, textAlign: 'center', opacity: .7, fontSize: 13 }}>No staff match.</div>}
      </div>
    </div>
  )
}

function AvatarRail({ focus, setFocus }) {
  const ids = ['lucas', 'elena', 'marcus', 'daniel', 'maya', 'sofia']
  return (
    <div className="abs" style={{ left: 1265, top: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transform: 'translateX(-50%)' }}>
      {ids.map(id => {
        const s = staffById[id]; const on = focus === id
        return (
          <button key={id} onClick={() => setFocus(id)} title={s.name} style={{ transition: 'transform .25s' }}>
            <Avatar id={id} size={on ? 62 : 42} ring={ringColor(s.status)} style={{ border: '2px solid #fff', transition: 'width .3s, height .3s' }} />
          </button>
        )
      })}
      <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'grid', placeItems: 'center', fontSize: 12, marginTop: 4 }}>+16</span>
    </div>
  )
}

function StaffPopover({ s, onClose }) {
  const nav = useNavigate()
  const { notify, tasks } = useStore()
  const count = tasks.filter(t => t.people.includes(s.id) && t.status !== 'done').length
  return (
    <>
      <div className="overlay fade" style={{ background: 'transparent', backdropFilter: 'none' }} onClick={onClose} />
      <div className="modal paper rise" style={{ left: 1000, top: 380, width: 220, padding: 16, borderRadius: 24 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Avatar id={s.id} size={44} ring={ringColor(s.status)} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.role}</div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-2)', margin: '12px 0' }}>{s.note} · {count} open tasks</div>
        <div style={{ display: 'grid', gap: 6 }}>
          <button className="pill-btn dark" style={{ height: 34, fontSize: 12 }} onClick={() => { onClose(); notify(`Next unassigned task sent to ${s.name}`) }}><Send size={13} /> Assign next task</button>
          <button className="pill-btn" style={{ height: 34, fontSize: 12, background: '#e5ecec' }} onClick={() => nav('/manager/map')}><MapPin size={13} /> Show on map</button>
        </div>
      </div>
    </>
  )
}

/* ───────────── Bottom row ───────────── */
function CreateBlock({ blocks, onCreate, onRemove }) {
  return (
    <div className="glass soft widget rise abs" style={{ left: 241, top: 537, width: 164, height: 164, padding: 14, textAlign: 'center', animationDelay: '240ms', overflow: 'hidden' }}>
      {blocks.length === 0 ? (
        <button onClick={onCreate} style={{ width: '100%', height: '100%' }}>
          <Plus size={20} strokeWidth={1.5} />
          <div style={{ fontSize: 11.5, marginTop: 10 }}>Create a block</div>
          <div style={{ fontSize: 7.5, opacity: .5, marginTop: 8, lineHeight: 1.4 }}>Protect focus time or<br />add a team event.</div>
        </button>
      ) : (
        <div style={{ textAlign: 'left', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, opacity: .6, marginBottom: 8 }}>Your blocks</div>
          {blocks.slice(-2).map(b => (
            <div key={b.id} className="rise" style={{ background: 'rgba(255,255,255,.14)', borderRadius: 12, padding: '7px 9px', marginBottom: 6, position: 'relative' }}>
              <div style={{ fontSize: 11 }}>{b.title}</div>
              <div style={{ fontSize: 9, opacity: .65 }}>{b.time} · {b.type}</div>
              <button onClick={() => onRemove(b.id)} style={{ position: 'absolute', right: 6, top: 6, opacity: .6 }}><X size={11} /></button>
            </div>
          ))}
          <button onClick={onCreate} style={{ marginTop: 'auto', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, opacity: .8 }}><Plus size={12} /> Add another</button>
        </div>
      )}
    </div>
  )
}

const INSIGHTS = [
  { tag: 'Schedule Pressure', text: <>3 Back-To-Back<br />Treatments Detected.</>, cta: 'Add 15-min buffer', done: 'Buffers added to TR-02 & TR-05' },
  { tag: 'Staffing Gap', text: <>Thermal zone is<br />short 12:00–14:00.</>, cta: 'Move Lucas T.', done: 'Lucas T. moved to Thermal zone' },
  { tag: 'Low Stock', text: <>Marine Cream below<br />par in TR-02.</>, cta: 'Reorder 6 units', done: 'Reorder placed with ELEMIS' },
]
function AiInsights() {
  const { notify } = useStore()
  const [i, setI] = useState(0)
  const [done, setDone] = useState({})
  const it = INSIGHTS[i]
  return (
    <div className="paper white widget rise abs" style={{ left: 428, top: 535, width: 170, height: 170, padding: '20px 13px 12px 17px', animationDelay: '280ms',
      boxShadow: '0 0 0 5px rgba(60,198,181,.55), 0 0 30px rgba(60,198,181,.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>AI Insights</span>
        <button onClick={() => setI((i + 1) % INSIGHTS.length)} title="Next insight"><ChevronRight size={18} color="var(--ink-2)" /></button>
      </div>
      <div key={i} className="fade">
        <div style={{ fontSize: 9.5, color: 'var(--teal-2)', marginTop: 14 }}>{it.tag}</div>
        <div style={{ fontSize: 9.5, lineHeight: 1.6, marginTop: 2, height: 36 }}>{it.text}</div>
      </div>
      <button onClick={() => { setDone(d => ({ ...d, [i]: true })); notify(it.done) }} className="pill-btn"
        style={{ marginTop: 10, width: '100%', height: 40, justifyContent: 'center', fontSize: 10, whiteSpace: 'nowrap', padding: '0 8px', gap: 5, background: done[i] ? 'var(--teal)' : 'var(--teal-dark)', color: '#fff', boxShadow: '0 0 0 3px rgba(60,198,181,.4)' }}>
        {done[i] ? <><Check size={13} /> Done</> : <>{it.cta} <ArrowRight size={12} /></>}
      </button>
    </div>
  )
}

function QuickActions({ onTeam, onTasks, onNew, onChat }) {
  const Btn = ({ children, onClick, title }) => (
    <button onClick={onClick} title={title} className="card-link" style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center' }}>{children}</button>
  )
  return (
    <div className="glass soft widget rise abs" style={{ left: 607, top: 537, width: 166, height: 166, padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, placeItems: 'center', animationDelay: '320ms' }}>
      <Btn onClick={onTeam} title="Team">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {['elena', 'daniel', 'marcus', 'sofia'].map(id => <Avatar key={id} id={id} size={22} />)}
        </div>
      </Btn>
      <Btn onClick={onTasks} title="Tasks"><ClipboardList size={22} strokeWidth={1.5} /></Btn>
      <Btn onClick={onNew} title="New task"><PenLine size={20} strokeWidth={1.5} /></Btn>
      <Btn onClick={onChat} title="Message"><MessageCircle size={20} strokeWidth={1.5} /></Btn>
    </div>
  )
}
