import { useState } from 'react'
import { X, Check, CalendarPlus } from 'lucide-react'
import { useStore, staffById, therapistOptions } from '../data/store'
import { Avatar, AiDots, ringColor } from './ui'

export const TREATMENTS = [
  'Deep Tissue Massage', 'Swedish Massage', 'Aromatherapy Massage', 'Hot Stone Therapy', 'Sports Recovery',
  'Facial Rejuvenation', 'Hydrating Facial', 'Cryotherapy', 'Prenatal Massage', 'Couple’s Ritual',
]
const endOf = h => `${String(+h.slice(0, 2) + 1).padStart(2, '0')}:00`

/** New booking in a free calendar slot: client, treatment, requirements, then a therapist (yours or the AI's pick) */
export default function NewBooking({ hour, roomIdx, roomLabel, onClose, onCreated }) {
  const { schedule, dispatch, notify } = useStore()
  const [guest, setGuest] = useState('')
  const [treatment, setTreatment] = useState(TREATMENTS[0])
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState('ai') // 'ai' | 'choose'
  const options = therapistOptions(schedule, hour, roomIdx, treatment)
  const free = options.filter(o => o.free)
  const aiPick = free[0]
  const [pick, setPick] = useState(null)
  const chosen = mode === 'ai' ? aiPick?.id : (pick && free.some(o => o.id === pick) ? pick : null)
  const ok = guest.trim() && chosen

  const create = () => {
    if (!ok) return
    dispatch({ type: 'addBooking', hour, room: roomIdx, booking: {
      guest: guest.trim(), treatment, notes: notes.trim(), therapist: chosen, state: mode === 'ai' ? 'ai' : 'assigned', due: false,
    } })
    notify(`${guest.trim()} booked · ${treatment} · ${hour} ${roomLabel} with ${staffById[chosen].name}`)
    onCreated?.()
    onClose()
  }

  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal rise" style={{ left: 516, top: 92, width: 520, padding: '24px 28px', borderRadius: 30, background: '#f4f7f7', color: 'var(--ink)', boxShadow: '0 40px 80px -30px rgba(0,20,25,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21 }}>New booking</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{roomLabel} · {hour}–{endOf(hour)} · 60 min</div>
          </div>
          <button onClick={onClose} style={{ opacity: .5 }} title="Close"><X size={18} /></button>
        </div>

        <Box label="CLIENT NAME" style={{ marginTop: 16 }}>
          <input autoFocus value={guest} onChange={e => setGuest(e.target.value)} placeholder="e.g. Olivia Grant" style={inp} />
        </Box>

        <div style={{ ...lbl, margin: '14px 0 6px 4px' }}>TREATMENT</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TREATMENTS.map(t => (
            <button key={t} onClick={() => { setTreatment(t); setPick(null) }} className="chip"
              style={{ height: 30, fontSize: 12, padding: '0 12px', background: treatment === t ? 'var(--teal-deep)' : '#e5ecec', color: treatment === t ? '#fff' : 'var(--ink)', transition: 'background .2s' }}>{t}</button>
          ))}
        </div>

        <Box label="SPECIAL REQUIREMENTS" style={{ marginTop: 14 }}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Allergies, pregnancy, pressure preference, accessibility…"
            style={{ ...inp, resize: 'none', lineHeight: 1.45 }} />
        </Box>

        <div style={{ ...lbl, margin: '14px 0 6px 4px' }}>THERAPIST</div>
        <div style={{ display: 'flex', gap: 4, background: '#e5ecec', padding: 4, borderRadius: 999 }}>
          {[['ai', 'Let AI assign'], ['choose', 'Choose staff']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{ flex: 1, height: 34, borderRadius: 999, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: mode === k ? '#fff' : 'transparent' }}>
              {k === 'ai' && <AiDots size={13} color="var(--teal-deep)" />}{l}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, background: '#e9efef', borderRadius: 18, padding: '12px 14px', minHeight: 64 }}>
          {mode === 'ai' ? (
            aiPick ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar id={aiPick.id} size={36} ring={ringColor(staffById[aiPick.id].status)} style={{ border: '2px solid #fff' }} />
                <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                  <b style={{ fontWeight: 600 }}>{staffById[aiPick.id].name}</b> · {staffById[aiPick.id].role}
                  <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{aiPick.skilled ? `Trained in ${treatment.toLowerCase()}` : 'Closest available match'} · free {hour}–{endOf(hour)}</div>
                </div>
              </div>
            ) : <div style={{ fontSize: 12.5, color: 'var(--red)' }}>Nobody is free at {hour} — try another slot.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {options.map(o => (
                  <button key={o.id} onClick={() => o.free && setPick(o.id)} disabled={!o.free}
                    title={`${staffById[o.id].name}${o.skilled ? ' · trained' : ''}${o.free ? '' : ` · booked at ${hour}`}`}
                    style={{ position: 'relative', opacity: o.free ? 1 : .3, transform: chosen === o.id ? 'scale(1.12)' : 'none', transition: 'transform .2s' }}>
                    <Avatar id={o.id} size={34} ring={ringColor(staffById[o.id].status)} style={{ border: chosen === o.id ? '2px solid var(--teal-deep)' : '2px solid #fff' }} />
                    {o.skilled && <span style={{ position: 'absolute', right: -2, bottom: -2, width: 13, height: 13, borderRadius: '50%', background: 'var(--teal)', display: 'grid', placeItems: 'center' }}><Check size={8} color="#fff" /></span>}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 8 }}>
                {chosen ? `${staffById[chosen].name} · ${staffById[chosen].role}` : 'Pick a therapist'} <span style={{ color: 'var(--muted)' }}>· ✓ = trained for this treatment, faded = already booked</span>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="pill-btn" disabled={!ok} onClick={create}
            style={{ flex: 1, height: 48, justifyContent: 'center', background: '#5ec1b2', color: '#fff', fontSize: 14, opacity: ok ? 1 : .5 }}>
            <CalendarPlus size={16} /> Create booking{chosen ? ` with ${staffById[chosen].name.split(' ')[0]}` : ''}
          </button>
          <button className="pill-btn" onClick={onClose} style={{ height: 48, padding: '0 24px', background: '#e5ecec', fontSize: 14 }}>Cancel</button>
        </div>
      </div>
    </>
  )
}

const lbl = { fontSize: 9.5, letterSpacing: '.06em', color: 'var(--ink-2)', opacity: .85 }
const inp = { width: '100%', border: 0, outline: 'none', background: 'transparent', fontSize: 14.5, color: 'var(--ink)', padding: 0, marginTop: 4, fontFamily: 'inherit' }
const Box = ({ label, children, style }) => (
  <label style={{ display: 'block', background: '#e9efef', borderRadius: 18, padding: '10px 14px', ...style }}>
    <div style={lbl}>{label}</div>
    {children}
  </label>
)
