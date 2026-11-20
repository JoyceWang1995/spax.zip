import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, MapPin, ChevronDown, Square, Pause, Play, Plus, Heart, Trophy, X } from 'lucide-react'
import { Page, AiButton } from '../../components/Shell'
import { Avatar, Ring, Bar } from '../../components/ui'
import { FormModal } from '../../components/Overlays'
import { useStore, taskStats, staffById, TASK_STATUS } from '../../data/store'
import { img } from '../../data/assets'

const ME = 'amy'

export default function StaffHome() {
  const nav = useNavigate()
  const { tasks, dispatch, notify, blocks } = useStore()
  const [modal, setModal] = useState(false)
  const [board, setBoard] = useState(false)
  const mine = tasks.filter(t => t.people.includes(ME))
  const upcoming = mine.filter(t => t.status !== 'done' && t.id !== 't-meeting').sort((a, b) => a.due.padStart(5, '0').localeCompare(b.due.padStart(5, '0')))

  return (
    <Page back={false} nav="open">
      {/* Next task */}
      <div className="glass rise abs card-link" onClick={() => nav('/staff/tasks?task=t-meeting')} style={{ left: 305, top: 212, width: 232, height: 232, padding: '28px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 16, opacity: .55 }}>02 June 2026</span>
          <Avatar src={img.meStaff} size={40} style={{ border: '2px solid #fff' }} />
        </div>
        <div style={{ fontSize: 10, opacity: .35, marginTop: 30 }}>Next task:</div>
        <div style={{ fontSize: 31, marginTop: 4, fontWeight: 400 }}>Monday</div>
        <div style={{ fontSize: 31, fontWeight: 300, opacity: .45, marginTop: -2 }}>09:30-10:00</div>
        <div style={{ fontSize: 14, marginTop: 8 }}>Daily meeting</div>
      </div>

      {/* Today's task */}
      <div className="glass rise abs" style={{ left: 549, top: 212, width: 232, height: 232, padding: '14px 14px 10px', animationDelay: '50ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11 }}>Today’s Task</span>
          <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(255,255,255,.35)', display: 'grid', placeItems: 'center', fontSize: 9 }}>{mine.length}</span>
          <button onClick={() => nav('/staff/tasks')} style={{ marginLeft: 'auto' }} title="All tasks"><ArrowUpRight size={20} /></button>
        </div>
        <div style={{ marginTop: 6 }}>
          {upcoming.slice(0, 3).map((t, i) => (
            <button key={t.id} onClick={() => nav(`/staff/tasks?task=${t.id}`)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, height: 49, textAlign: 'left', borderTop: i ? '1px solid rgba(255,255,255,.12)' : 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, width: 64 }}>
                <span className="dot" style={{ width: 4, height: 4, background: TASK_STATUS[t.status].color }} />
                <span style={{ fontSize: 20 }}>{t.due}</span>
              </span>
              <span style={{ lineHeight: 1.2, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                <div style={{ fontSize: 9.5, opacity: .45, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={9} /> {t.location}</div>
              </span>
            </button>
          ))}
        </div>
        <TaskStrip tasks={mine} onClick={() => nav('/staff/tasks')} />
      </div>

      <ShiftTracker />

      {/* Create a block */}
      <div className="glass soft rise abs" style={{ left: 1035, top: 212, width: 232, height: 232, animationDelay: '150ms', padding: 18 }}>
        {blocks.length === 0 ? (
          <button onClick={() => setModal(true)} style={{ width: '100%', height: '100%', textAlign: 'center' }}>
            <Plus size={20} strokeWidth={1.5} />
            <div style={{ fontSize: 11, marginTop: 8 }}>Create a block</div>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ fontSize: 11, opacity: .6, marginBottom: 10 }}>Your blocks</div>
            {blocks.slice(-3).map(b => (
              <div key={b.id} className="rise" style={{ background: 'rgba(255,255,255,.14)', borderRadius: 14, padding: '9px 12px', marginBottom: 6, position: 'relative' }}>
                <div style={{ fontSize: 12.5 }}>{b.title}</div>
                <div style={{ fontSize: 10, opacity: .65 }}>{b.time} · {b.type}</div>
                <button onClick={() => dispatch({ type: 'removeBlock', id: b.id })} style={{ position: 'absolute', right: 8, top: 8, opacity: .6 }}><X size={12} /></button>
              </div>
            ))}
            <button onClick={() => setModal(true)} style={{ marginTop: 'auto', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, opacity: .8 }}><Plus size={13} /> Add another</button>
          </div>
        )}
      </div>

      {/* Training highlight */}
      <button className="rise abs card-link" onClick={() => nav('/staff/training?play=sound')}
        style={{ left: 305, top: 455, width: 232, height: 232, borderRadius: 30, overflow: 'hidden', textAlign: 'left', animationDelay: '200ms', boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)' }}>
        <img src={img.training.sound} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(40,25,18,.75) 100%)' }} />
        <span style={{ position: 'absolute', right: 14, top: 18, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'grid', placeItems: 'center' }}><Play size={13} /></span>
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 22 }}>
          <span className="chip" style={{ background: 'rgba(255,255,255,.22)', height: 20, fontSize: 7.5 }}>Mandatory</span>
          <div style={{ fontSize: 19, marginTop: 6, letterSpacing: '-.01em' }}>Sound Bath Essentials</div>
          <div style={{ fontSize: 7.5, opacity: .6, marginTop: 4, lineHeight: 1.35 }}>Understand The Principles Of Sound Therapy And How To Deliver Calming, Restorative Sound Journeys.</div>
        </div>
      </button>

      <WeeklyLeader />
      <Productivity onOpen={() => setBoard(true)} />
      <AiButton />

      {board && <Leaderboard onClose={() => setBoard(false)} />}
      {modal && (
        <FormModal title="Create a block" submit="Add block" onClose={() => setModal(false)}
          fields={[
            { name: 'title', label: 'Title', placeholder: 'e.g. Lunch break', required: true },
            { name: 'time', label: 'Time', value: '13:30–14:00' },
            { name: 'type', label: 'Type', options: ['Break', 'Focus time', 'Training'] },
          ]}
          onSubmit={v => { dispatch({ type: 'addBlock', block: { id: Date.now(), ...v } }); setModal(false); notify(`“${v.title}” added for ${v.time}`) }} />
      )}
    </Page>
  )
}

function TaskStrip({ tasks, onClick }) {
  const s = taskStats(tasks)
  const bubbles = [
    { n: s.all, c: null }, { n: s.overdue, c: TASK_STATUS.overdue.color }, { n: s.soon, c: TASK_STATUS.soon.color }, { n: s.progress, c: TASK_STATUS.progress.color }, { n: s.done, c: '#eee' },
  ]
  return (
    <button onClick={onClick} style={{ position: 'absolute', left: 34, bottom: 12, display: 'flex', alignItems: 'center', gap: 2, padding: 3, paddingRight: 8, borderRadius: 999, background: 'rgba(255,255,255,.18)' }}>
      <Ring size={38} stroke={1.5} value={s.pct / 100} color="#fff">
        <span style={{ fontSize: 12 }}>{s.pct}%</span>
      </Ring>
      <span style={{ display: 'flex', marginLeft: 4 }}>
        {bubbles.map((b, i) => (
          <span key={i} style={{ position: 'relative', width: 30, height: 30, marginLeft: i ? -10 : 0, borderRadius: '50%', background: 'rgba(255,255,255,.28)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', fontSize: 10, border: '1px solid rgba(255,255,255,.25)' }}>
            {b.n}
            {b.c && <span className="dot" style={{ position: 'absolute', top: 2, width: 5, height: 5, background: b.c }} />}
          </span>
        ))}
      </span>
    </button>
  )
}

function ShiftTracker() {
  const { notify } = useStore()
  const [secs, setSecs] = useState(7 * 3600 + 16 * 60)
  const [running, setRunning] = useState(true)
  const [range, setRange] = useState('Today')
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0'), mm = String(Math.floor(secs / 60) % 60).padStart(2, '0')
  const frac = (secs % 3600) / 3600
  const ang = frac * 2 * Math.PI - Math.PI / 2
  return (
    <div className="rise abs" style={{ left: 792, top: 212, width: 230, height: 230, borderRadius: 30, padding: '20px 20px', animationDelay: '100ms', overflow: 'hidden',
      background: 'radial-gradient(70% 70% at 55% 50%, #27d3be 0%, #0f8c84 45%, #0a4d50 75%, #072f33 100%)', border: '1.5px solid rgba(110,240,220,.6)', boxShadow: '0 0 30px rgba(60,198,181,.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 14.5, flex: 1 }}>Shift Time Tracker</span>
        <button onClick={() => setRange(r => r === 'Today' ? 'Week' : 'Today')} style={{ fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 2 }}>{range}<ChevronDown size={11} /></button>
      </div>
      <div style={{ fontSize: 8.5, opacity: .8, marginTop: 3 }}>Week Total: {(33.4 + (secs - 26160) / 3600).toFixed(1)}h</div>
      <svg width="134" height="134" style={{ position: 'absolute', left: 50, top: 53 }}>
        <circle cx="67" cy="67" r="63" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" />
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * 2 * Math.PI
          return <circle key={i} cx={67 + Math.cos(a) * 46} cy={67 + Math.sin(a) * 46} r=".8" fill="rgba(255,255,255,.4)" />
        })}
        <circle cx={67 + Math.cos(ang) * 63} cy={67 + Math.sin(ang) * 63} r="4" fill="#fff" />
      </svg>
      <div style={{ position: 'absolute', left: 81, top: 84, width: 72, height: 72, borderRadius: '50%', background: 'radial-gradient(circle, #3ef0d8, #20c2ae)', boxShadow: '0 0 30px #3ef0d8', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 11 }}>{hh}:{mm}</div>
          <div style={{ fontSize: 5.5, opacity: .8 }}>HOURS</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 20, bottom: 18, display: 'flex', gap: 6 }}>
        <button onClick={() => { setRunning(false); notify(`Shift ended · ${hh}h ${mm}m logged`) }} title="End shift" style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center' }}>
          <Square size={9} fill="var(--ink)" color="var(--ink)" />
        </button>
        <button onClick={() => setRunning(r => !r)} title={running ? 'Pause' : 'Resume'} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.35)', display: 'grid', placeItems: 'center' }}>
          {running ? <Pause size={10} fill="#fff" /> : <Play size={10} fill="#fff" />}
        </button>
      </div>
    </div>
  )
}

const LEADERS = [
  { id: 'elena', pts: 1320 }, { id: 'amy', pts: 1240 }, { id: 'sofia', pts: 1190 }, { id: 'lucas', pts: 1105 },
]
function WeeklyLeader() {
  const { notify } = useStore()
  const [i, setI] = useState(0)
  const [liked, setLiked] = useState({})
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % LEADERS.length), 5000); return () => clearInterval(t) }, [])
  const l = staffById[LEADERS[i].id]
  return (
    <div className="rise abs" style={{ left: 549, top: 455, width: 232, height: 232, textAlign: 'center', animationDelay: '250ms' }}>
      <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.07), rgba(255,255,255,0) 70%)' }} />
      <div key={i} className="fade" style={{ position: 'relative', paddingTop: 52 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Avatar src={i === 0 ? img.leader : l.photo} size={74} style={{ border: '2px solid rgba(255,255,255,.9)' }} />
            {i === 0 && <span style={{ position: 'absolute', right: -16, top: -10, fontSize: 26 }}>🎉</span>}
          </div>
          <button onClick={() => { setLiked(v => ({ ...v, [i]: !v[i] })); if (!liked[i]) notify(`Kudos sent to ${l.name}`) }}
            style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.06)', display: 'grid', placeItems: 'center' }}>
            <Heart size={22} color="#ff5b5b" fill={liked[i] ? '#ff5b5b' : 'none'} />
          </button>
        </div>
        <div style={{ fontSize: 14, opacity: .45, marginTop: 14 }}>{i === 0 ? 'Weekly Leader' : `#${i + 1} this week`}</div>
        <div style={{ fontSize: 20 }}>{l.name}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 182, display: 'flex', justifyContent: 'center', gap: 8 }}>
        {LEADERS.map((_, k) => <button key={k} onClick={() => setI(k)} className="dot" style={{ width: 6, height: 6, background: k === i ? '#fff' : 'rgba(255,255,255,.4)' }} />)}
      </div>
    </div>
  )
}

function Productivity({ onOpen }) {
  return (
    <div className="paper white rise abs" style={{ left: 792, top: 460, width: 232, height: 232, padding: '24px 22px', animationDelay: '300ms' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1, fontSize: 16 }}>Productivity</span>
        <button onClick={onOpen} title="Leaderboard"><ArrowUpRight size={20} /></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
        <span style={{ fontSize: 38, fontWeight: 300 }}>92</span>
        <span>
          <span className="chip" style={{ background: 'var(--teal)', color: '#fff', height: 18, fontSize: 9.5, fontWeight: 500 }}><Trophy size={10} /> Rank #2</span>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4, letterSpacing: '.05em' }}>PRODUCTIVITY SCORE</div>
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        {[['1,240', 'Points'], ['6 days', 'Streak'], ['9/12', 'Tasks done']].map(([v, l]) => (
          <div key={l}><div style={{ fontSize: 16, fontWeight: 500 }}>{v}</div><div style={{ fontSize: 9, color: 'var(--muted)' }}>{l}</div></div>
        ))}
      </div>
      <div style={{ display: 'flex', fontSize: 9, marginTop: 22, color: 'var(--muted)' }}>
        <span style={{ flex: 1 }}>Weekly target</span><span style={{ color: 'var(--teal-2)', fontWeight: 600 }}>75%</span>
      </div>
      <Bar value={0.75} color="var(--teal)" track="#e5eded" h={4} style={{ marginTop: 6 }} />
    </div>
  )
}

function Leaderboard({ onClose }) {
  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal paper rise" style={{ left: 576, top: 200, width: 400, padding: 24, borderRadius: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ flex: 1, fontSize: 20 }}>This week</span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        {LEADERS.map((l, i) => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 6px', borderBottom: '1px solid #e6eded' }}>
            <span style={{ width: 18, color: 'var(--muted)', fontSize: 13 }}>{i + 1}</span>
            <Avatar id={l.id} size={36} />
            <span style={{ flex: 1, fontSize: 14 }}>{staffById[l.id].name}{l.id === ME && <span style={{ color: 'var(--teal-2)', fontSize: 11 }}>  · you</span>}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{l.pts.toLocaleString()} pts</span>
          </div>
        ))}
      </div>
    </>
  )
}
