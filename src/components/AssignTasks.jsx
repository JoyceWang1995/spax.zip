import { useState } from 'react'
import { X, MapPin, UserCheck, Clock, Check } from 'lucide-react'
import { useStore, STAFF, staffById, fmtTime } from '../data/store'
import { Avatar, AiDots, ringColor } from './ui'

// who is usually best placed for a task, by the room it's in (first = suggestion)
const BY_ROOM = {
  reception: ['amara', 'sofia', 'elena'], cafe: ['maya', 'amara'], tr1: ['elena', 'marcus'], tr2: ['elena', 'daniel'], tr3: ['marcus', 'elena'],
  tr4: ['lucas', 'elena'], gym: ['lucas', 'daniel'], thermal: ['lisa', 'maya'], hydro: ['lisa', 'lucas'], lounger: ['maya', 'lisa'], boh: ['amara', 'sofia'],
}
function suggest(task) {
  const pref = BY_ROOM[task.room] || []
  const pool = STAFF.filter(s => !s.self)
  return [...pool].sort((a, b) => {
    const pa = pref.includes(a.id) ? pref.indexOf(a.id) : 9, pb = pref.includes(b.id) ? pref.indexOf(b.id) : 9
    const sa = a.status === 'available' ? 0 : a.status === 'break' ? 1 : 2, sb = b.status === 'available' ? 0 : b.status === 'break' ? 1 : 2
    return sa - sb || pa - pb
  }).map(s => s.id)
}

/** Tasks nobody owns yet: the manager picks who does each one and when it's due */
export default function AssignTasks({ onClose }) {
  const { tasks, dispatch, notify } = useStore()
  const pending = tasks.filter(t => !t.people.length && t.status !== 'done')
  const [picks, setPicks] = useState(() => Object.fromEntries(pending.map(t => [t.id, { who: suggest(t)[0], due: (t.due || '12:00').padStart(5, '0') }])))
  const [done, setDone] = useState([])
  const set = (id, k, v) => setPicks(p => ({ ...p, [id]: { ...p[id], [k]: v } }))

  const assign = t => {
    const p = picks[t.id]
    dispatch({ type: 'updateTask', task: { id: t.id, people: [p.who], due: p.due } })
    setDone(d => [...d, t.id])
    notify(`${t.title} → ${staffById[p.who].name} · due ${fmtTime(p.due)}`)
  }
  const rows = [...pending, ...tasks.filter(t => done.includes(t.id))].filter((t, i, a) => a.findIndex(x => x.id === t.id) === i)

  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal rise" style={{ left: 456, top: 96, width: 640, maxHeight: 720, padding: '24px 26px', borderRadius: 32, background: '#f4f7f7', color: 'var(--ink)', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px -30px rgba(0,20,25,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21 }}>{pending.length ? `${pending.length} tasks pending assignment` : 'All tasks assigned'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AiDots size={13} color="var(--teal-2)" /> Suggested person is pre-selected — change who and when, then assign.
            </div>
          </div>
          <button onClick={onClose} style={{ opacity: .5 }} title="Close"><X size={20} /></button>
        </div>

        <div className="scroll" style={{ marginTop: 16, display: 'grid', gap: 10, overflowY: 'auto', paddingRight: 2 }}>
          {rows.map(t => {
            const p = picks[t.id] || { who: t.people[0], due: t.due }
            const isDone = done.includes(t.id)
            const options = suggest(t).slice(0, 8)
            return (
              <div key={t.id} className="rise" style={{ background: isDone ? '#e6f2ef' : '#fff', borderRadius: 22, padding: '14px 16px', boxShadow: '0 8px 20px -16px rgba(0,30,40,.4)', transition: 'background .3s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><MapPin size={11} />{t.location}</div>
                  </div>
                  {isDone ? (
                    <span className="chip" style={{ background: 'var(--teal)', color: '#fff', height: 30, fontSize: 12, padding: '0 12px' }}><Check size={13} /> {staffById[p.who].name} · {fmtTime(p.due)}</span>
                  ) : (
                    <>
                      <label title="Due time" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eef3f3', borderRadius: 999, height: 36, padding: '0 12px' }}>
                        <Clock size={13} color="var(--ink-2)" />
                        <input type="time" value={p.due} onChange={e => set(t.id, 'due', e.target.value)}
                          style={{ border: 0, outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', width: 74, fontFamily: 'inherit' }} />
                      </label>
                      <button className="pill-btn dark" style={{ height: 36, fontSize: 12.5 }} onClick={() => assign(t)}>
                        <UserCheck size={14} /> Assign to {staffById[p.who].name.split(' ')[0]}
                      </button>
                    </>
                  )}
                </div>
                {!isDone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                    {options.map((id, i) => (
                      <button key={id} onClick={() => set(t.id, 'who', id)} title={`${staffById[id].name} · ${staffById[id].note}`}
                        style={{ position: 'relative', transform: p.who === id ? 'scale(1.12)' : 'none', transition: 'transform .2s', opacity: staffById[id].status === 'busy' && p.who !== id ? .6 : 1 }}>
                        <Avatar id={id} size={32} ring={ringColor(staffById[id].status)} style={{ border: p.who === id ? '2px solid var(--teal-deep)' : '2px solid #fff' }} />
                        {i === 0 && <span style={{ position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: '50%', background: 'var(--teal-deep)', display: 'grid', placeItems: 'center' }}><AiDots size={8} /></span>}
                      </button>
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--ink-2)', marginLeft: 6 }}>
                      {staffById[p.who].name} · {staffById[p.who].role}
                      <span style={{ color: { available: '#2f9d62', busy: '#d1513d', break: '#7d8a8c' }[staffById[p.who].status] }}> · {staffById[p.who].note}</span>
                    </span>
                  </div>
                )}
              </div>
            )
          })}
          {!rows.length && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Nothing waiting — every task has an owner.</div>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)' }}><span style={{ color: ringColor('available') }}>●</span> available <span style={{ color: ringColor('busy') }}>●</span> busy <span style={{ color: ringColor('break') }}>●</span> on break</span>
          <button className="pill-btn" style={{ height: 42, background: '#e5ecec', fontSize: 13 }} onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  )
}
