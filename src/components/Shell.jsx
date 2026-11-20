import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Search, X, Moon, Sun, LayoutGrid, GraduationCap, CalendarDays, ClipboardList,
  MapPin, DoorOpen, Pause, Play, SkipForward, Repeat, LogOut, Sparkles, Check, UserCheck,
} from 'lucide-react'
import { useStore, staffById, scheduleStats, fmtTime } from '../data/store'
import { img } from '../data/assets'
import { Avatar, AiDots } from './ui'
import { SearchOverlay, AssistantPanel } from './Overlays'
import AssignTasks from './AssignTasks'

export const W = 1552
export const H = 872

export function useRole() {
  const { pathname } = useLocation()
  return pathname.startsWith('/staff') ? 'staff' : 'manager'
}

/** Scales the fixed design canvas to fit the window (kiosk / wall-screen style). */
export function Stage({ children }) {
  const [s, setS] = useState(1)
  useLayoutEffect(() => {
    const fit = () => setS(Math.min(window.innerWidth / W, window.innerHeight / H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `scale(${s}) translate(-50%, -50%)` }}>{children}</div>
    </div>
  )
}

/** Page frame: background, top bar, radial nav and global overlays */
export function Page({ children, under, bg = 'default', back = true, view, notice = true, nav = 'collapsed', bar = 'full', className = '' }) {
  const { night, toast, assistantOpen, searchOpen, assignOpen, setAssignOpen } = useStore()
  const role = useRole()
  return (
    <div className={night ? 'night' : ''}>
      <div className={`bg ${bg === 'light' ? 'light' : bg === 'dark' ? 'dark' : ''}`}>
        <div className="silk" /><div className="vignette" />
      </div>
      <Stage>
        <div className={`fade ${bg === 'light' ? 'on-light' : ''} ${className}`} style={{ position: 'absolute', inset: 0 }}>
          {under /* full-canvas layer drawn beneath the top bar, e.g. the floor map */}
          {bar === 'full' ? <TopBar back={back} view={view} notice={notice} /> : <MinimalBar />}
          {children}
          {nav && <RadialNav startOpen={nav === 'open'} />}
          {role === 'staff' && !view && <NowPlaying />}
          {toast && <div className="toast" key={toast.key}><Check size={15} color="var(--teal-2)" />{toast.msg}</div>}
          {searchOpen && <SearchOverlay />}
          {assistantOpen && <AssistantPanel />}
          {assignOpen && <AssignTasks onClose={() => setAssignOpen(false)} />}
        </div>
      </Stage>
    </div>
  )
}

/* ───────────────────────── Top bar ───────────────────────── */

function MinimalBar() {
  const nav = useNavigate()
  const role = useRole()
  return (
    <button className="circle-btn abs" style={{ left: 64, top: 70, width: 40, height: 40 }} onClick={() => nav(`/${role}`)} title="Back to overview">
      <ChevronLeft size={20} />
    </button>
  )
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000 * 15); return () => clearInterval(t) }, [])
  return now
}

export function TopBar({ back, view, notice }) {
  const nav = useNavigate()
  const role = useRole()
  const { night, setNight, setSearchOpen } = useStore()
  const now = useClock()
  const [menu, setMenu] = useState(false)
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
  const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/London' })

  return (
    <>
      {back && (
        <button className="circle-btn abs" style={{ left: 47, top: 21 }} onClick={() => nav(`/${role}`)} title="Back to overview">
          <ChevronLeft size={22} />
        </button>
      )}
      <button className="abs" style={{ left: 111, top: 23 }} onClick={() => setMenu(m => !m)} title="Account">
        <Avatar src={role === 'manager' ? img.meManager : img.meStaff} size={46} style={{ border: '2px solid rgba(255,255,255,.9)' }} />
      </button>
      {menu && <AccountMenu onClose={() => setMenu(false)} />}

      <button
        className="abs" onClick={() => setNight(n => !n)} title={night ? 'Day mode' : 'Night mode'}
        style={{ left: 173, top: 24, width: 70, height: 44, borderRadius: 999, background: '#fff', padding: 4 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 999, background: 'var(--teal-deep)', position: 'relative' }}>
          <span style={{ position: 'absolute', top: 9, left: night ? 'auto' : 10, right: night ? 10 : 'auto', color: '#fff' }}>
            {night ? <Sun size={14} /> : <Moon size={14} fill="#fff" />}
          </span>
          <span style={{ position: 'absolute', top: 4, width: 28, height: 28, borderRadius: '50%', background: '#fff', left: night ? 4 : 30, transition: 'left .3s cubic-bezier(.3,.9,.3,1.2)' }} />
        </div>
      </button>

      <div className="abs" style={{ left: 275, top: 29, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-.02em' }}>{time}</span>
        <span style={{ width: 1, height: 26, background: 'rgba(255,255,255,.8)' }} />
        <span style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 11 }}>{date}</div>
          <div style={{ fontSize: 10, opacity: .65 }}>Radisson blu Glasgow</div>
        </span>
      </div>

      {notice && <NoticePill />}

      {view && <ViewSwitch current={view} />}
      <button className="circle-btn sm abs" style={{ left: view ? 1288 : 1198, top: view ? 33 : 27 }}
        onClick={() => setSearchOpen(true)} title="Search">
        <Search size={17} />
      </button>
    </>
  )
}

function AccountMenu({ onClose }) {
  const nav = useNavigate()
  const role = useRole()
  const other = role === 'manager' ? 'staff' : 'manager'
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div className="paper rise" style={{ position: 'absolute', left: 111, top: 80, zIndex: 41, width: 240, padding: 8, borderRadius: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px 12px' }}>
          <Avatar src={role === 'manager' ? img.meManager : img.meStaff} size={36} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{role === 'manager' ? 'Hannah Reid' : 'Amy Morgan'}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{role === 'manager' ? 'Spa Manager' : 'Therapist'}</div>
          </div>
        </div>
        <MenuItem icon={<Repeat size={15} />} onClick={() => { onClose(); nav(`/${other}`) }}>Switch to {other} view</MenuItem>
        <MenuItem icon={<LogOut size={15} />} onClick={() => { onClose(); nav('/') }}>Sign out</MenuItem>
      </div>
    </>
  )
}
const MenuItem = ({ icon, children, onClick }) => (
  <button onClick={onClick} style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13, textAlign: 'left' }}
    onMouseEnter={e => e.currentTarget.style.background = '#e7eeee'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
    {icon}{children}
  </button>
)

/* ───────── Notification stack: drag or scroll the pill up/down to move through notifications ───────── */
function useNotifications(role) {
  const { tasks, schedule, notes, setAssignOpen } = useStore()
  const due = tasks.filter(t => ['overdue', 'soon'].includes(t.status))
  const overdue = tasks.filter(t => t.status === 'overdue')
  const manual = scheduleStats(schedule).manual
  const unowned = tasks.filter(t => !t.people.length && t.status !== 'done')
  const mine = tasks.filter(t => t.people.includes('amy') && ['overdue', 'soon'].includes(t.status))
  const voice = notes.find(n => n.kind === 'voice')
  const list = role === 'manager' ? [
    unowned.length > 0 && { id: 'pending', tone: 'teal', title: `${unowned.length} tasks pending assignment`, sub: 'Auto-assign available', countdown: true,
      open: () => setAssignOpen(true), action: { label: 'Assign', run: () => setAssignOpen(true) } },
    manual > 0 && { id: 'bookings', tone: 'amber', title: `${manual} bookings need a therapist`, sub: 'Open the calendar to assign', to: '/manager/schedule', time: 'Today' },
    due.length > 0 && { id: 'due', tone: 'amber', title: `${due.length} Tasks are about to due`, sub: `${overdue.length} already overdue`, to: '/manager/tasks', countdown: true },
    ...overdue.slice(0, 3).map(t => ({ id: 'o-' + t.id, tone: 'red', title: `${t.title} is overdue`, sub: `${t.location} · due ${fmtTime(t.due)}`, to: `/manager/tasks?task=${t.id}`, time: fmtTime(t.due) })),
    { id: 'arrive', tone: 'teal', title: 'James K. has checked in', sub: 'Hot Stone · TR-04 · 11:00', to: '/manager/schedule', time: '10:52' },
    voice && { id: 'note', tone: 'teal', title: 'New voice note on the map', sub: `${staffById[voice.by]?.name} · ${voice.where}`, to: '/manager/map', time: voice.when.replace('today ', '') },
  ] : [
    mine.length > 0 && { id: 'due', tone: 'amber', title: `${mine.length} Tasks are about to due`, sub: mine.map(t => t.title).slice(0, 2).join(' · '), to: '/staff/tasks', countdown: true },
    ...mine.filter(t => t.status === 'overdue').slice(0, 2).map(t => ({ id: 'o-' + t.id, tone: 'red', title: `${t.title} is overdue`, sub: `${t.location} · due ${fmtTime(t.due)}`, to: `/staff/tasks?task=${t.id}`, time: fmtTime(t.due) })),
    { id: 'next', tone: 'teal', title: 'Next guest: James K. at 11:00', sub: 'Hot Stone · TR-04', to: '/staff/rooms', time: '11:00' },
    { id: 'train', tone: 'teal', title: 'Sound Bath Essentials is due', sub: 'Mandatory · 18 min', to: '/staff/training?play=sound', time: 'Fri' },
    { id: 'kudos', tone: 'teal', title: 'Elena J. sent you kudos 🎉', sub: 'For the VIP arrival this morning', to: '/staff', time: '09:41' },
  ]
  return list.filter(Boolean)
}

/*
 * Card-stack motion from the Figma prototype (Frame 2095585771 → 2095585772):
 *   front card   y 0,  scale 1      — full content
 *   next card    y 12, scale .927   — grey card peeking underneath
 *   card after   y 20, scale .87    — fainter
 *   previous     y 0,  scale .876   — shrinks back behind the front card
 * Dragging up (or scrolling down) pulls the next card forward; the drag follows the pointer and snaps on release.
 */
const STACK = [
  { at: -1, y: 0, s: 0.876, o: 0, co: 0, bg: 255 },
  { at: 0, y: 0, s: 1, o: 1, co: 1, bg: 255 },
  { at: 1, y: 12, s: 0.927, o: 1, co: 0, bg: 214 },
  { at: 2, y: 20, s: 0.87, o: 0.55, co: 0, bg: 200 },
  { at: 3, y: 26, s: 0.82, o: 0, co: 0, bg: 200 },
]
function stackStyle(eff) {
  const e = Math.max(-1, Math.min(3, eff))
  const i = Math.min(STACK.length - 2, Math.max(0, Math.floor(e + 1)))
  const A = STACK[i], B = STACK[i + 1], t = (e - A.at) / (B.at - A.at)
  const L = k => A[k] + (B[k] - A[k]) * t
  return { y: L('y'), s: L('s'), o: L('o'), co: L('co'), bg: Math.round(L('bg')), z: Math.round(100 - Math.abs(e) * 10 - (e < 0 ? 15 : 0)) }
}

function NoticePill() {
  const role = useRole()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const all = useNotifications(role)
  const [dismissed, setDismissed] = useState([])
  const items = all.filter(n => !dismissed.includes(n.id))
  const [idx, setIdx] = useState(0)
  const [drag, setDrag] = useState(0)          // live drag progress, -1 … 1
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState(false)
  const [secs, setSecs] = useState(12 * 60 + 27)
  const start = useRef(null)
  const moved = useRef(false)
  const wheel = useRef({ acc: 0, lock: 0 })
  useEffect(() => { const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (idx > items.length - 1) setIdx(Math.max(0, items.length - 1)) }, [items.length, idx])
  if (!items.length) return null

  const i = Math.min(idx, items.length - 1)
  const last = items.length - 1
  const go = d => setIdx(x => Math.max(0, Math.min(last, x + d)))
  const sc = () => { const r = document.querySelector('.stage').getBoundingClientRect(); return r.width / 1552 }

  const onDown = e => { if (e.button !== 0) return; start.current = { y: e.clientY, id: e.pointerId }; moved.current = false }
  const onMove = e => {
    if (!start.current) return
    const dy = (start.current.y - e.clientY) / sc()       // dragging up = positive = next card
    if (!moved.current && Math.abs(dy) < 4) return
    if (!moved.current) { moved.current = true; setDragging(true); e.currentTarget.setPointerCapture?.(start.current.id) }
    let p = Math.max(-1, Math.min(1, dy / 44))
    if ((i === last && p > 0) || (i === 0 && p < 0)) p *= 0.25 // rubber-band at the ends
    setDrag(p)
  }
  const onUp = () => {
    if (!start.current) return
    start.current = null
    if (moved.current) {
      if (drag > 0.3) go(1); else if (drag < -0.3) go(-1)
      setDrag(0); setDragging(false)
      setTimeout(() => (moved.current = false), 0)
    }
  }
  const onWheel = e => {
    const w = wheel.current, now = Date.now()
    if (now < w.lock) return
    w.acc += e.deltaY
    if (Math.abs(w.acc) > 40) { go(w.acc > 0 ? 1 : -1); w.acc = 0; w.lock = now + 420 }
  }

  const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0')
  const left = pathname === `/${role}` ? 603 : 632
  const tone = t => ({ teal: 'var(--green)', amber: '#d29a12', red: '#d8432f' }[t])
  const ease = dragging ? 'none' : 'transform .5s cubic-bezier(.22,.9,.24,1), opacity .4s ease, background-color .4s ease'

  return (
    <div className="abs" style={{ left, top: 22, zIndex: 30, width: 330, height: 74, touchAction: 'none', userSelect: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
      {items.map((n, j) => {
        const eff = j - i - drag
        if (eff < -1.2 || eff > 3.2) return null
        const st = stackStyle(eff)
        const front = Math.abs(eff) < 0.5
        return (
          <div key={n.id} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 46, borderRadius: 999, transformOrigin: '50% 0',
            transform: `translateY(${st.y}px) scale(${st.s})`, opacity: st.o, zIndex: st.z, background: `rgb(${st.bg},${st.bg + 4 > 255 ? 255 : st.bg + 4},${st.bg + 5 > 255 ? 255 : st.bg + 5})`,
            boxShadow: front ? '0 12px 30px -10px rgba(0,0,0,.3)' : '0 6px 16px -10px rgba(0,0,0,.25)', transition: ease, color: 'var(--ink)', overflow: 'hidden',
            pointerEvents: front ? 'auto' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 4px 0 16px', gap: 12, opacity: st.co, transition: dragging ? 'none' : 'opacity .35s ease' }}>
              {/* the small two-tone "slider" from the design: where you are in the stack */}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 'none' }}>
                {items.slice(Math.max(0, Math.min(j - 1, last - 2)), Math.max(0, Math.min(j - 1, last - 2)) + Math.min(3, items.length)).map(x => (
                  <span key={x.id} style={{ width: 2, height: 5, borderRadius: 1, background: x.id === n.id ? tone(n.tone) : '#cfd6d7' }} />
                ))}
              </span>
              <button onClick={() => { if (moved.current) return; if (n.open) n.open(); else setOpen(o => !o) }} title={n.open ? 'Choose who and when' : 'Drag or scroll for more · click to see all'}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', lineHeight: 1.1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                {n.sub && <div style={{ fontSize: 10, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.sub}</div>}
              </button>
              <span style={{ fontSize: 10, background: '#eef1f1', borderRadius: 999, padding: '9px 10px', color: 'var(--ink-2)', flex: 'none' }}>{n.countdown ? `-${mm}:${ss}` : n.time}</span>
              <button onClick={() => { if (!moved.current) setDismissed(d => [...d, n.id]) }} style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', position: 'relative', flex: 'none', border: '1px solid #eef1f1' }} title="Dismiss">
                {n.countdown && (
                  <svg width="38" height="38" style={{ position: 'absolute', inset: -1, transform: 'rotate(-90deg)' }}>
                    <circle cx="19" cy="19" r="18" fill="none" stroke={tone(n.tone)} strokeWidth="1.4" strokeDasharray={113} strokeDashoffset={113 * (1 - secs / 747) + 84} strokeLinecap="round" />
                  </svg>
                )}
                <X size={15} />
              </button>
            </div>
          </div>
        )
      })}
      {open && (
        <div className="paper rise scroll" onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 70, left: 0, right: 0, maxHeight: 360, padding: 8, borderRadius: 22, zIndex: 120, cursor: 'default' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 8px', fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ flex: 1 }}>{items.length} notifications</span>
            <button onClick={() => { setDismissed(all.map(x => x.id)); setOpen(false) }} style={{ fontSize: 11, color: 'var(--ink-2)' }}>Clear all</button>
          </div>
          {items.map((x, j) => (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 14, background: j === i ? '#eef3f3' : 'transparent' }}>
              <span className="dot" style={{ background: tone(x.tone) }} />
              <button onClick={() => { setOpen(false); x.open ? x.open() : nav(x.to) }} style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.sub}</div>
              </button>
              {x.action && <button className="pill-btn dark" style={{ height: 30, fontSize: 11, padding: '0 12px' }} onClick={() => { x.action.run(); setOpen(false) }}><UserCheck size={12} />{x.action.label}</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ViewSwitch({ current }) {
  const nav = useNavigate()
  const role = useRole()
  const items = [['list', 'List', 'tasks'], ['location', 'Location', 'rooms'], ['map', 'Map', 'map']]
  return (
    <div className="seg abs" style={{ left: 1031, top: 29 }}>
      {items.map(([k, label, path]) => (
        <button key={k} className={current === k ? 'on' : ''} onClick={() => nav(`/${role}/${path}`)} style={{ width: 80, padding: 0 }}>{label}</button>
      ))}
    </div>
  )
}

/* ───────────────────────── Radial nav ───────────────────────── */

export function RadialNav({ startOpen }) {
  const [open, setOpen] = useState(!!startOpen)
  const nav = useNavigate()
  const role = useRole()
  const { pathname } = useLocation()
  const ref = useRef()

  const items = role === 'manager'
    ? [
        { icon: LayoutGrid, to: '/manager', label: 'Overview', a: 90 },
        { icon: GraduationCap, to: '/manager/training', label: 'Training', a: 150 },
        { icon: CalendarDays, to: '/manager/schedule', label: 'Schedule', a: 30 },
        { icon: ClipboardList, to: '/manager/tasks', label: 'Tasks', a: 205 },
        { icon: MapPin, to: '/manager/rooms', label: 'Rooms', a: -25 },
      ]
    : [
        { icon: LayoutGrid, to: '/staff', label: 'Overview', a: 90 },
        { icon: GraduationCap, to: '/staff/training', label: 'Training', a: 150 },
        { icon: DoorOpen, to: '/staff/rooms', label: 'Rooms', a: 30 },
        { icon: ClipboardList, to: '/staff/tasks', label: 'Tasks', a: 205 },
        { icon: MapPin, to: '/staff/map', label: 'Map', a: -25 },
      ]
  const active = (to) => to === `/${role}` ? pathname === to : pathname.startsWith(to)
  const cx = 776, cy = 826

  if (!open) {
    return (
      <button className="abs" onClick={() => setOpen(true)} title="Menu"
        style={{ left: cx - 35, top: 797, width: 70, height: 70, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(15, 60, 66, .55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,.12)', zIndex: 20 }}>
        <LayoutGrid size={24} strokeWidth={1.5} />
      </button>
    )
  }
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
      <div className="fade" style={{ position: 'absolute', left: cx - 98, top: cy - 98, width: 196, height: 196, borderRadius: '50%', background: 'rgba(255,255,255,.14)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,.18)', pointerEvents: 'auto' }} />
      {items.map((it, i) => {
        const r = 66, rad = (it.a * Math.PI) / 180
        const x = cx + Math.cos(rad) * r, y = cy - Math.sin(rad) * r
        const on = active(it.to)
        const Icon = it.icon
        return (
          <button key={it.to} title={it.label} onClick={() => nav(it.to)}
            className="rise"
            style={{ position: 'absolute', left: x - 29, top: y - 29, width: 58, height: 58, borderRadius: '50%', display: 'grid', placeItems: 'center', pointerEvents: 'auto',
              background: on ? 'var(--teal-dark)' : 'rgba(255,255,255,.16)', animationDelay: `${i * 40}ms` }}>
            <Icon size={21} strokeWidth={1.5} />
          </button>
        )
      })}
      <button onClick={() => setOpen(false)} title="Close menu"
        style={{ position: 'absolute', left: cx - 35, top: cy - 35, width: 70, height: 70, borderRadius: '50%', background: '#fff', color: 'var(--ink)', display: 'grid', placeItems: 'center', pointerEvents: 'auto', boxShadow: '0 10px 30px -8px rgba(0,0,0,.35)' }}>
        <X size={22} strokeWidth={1.5} />
      </button>
    </div>
  )
}

/* ───────────────────────── Staff extras ───────────────────────── */

export function NowPlaying() {
  const { nowPlaying, setNowPlaying } = useStore()
  if (!nowPlaying) return null
  const t = nowPlaying.secs
  const fmt = `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  return (
    <div className="abs" style={{ left: 1298, top: 785, width: 190, height: 36, borderRadius: 999, overflow: 'hidden', display: 'flex', alignItems: 'center', zIndex: 15,
      background: `linear-gradient(90deg, rgba(60,30,20,.75), rgba(40,40,40,.5)), url(${img.training.deep}) center/cover`, boxShadow: '0 10px 24px -10px rgba(0,0,0,.5)' }}>
      <div style={{ flex: 1, paddingLeft: 18, lineHeight: 1.05 }}>
        <div style={{ fontSize: 12 }}>{nowPlaying.title}</div>
        <div style={{ fontSize: 8, opacity: .7 }}>{fmt}</div>
      </div>
      <button onClick={() => setNowPlaying(n => ({ ...n, playing: !n.playing }))} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #fff', display: 'grid', placeItems: 'center', marginRight: 4 }}>
        {nowPlaying.playing ? <Pause size={12} fill="#fff" /> : <Play size={12} fill="#fff" />}
      </button>
      <button onClick={() => setNowPlaying(null)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', marginRight: 4 }} title="End">
        <SkipForward size={12} fill="#fff" />
      </button>
    </div>
  )
}

export function AiButton({ style }) {
  const { setAssistantOpen } = useStore()
  return (
    <button onClick={() => setAssistantOpen(true)} title="AI assistant" className="abs"
      style={{ left: 90, top: 760, width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center',
        background: 'radial-gradient(circle at 50% 40%, #1f8f86, #0b4a4c)', boxShadow: '0 0 0 3px rgba(60,198,181,.2), 0 0 24px rgba(60,198,181,.45)', ...style }}>
      <AiDots size={20} />
    </button>
  )
}

export { staffById }
