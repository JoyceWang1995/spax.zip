import { Fragment, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import NewBooking from '../../components/NewBooking'
import { RefreshCw, Plus, CalendarPlus, Clock, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles, Check, UserCheck } from 'lucide-react'
import { Page } from '../../components/Shell'
import { Avatar, AiDots, ringColor } from '../../components/ui'
import { useStore, SCHEDULE_ROOMS, SCHEDULE_HOURS, staffById, scheduleStats, therapistOptions } from '../../data/store'

// cell colours — the left-hand cards use the same colours as their cells
// light blue = needs manual assign (same colour as the "manual assign" card); lighter/faded = no manager needed
const MANUAL_BLUE = 'rgba(176,203,210,.88)'
const CELL = {
  manual: { bg: MANUAL_BLUE, fg: '#173338' },
  ai: { bg: 'rgba(255,255,255,.1)', fg: 'rgba(255,255,255,.5)' },
  assigned: { bg: 'rgba(255,255,255,.1)', fg: 'rgba(255,255,255,.5)' },
  past: { bg: 'rgba(255,255,255,.1)', fg: 'rgba(255,255,255,.42)' },
}
// calendar geometry (canvas px) — used to draw the line from the selected booking to its detail card
const CAL = { left: 343, top: 160, rowsTop: 160 + 24 + 52, row: 71.5, cellX: 343 + 22 + 70 + 4, col: 72, cell: 64 }
const TEAM = ['elena', 'lisa', 'marcus', 'chloe', 'maya']
const endOf = h => `${String(+h.slice(0, 2) + 1).padStart(2, '0')}:00`

export default function Schedule() {
  const { notify, dispatch, schedule, tasks, setAssignOpen } = useStore()
  const [view, setView] = useState('Day')
  const [params] = useSearchParams()
  // opened from the overview's bookings card → select that booking
  const [sel, setSel] = useState(() => params.get('h') ? { h: params.get('h'), r: +params.get('r') } : { h: '10:00', r: 0 })
  const [highlight, setHighlight] = useState(null) // filter: 'manual' (light blue cells) | 'ai' | null
  const matches = (c, f) => c && (f === 'ai' ? c.state !== 'manual' : c.state === 'manual')
  const toggleFilter = f => {
    const next = highlight === f ? null : f
    if (next) {
      let first = null
      for (const h of SCHEDULE_HOURS) { const r = schedule[h].findIndex(c => matches(c, next)); if (r >= 0) { first = { h, r }; break } }
      if (!first) return notify(next === 'manual' ? 'Every booking already has a therapist' : 'No bookings have a therapist yet')
      if (!sel || !matches(schedule[sel.h]?.[sel.r], next)) setSel(first)
    }
    setHighlight(next)
  }
  const [teamOpen, setTeamOpen] = useState(false)
  const [newSlot, setNewSlot] = useState(null) // { h, r } of a free slot being booked

  const stats = scheduleStats(schedule)
  const cell = sel ? schedule[sel.h]?.[sel.r] : null
  const counts = SCHEDULE_ROOMS.map((_, r) => {
    const col = SCHEDULE_HOURS.map(h => schedule[h][r]).filter(Boolean)
    return [col.filter(c => c.state !== 'manual').length, col.length]
  })

  const assign = (h, r, id) => {
    dispatch({ type: 'assignBooking', hour: h, room: r, therapist: id })
    if (highlight === 'manual' && stats.manual <= 1) setHighlight(null)
    notify(`${schedule[h][r].guest} assigned to ${staffById[id].name}`)
  }
  // open tasks today per person = their tasks + 4 per booking they're running
  const load = id => tasks.filter(t => t.people.includes(id) && t.status !== 'done').length +
    4 * Object.values(schedule).flat().filter(c => c && c.state !== 'past' && c.therapist === id).length

  return (
    <Page bg="dark" nav="open">
      <div className="seg abs" style={{ left: 796, top: 103 }}>
        {['Day', 'week', 'Month'].map(v => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)} style={{ height: 38, padding: v === 'Day' ? '0 22px' : '0 6px', fontSize: 12.5 }}>{v}</button>
        ))}
      </div>

      {/* left stats — all counted from the calendar */}
      <div className="glass abs rise" style={{ left: 151, top: 162, width: 166, height: 166, padding: '18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 12, opacity: .5 }}>Triggered Tasks</span>
          <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', fontSize: 14 }}>{stats.triggered}</span>
        </div>
        <div style={{ fontSize: 34, fontWeight: 300, marginTop: 22 }}>{stats.bookings}</div>
        <button onClick={() => notify(`Synced from Trybe · ${stats.bookings} bookings, ${stats.past} completed`)} style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>Bookings today <RefreshCw size={12} /></button>
      </div>

      <button className="abs rise card-link" onClick={() => toggleFilter('ai')} title="Show only AI-assigned bookings"
        style={{ left: 151, top: 336, width: 166, height: 166, borderRadius: 30, padding: 16, textAlign: 'left', animationDelay: '60ms',
          background: 'radial-gradient(80% 80% at 50% 45%, #000 40%, #0d3d40 80%, #23716f 100%)', boxShadow: `0 0 0 ${highlight === 'ai' ? 2 : 1}px rgba(80,210,195,${highlight === 'ai' ? .9 : .4}), 0 0 26px rgba(60,198,181,.35)` }}>
        <span style={{ position: 'absolute', right: 18, top: 18 }}><AiDots size={26} /></span>
        <div style={{ position: 'absolute', left: 16, bottom: 18, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 34, fontWeight: 300 }}>{stats.handled}</span><span style={{ fontSize: 14 }}>AI assigned</span>
        </div>
      </button>

      <div className="abs rise card-link" onClick={() => toggleFilter('manual')} title="Show only bookings that need manual assign"
        style={{ left: 151, top: 508, width: 166, height: 166, borderRadius: 30, padding: '18px 18px', textAlign: 'left', background: MANUAL_BLUE, color: 'var(--ink)', animationDelay: '120ms', cursor: 'pointer',
          boxShadow: highlight === 'manual' ? '0 0 0 2px #fff' : 'none' }}>
        <div style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="dot" style={{ width: 6, height: 6, background: '#f0a23a' }} /> Pending
          <span className="dot" style={{ width: 6, height: 6, background: 'var(--teal)', marginLeft: 4 }} /> Due
        </div>
        <div style={{ position: 'absolute', left: 18, bottom: 18, right: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 34, fontWeight: 300 }}>{stats.manual}</div>
              <div style={{ fontSize: 12.5, opacity: .7 }}>manual assign</div>
            </div>
          </div>
        </div>
      </div>

      <button className="abs" onClick={() => notify('Connected to Trybe · last sync 2 min ago')} title="Trybe booking sync"
        style={{ left: 53, top: 423, width: 52, height: 50, borderRadius: 10, background: 'rgba(235,238,238,.9)', color: '#333', fontSize: 7.5, fontWeight: 700, letterSpacing: '.08em', display: 'grid', placeItems: 'center' }}>
        <span><span style={{ color: '#e5483b' }}>◢</span> TRYBE</span>
      </button>

      {/* calendar */}
      <div className="glass abs rise" style={{ left: 343, top: 160, width: 620, height: 620, padding: '24px 26px 0 22px', animationDelay: '80ms', background: 'rgba(255,255,255,.1)' }}>
        {view === 'Day' && <DayGrid grid={schedule} counts={counts} sel={sel} setSel={setSel} highlight={highlight} />}
        {view === 'week' && <WeekView />}
        {view === 'Month' && <MonthView />}
      </div>

      {sel && <BookingDetail key={sel.h + sel.r + (cell?.state || 'empty')} cell={cell} schedule={schedule} hour={sel.h} roomIdx={sel.r}
        onAssign={id => assign(sel.h, sel.r, id)} onAdd={() => setNewSlot(sel)} />}
      {newSlot && <NewBooking hour={newSlot.h} roomIdx={newSlot.r} roomLabel={SCHEDULE_ROOMS[newSlot.r].replace('TR', 'TR-')}
        onClose={() => setNewSlot(null)} onCreated={() => setSel({ ...newSlot })} />}

      {/* Today assignment */}
      <div className="abs rise" style={{ left: 987, top: 458, width: 290, height: 290, borderRadius: 30, padding: '20px 12px 12px', background: 'rgba(200,215,218,.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', animationDelay: '160ms', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 0 }}>
          <span style={{ flex: 1, fontSize: 15 }}>Today Assignment</span>
          <button onClick={() => setAssignOpen(true)} title="Assign pending tasks" style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'grid', placeItems: 'center' }}><Plus size={20} strokeWidth={1.4} /></button>
        </div>
        <div className="scroll" style={{ marginTop: 6, height: 136 }}>
          {TEAM.map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 47, paddingLeft: 12 }}>
              <Avatar id={id} size={38} ring={ringColor(staffById[id].status)} style={{ border: '2px solid #fff' }} />
              <span style={{ flex: 1, lineHeight: 1.2 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{staffById[id].name}</div>
                <div style={{ fontSize: 9.5, opacity: .7 }}>{staffById[id].role}</div>
              </span>
              <span style={{ fontSize: 9, background: 'rgba(80,110,115,.45)', padding: '4px 8px', borderRadius: 999, marginRight: 12 }}>{load(id)} task</span>
            </div>
          ))}
        </div>
        {/* Treatment team: grows over the list when opened so every member is visible */}
        <div onClick={() => setTeamOpen(o => !o)} style={{ position: 'absolute', left: 12, right: 12, bottom: 12, height: teamOpen ? 214 : 64, borderRadius: 32, background: '#fff', color: 'var(--ink)', padding: '12px 22px', transition: 'height .35s cubic-bezier(.2,.8,.2,1)', overflow: 'hidden', cursor: 'pointer', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1 }}>
              <div style={{ fontSize: 15 }}>Treatment Team</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{TEAM.length} Staffs · {TEAM.filter(id => staffById[id].status === 'available').length} available</div>
            </span>
            {teamOpen ? <ChevronDown size={18} color="var(--muted)" /> : <ChevronUp size={18} color="var(--muted)" />}
          </div>
          {teamOpen && (
            <div className="fade" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
              {TEAM.map(id => (
                <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eef3f3', borderRadius: 999, padding: '4px 8px 4px 4px', fontSize: 11, minWidth: 0 }}>
                  <Avatar id={id} size={22} ring={ringColor(staffById[id].status)} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staffById[id].name}</span>
                </span>
              ))}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, fontSize: 9.5, color: 'var(--muted)', marginTop: 4 }}>
                <Legend c={ringColor('available')} l="Available" /><Legend c={ringColor('busy')} l="Busy" /><Legend c={ringColor('break')} l="On break" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

const Legend = ({ c, l }) => <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span className="dot" style={{ width: 7, height: 7, background: c }} />{l}</span>
const StatusWord = ({ s }) => <span style={{ color: { available: '#2f9d62', busy: '#d1513d', break: '#7d8a8c' }[s] }}>{{ available: 'Available', busy: 'Busy', break: 'On break' }[s]}</span>

function DayGrid({ grid, counts, sel, setSel, highlight }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 40 }}>
        <span style={{ width: 70, fontSize: 14, opacity: .6, paddingBottom: 4 }}>03 JUN</span>
        {SCHEDULE_ROOMS.map((r, i) => (
          <div key={r} style={{ width: 72, textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em' }}>{r}</div>
            <div style={{ fontSize: 17, fontWeight: 600 }} title={`${counts[i][0]} of ${counts[i][1]} bookings have a therapist`}>{counts[i][0]}<span style={{ fontSize: 10, opacity: .5, fontWeight: 400 }}>/{counts[i][1]}</span></div>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', marginTop: 12 }}>
        {SCHEDULE_HOURS.map((h, hi) => (
          <div key={h} style={{ display: 'flex', height: 71.5, alignItems: 'flex-start' }}>
            <div style={{ width: 70, position: 'relative', paddingLeft: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{h}</div>
              {Array.from({ length: 5 }, (_, k) => <div key={k} style={{ width: 12, height: 1, background: 'rgba(255,255,255,.3)', margin: '9px 0 0 12px' }} />)}
              {hi === 0 && <div style={{ position: 'absolute', left: 18, top: 49, width: 28, height: 1.5, background: '#fff' }} />}
            </div>
            {SCHEDULE_ROOMS.map((r, ri) => {
              const c = grid[h][ri]
              const on = sel && sel.h === h && sel.r === ri
              const st = c ? CELL[c.state] : null
              const dimmed = highlight && c && (highlight === 'ai' ? c.state === 'manual' : c.state !== 'manual')
              const manual = c?.state === 'manual'
              const selected = on && c
              // selected booking = dark teal, as in the design
              const bg = selected ? '#0e3a3f' : st ? st.bg : 'rgba(255,255,255,.06)'
              return (
                <button key={r} onClick={() => !dimmed && !(highlight && !c) && setSel({ h, r: ri })} className={c && !dimmed ? 'card-link' : !c && !highlight ? 'slot' : ''}
                  title={!c && !highlight ? `${r} · ${h} is free` : undefined}
                  style={{ width: 64, height: 64, margin: '0 4px', borderRadius: 11, background: dimmed ? 'rgba(255,255,255,.05)' : on && !c ? 'rgba(255,255,255,.16)' : bg, color: selected ? '#fff' : st?.fg || '#fff', textAlign: 'left', padding: '8px 7px 6px', position: 'relative',
                    outline: on && !c ? '1.5px dashed rgba(255,255,255,.75)' : 'none', outlineOffset: -1.5,
                    cursor: (c && !dimmed) || (!c && !highlight) ? 'pointer' : 'default', display: 'flex', flexDirection: 'column',
                    boxShadow: selected ? '0 10px 22px -8px rgba(0,0,0,.55)' : manual && !dimmed ? '0 6px 14px -8px rgba(0,0,0,.35)' : 'none', transition: 'background .3s, color .3s, box-shadow .3s' }}>
                  {!c && !highlight && <Plus className="plus" size={16} style={{ margin: 'auto', opacity: on ? .9 : 0, transition: 'opacity .2s' }} />}
                  {c && !dimmed && (
                    <>
                      <span className="dot" title={manual ? (c.due ? 'Due — assign now' : 'Pending assignment') : c.therapist ? staffById[c.therapist].name : ''}
                        style={{ position: 'absolute', right: 5, top: 5, width: 4.5, height: 4.5, background: manual || selected ? (c.due || !manual ? 'var(--teal)' : '#f0a23a') : 'rgba(255,255,255,.4)' }} />
                      <div style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-.01em', marginTop: 8 }}>{c.guest}</div>
                      <div style={{ fontSize: 7, lineHeight: 1.3, opacity: manual || selected ? .85 : 1 }}>{c.treatment}</div>
                      <div style={{ fontSize: 6.5, opacity: .6, marginTop: 'auto' }}>{h}-{endOf(h)}</div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

function WeekView() {
  const days = ['Mon 01', 'Tue 02', 'Wed 03', 'Thu 04', 'Fri 05', 'Sat 06', 'Sun 07']
  const val = (d, r) => (Math.sin(d * 1.7 + r * 0.9) + 1) / 2
  return (
    <div className="fade">
      <div style={{ fontSize: 14, opacity: .7, marginBottom: 14 }}>Week 23 · room utilisation</div>
      <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: 6 }}>
        <span />{SCHEDULE_ROOMS.map(r => <div key={r} style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', letterSpacing: '.08em' }}>{r}</div>)}
        {days.map((d, di) => (
          <Fragment key={d}>
            <div style={{ fontSize: 11, alignSelf: 'center' }}>{d}</div>
            {SCHEDULE_ROOMS.map((r, ri) => {
              const v = val(di, ri)
              return <div key={d + r} style={{ height: 62, borderRadius: 10, background: `rgba(60,198,181,${0.15 + v * 0.7})`, display: 'grid', placeItems: 'center', fontSize: 12 }}>{Math.round(v * 8)}</div>
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function MonthView() {
  return (
    <div className="fade">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ flex: 1, fontSize: 16 }}>June 2026</span>
        <ChevronLeft size={16} style={{ opacity: .5 }} /><ChevronRight size={16} style={{ opacity: .5, marginLeft: 10 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} style={{ fontSize: 10, opacity: .6, textAlign: 'center' }}>{d}</div>)}
        {Array.from({ length: 35 }, (_, i) => {
          const day = i + 1
          const n = day <= 30 ? 18 + Math.round(12 * Math.abs(Math.sin(day))) : null
          return (
            <div key={i} style={{ height: 84, borderRadius: 12, padding: 8, background: day === 3 ? 'var(--teal-dark)' : n ? 'rgba(255,255,255,.1)' : 'transparent' }}>
              {n && <><div style={{ fontSize: 12 }}>{day}</div><div style={{ fontSize: 9, opacity: .7, marginTop: 26 }}>{n} bookings</div></>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Right-hand card: every booking has its own details, tasks and (if unassigned) its own suggestion */
function bookingTasks(cell, hour) {
  const who = cell.therapist
  const list = [
    { title: 'Room preparation', who }, { title: 'Product check', who },
    { title: 'Guest greeting', who: 'amy' }, { title: 'Post-treatment reset', who: 'lisa' },
  ]
  const doneN = cell.state === 'past' ? 4 : hour === '10:00' ? 3 : hour === '11:00' ? 1 : 0
  return list.map((t, i) => ({ ...t, done: i < doneN }))
}

function BookingDetail({ cell, schedule, hour, roomIdx, onAssign, onAdd }) {
  const [k, setK] = useState(0)
  const options = cell?.state === 'manual' ? therapistOptions(schedule, hour, roomIdx) : []
  const [pick, setPick] = useState(options[0]?.id)
  const room = SCHEDULE_ROOMS[roomIdx]

  if (!cell) {
    const passed = hour < '10:00' // the calendar's "now" is in the 09:00–10:00 hour
    const free = therapistOptions(schedule, hour, roomIdx, '').filter(o => o.free)
    return (
      <div className="abs deep rise" style={{ left: 987, top: 162, width: 288, height: 280, padding: '26px 22px 0', overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{room.replace('TR', 'TR-')} is available</div>
        <div style={{ fontSize: 9, opacity: .6, marginTop: 4 }}>{hour}-{endOf(hour)} · 60 min</div>
        <div style={{ fontSize: 10, letterSpacing: '.05em', marginTop: 6 }}>
          {passed ? <span style={{ opacity: .6 }}>This slot has passed</span>
            : <><span style={{ color: 'var(--teal)', fontWeight: 600 }}>Free slot</span><span style={{ opacity: .7 }}> · {free.length} therapists free</span></>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
          <div className="stack">{free.slice(0, 5).map(o => <Avatar key={o.id} id={o.id} size={28} ring={ringColor(staffById[o.id].status)} style={{ border: '2px solid #0b2a2e' }} />)}</div>
        </div>
        <div style={{ position: 'absolute', left: 30, right: 30, top: 200, height: 160, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,.35)', borderBottom: 0 }} />
        {!passed && (
          <button onClick={onAdd} className="pill-btn" style={{ position: 'absolute', left: '50%', top: 214, transform: 'translateX(-50%)', height: 36, fontSize: 12.5, background: '#fff', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            <CalendarPlus size={14} /> Add booking
          </button>
        )}
      </div>
    )
  }

  const head = (
    <>
      <div style={{ fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cell.guest} — {cell.treatment}</div>
      <div style={{ fontSize: 9, opacity: .6, marginTop: 4 }}>{hour}-{endOf(hour)} · {room.replace('TR', 'TR-')} · 60 min</div>
    </>
  )

  if (cell.state === 'manual') {
    const free = options.filter(o => o.free)
    const pos = Math.max(0, free.findIndex(o => o.id === pick))
    const o = free[pos], st = staffById[o.id]
    const cycle = d => setPick(free[(pos + d + free.length) % free.length].id)
    return (
      <div className="abs deep rise" style={{ left: 987, top: 162, width: 288, height: 280, padding: '26px 22px 0', overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)' }}>
        {head}
        <div style={{ fontSize: 10, letterSpacing: '.05em', marginTop: 6 }}>
          <span style={{ color: '#f0a23a', fontWeight: 600 }}>Needs manual assign</span>
          <span style={{ opacity: .7 }}> · {free.length} therapists free</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, justifyContent: 'center' }}>
          <button onClick={() => cycle(-1)} style={{ opacity: .5 }} title="Previous suggestion"><ChevronLeft size={14} /></button>
          <Avatar id={o.id} size={30} ring={ringColor(st.status)} style={{ border: '1.5px solid #fff' }} />
          <span style={{ lineHeight: 1.2, width: 150 }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
              {st.name}{pos === 0 && <span style={{ fontSize: 8, background: 'rgba(60,198,181,.25)', color: 'var(--teal)', borderRadius: 999, padding: '1px 6px' }}>AI pick</span>}
            </div>
            <div style={{ fontSize: 8.5, opacity: .75 }}>{st.role} · {o.skilled ? 'trained' : 'not trained'} · <StatusWord s={st.status} /></div>
          </span>
          <button onClick={() => cycle(1)} style={{ opacity: .5 }} title="Next suggestion"><ChevronRight size={14} /></button>
        </div>
        <div style={{ position: 'absolute', left: 30, right: 30, top: 200, height: 160, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.35)', borderBottom: 0 }} />
        <svg width="228" height="80" style={{ position: 'absolute', left: 30, top: 200 }}>
          <path d="M 2 80 A 112 80 0 0 1 226 80" fill="none" stroke="#f0a23a" strokeWidth="2" strokeDasharray="300" strokeDashoffset={300 - 300 * ((pos + 1) / free.length)} style={{ transition: 'stroke-dashoffset .5s' }} />
        </svg>
        <button onClick={() => onAssign(o.id)} className="pill-btn" style={{ position: 'absolute', left: '50%', top: 214, transform: 'translateX(-50%)', height: 34, fontSize: 12, background: '#fff', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
          <UserCheck size={14} /> Assign to {st.name.split(' ')[0]}
        </button>
      </div>
    )
  }

  const tasks = bookingTasks(cell, hour)
  const t = tasks[k]
  const pending = tasks.filter(x => !x.done).length
  const tw = staffById[t.who]
  return (
    <div className="abs rise" style={{ left: 987, top: 162, width: 288, height: 280, padding: '30px 24px 0', overflow: 'hidden', borderRadius: 30, color: '#fff',
      background: 'radial-gradient(120% 90% at 90% 100%, #2a6c72 0%, #123f45 40%, #04181b 75%, #000 100%)', boxShadow: '0 24px 50px -24px rgba(0,20,24,.8)' }}>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cell.guest} — {cell.treatment}</div>
      <div style={{ fontSize: 10.5, opacity: .55, marginTop: 4, fontWeight: 300 }}>{hour}-{endOf(hour)} · {room.replace('TR', 'TR-')} · 60 min</div>
      {cell.notes && <div title={cell.notes} style={{ fontSize: 10, marginTop: 4, color: '#ffd38a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>⚑ {cell.notes}</div>}
      <div style={{ fontSize: 11, letterSpacing: '.06em', marginTop: 6 }}><span style={{ color: '#ef5a43', fontWeight: 600 }}>{pending} Pending</span> /{tasks.length} Tasks</div>
      {/* tap the task to step through this booking's tasks */}
      <button onClick={() => setK((k + 1) % tasks.length)} title="Next task" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '30px auto 0', textAlign: 'left' }}>
        <Avatar id={t.who} size={34} ring={ringColor(tw.status)} style={{ border: '2px solid #fff' }} />
        <span style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t.title}</div>
          <div style={{ fontSize: 10.5, opacity: .8, fontWeight: 300 }}>{tw.name} · {tw.role}</div>
        </span>
      </button>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
        {tasks.map((x, i) => <span key={i} className="dot" style={{ width: i === k ? 10 : 4, height: 4, borderRadius: 2, background: i === k ? '#fff' : 'rgba(255,255,255,.35)', transition: 'width .25s' }} />)}
      </div>
      <svg width="240" height="110" style={{ position: 'absolute', left: 24, top: 196 }}>
        <defs><linearGradient id="arcfade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity=".1" /></linearGradient></defs>
        <path d="M 4 110 A 116 92 0 0 1 236 110" fill="none" stroke="url(#arcfade)" strokeWidth="2" />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 226, textAlign: 'center', fontSize: 14, fontWeight: 600, color: t.done ? '#fff' : '#ffb39f' }}>
        {t.done ? 'Completed' : 'Pending'}
      </div>
    </div>
  )
}
