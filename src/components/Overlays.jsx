import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ArrowUp, ClipboardList, User, DoorOpen, GraduationCap, LayoutGrid } from 'lucide-react'
import { useStore, STAFF, TRAINING, BOOKINGS, scheduleStats } from '../data/store'
import { useRole } from './Shell'
import { Avatar, AiDots } from './ui'

/* ───────────── Search (pages, tasks, rooms, staff, training) ───────────── */
export function SearchOverlay() {
  const { setSearchOpen, tasks, rooms } = useStore()
  const role = useRole()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef()
  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => {
    const pages = [
      ['Overview', `/${role}`], ['Rooms', `/${role}/rooms`], ['Floor map', `/${role}/map`], ['Tasks', `/${role}/tasks`],
      ['Training & Procedures', `/${role}/training`], ...(role === 'manager' ? [['Schedule', '/manager/schedule']] : []),
    ].map(([t, to]) => ({ kind: 'Page', icon: LayoutGrid, title: t, to }))
    const all = [
      ...pages,
      ...tasks.map(t => ({ kind: 'Task', icon: ClipboardList, title: t.title, sub: `${t.location} · ${t.due}`, to: `/${role}/tasks?task=${t.id}` })),
      ...rooms.filter(r => !r.hidden).map(r => ({ kind: 'Room', icon: DoorOpen, title: r.name, sub: r.floor, to: `/${role}/rooms?floor=${r.floor}` })),
      ...STAFF.map(s => ({ kind: 'Staff', icon: User, title: s.name, sub: `${s.role} · ${s.note}`, staff: s.id, to: role === 'manager' ? '/manager/schedule' : `/${role}/map` })),
      ...TRAINING.map(t => ({ kind: 'Training', icon: GraduationCap, title: t.title, sub: `${t.mins} min · ${t.kind}`, to: `/${role}/training?play=${t.id}` })),
    ]
    const s = q.trim().toLowerCase()
    return (s ? all.filter(r => (r.title + ' ' + (r.sub || '')).toLowerCase().includes(s)) : all.slice(0, 6)).slice(0, 8)
  }, [q, tasks, rooms, role])

  const go = (to) => { setSearchOpen(false); nav(to) }
  return (
    <>
      <div className="overlay fade" onClick={() => setSearchOpen(false)} />
      <div className="modal paper rise" style={{ left: 476, top: 110, width: 600, padding: 14, borderRadius: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 12px', borderBottom: '1px solid #e2e9ea' }}>
          <Search size={18} color="var(--ink-2)" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search tasks, rooms, staff, training…"
            onKeyDown={e => { if (e.key === 'Enter' && results[0]) go(results[0].to); if (e.key === 'Escape') setSearchOpen(false) }}
            style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--ink)' }} />
          <button onClick={() => setSearchOpen(false)}><X size={18} color="var(--ink-2)" /></button>
        </div>
        <div style={{ paddingTop: 8 }}>
          {results.map((r, i) => (
            <button key={i} onClick={() => go(r.to)} style={{ display: 'flex', width: '100%', gap: 12, alignItems: 'center', padding: '9px 10px', borderRadius: 14, textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e8efef'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {r.staff ? <Avatar id={r.staff} size={30} /> : <span style={{ width: 30, height: 30, borderRadius: 10, background: '#e1eaea', display: 'grid', placeItems: 'center' }}><r.icon size={15} color="var(--ink-2)" /></span>}
              <span style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{r.title}</div>
                {r.sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.sub}</div>}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{r.kind}</span>
            </button>
          ))}
          {!results.length && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No matches for “{q}”.</div>}
        </div>
      </div>
    </>
  )
}

/* ───────────── AI assistant ───────────── */
export function useAssistantReply() {
  const { tasks, schedule } = useStore()
  const unassigned = scheduleStats(schedule).manual
  return (text) => {
    const s = text.toLowerCase()
    const overdue = tasks.filter(t => t.status === 'overdue')
    if (/overdue|late|behind/.test(s))
      return `${overdue.length} tasks are overdue right now: ${overdue.slice(0, 4).map(t => `${t.title} (${t.location})`).join(', ')}. The poolside clean in Hydro pool is the most urgent — Lisa W. is 2 minutes away.`
    if (/assign|who/.test(s))
      return unassigned > 0 ? `${unassigned} bookings are waiting for a therapist. Sofia M. and Lucas T. are free until 13:00 — I'd suggest auto-assign, which balances by skills and current room.` : 'Everything is assigned. Elena J. has the heaviest load today (13 tasks).'
    if (/book|guest|next/.test(s)) {
      const next = BOOKINGS.find(b => b.status !== 'done')
      return `Next up: ${next.guest} — ${next.treatment} at ${next.time} in ${next.room}. 4 more bookings after that, 1 still unassigned.`
    }
    if (/product|kit|stock|cream/.test(s))
      return 'For a Facial Rejuvenation you need the Facial Treatment Kit: Pro-Collagen Marine Cream, Resurfacing Pads, Hydra Serum and a cleansing wash. Check expiry dates and the guest’s allergy notes before opening.'
    if (/step|how|sop|procedure/.test(s))
      return 'Step by step: 1) PPE on and area clear. 2) Match products to the booking. 3) Fresh linen, warm bed to 32°C. 4) Mop and run the purifier. 5) Reset lighting and sign the compliance log.'
    if (/train|course|learn/.test(s))
      return 'Two mandatory modules are open for you: Sound Bath Essentials (18 min) and Treatment Room Setup Standards (20 min). Team completion this quarter is 78%.'
    return 'I can help with today’s tasks, bookings, room status, products and training. Try “what’s overdue?” or “who is free?”.'
  }
}

export function AssistantPanel() {
  const { setAssistantOpen } = useStore()
  const reply = useAssistantReply()
  const [msgs, setMsgs] = useState([{ from: 'ai', text: 'Hi, how can I help today? I’m connected to bookings, tasks, rooms and training.' }])
  const [q, setQ] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef()
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])
  const send = (text) => {
    const t = (text ?? q).trim(); if (!t) return
    setMsgs(m => [...m, { from: 'me', text: t }]); setQ(''); setTyping(true)
    setTimeout(() => { setTyping(false); setMsgs(m => [...m, { from: 'ai', text: reply(t) }]) }, 700)
  }
  return (
    <>
      <div className="overlay fade" onClick={() => setAssistantOpen(false)} />
      <div className="modal deep rise" style={{ right: 40, top: 96, width: 420, height: 690, padding: 22, display: 'flex', flexDirection: 'column', border: '1px solid rgba(95,230,210,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(60,198,181,.18)' }}><AiDots size={20} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>AI Assistant</div>
            <div style={{ fontSize: 11, color: 'var(--teal)' }}>● Connected</div>
          </div>
          <button className="circle-btn sm" onClick={() => setAssistantOpen(false)}><X size={16} /></button>
        </div>
        <div className="scroll" style={{ flex: 1, margin: '18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} className="rise" style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: 18, fontSize: 13, lineHeight: 1.45,
              background: m.from === 'me' ? '#fff' : 'rgba(255,255,255,.08)', color: m.from === 'me' ? 'var(--ink)' : '#fff' }}>{m.text}</div>
          ))}
          {typing && <div style={{ fontSize: 12, opacity: .6 }}>Thinking…</div>}
          <div ref={end} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {['What’s overdue?', 'Who is free?', 'Next booking', 'Step by step'].map(s => (
            <button key={s} className="chip" onClick={() => send(s)} style={{ background: 'rgba(255,255,255,.1)', height: 28, fontSize: 11.5 }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.08)', borderRadius: 999, padding: 6, paddingLeft: 16 }}>
          <AiDots size={18} />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask anything…"
            style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', fontSize: 13 }} />
          <button onClick={() => send()} style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', color: 'var(--ink)', display: 'grid', placeItems: 'center' }}><ArrowUp size={17} /></button>
        </div>
      </div>
    </>
  )
}

/* ───────────── Generic small form modal ───────────── */
export function FormModal({ title, fields, submit = 'Save', onSubmit, onClose }) {
  const [vals, setVals] = useState(Object.fromEntries(fields.map(f => [f.name, f.value ?? (f.options ? f.options[0] : '')])))
  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal paper rise" style={{ left: 556, top: 200, width: 440, padding: 26, borderRadius: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ flex: 1, fontSize: 20, fontWeight: 500 }}>{title}</div>
          <button onClick={onClose}><X size={18} color="var(--ink-2)" /></button>
        </div>
        {fields.map(f => (
          <label key={f.name} style={{ display: 'block', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>{f.label}</div>
            {f.options ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {f.options.map(o => (
                  <button key={o} type="button" onClick={() => setVals(v => ({ ...v, [f.name]: o }))} className="chip"
                    style={{ height: 32, fontSize: 12, padding: '0 14px', background: vals[f.name] === o ? 'var(--teal-dark)' : '#e3eaeb', color: vals[f.name] === o ? '#fff' : 'var(--ink)' }}>{o}</button>
                ))}
              </div>
            ) : (
              <input value={vals[f.name]} placeholder={f.placeholder} onChange={e => setVals(v => ({ ...v, [f.name]: e.target.value }))}
                style={{ width: '100%', height: 44, borderRadius: 14, border: '1px solid #dbe4e5', padding: '0 14px', outline: 'none', color: 'var(--ink)', background: '#fff', fontSize: 14 }} />
            )}
          </label>
        ))}
        <button className="pill-btn dark" style={{ width: '100%', justifyContent: 'center', height: 46, marginTop: 6 }}
          onClick={() => { if (fields.some(f => f.required && !String(vals[f.name]).trim())) return; onSubmit(vals) }}>{submit}</button>
      </div>
    </>
  )
}
