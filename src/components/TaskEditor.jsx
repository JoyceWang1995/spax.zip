import { useMemo, useState } from 'react'
import { ChevronDown, Trash2, Check, X, ListChecks } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore, STAFF, staffById, TEMPLATES, fmtTime, TASK_STATUS, STATUS_ORDER } from '../data/store'
import { Avatar, AiDots } from './ui'
import { useRole } from './Shell'

const DURATIONS = [5, 10, 15, 20, 30, 45, 60]
const PRIORITIES = ['Normal', 'High', 'Urgent']

function nextSlot() {
  const d = new Date()
  const m = d.getMinutes() < 30 ? 30 : 60
  d.setMinutes(m, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

/**
 * One form for both flows in the design:
 *  - mode "assign": a manager dropped a staff avatar on a room card → AI picks a template for the room
 *  - mode "edit":   a task chip was clicked → view and edit the task
 */
export default function TaskEditor({ mode, room, staffId, task, onClose }) {
  const { tasks, dispatch, notify } = useStore()
  const role = useRole()
  const nav = useNavigate()
  const templates = TEMPLATES[room?.type] || TEMPLATES.treatment

  // AI "identifies" the first template that isn't already an open task in this room
  const firstTpl = useMemo(() => {
    const open = tasks.filter(t => t.room === room?.id && t.status !== 'done').map(t => t.title.toLowerCase())
    const i = templates.findIndex(t => !open.includes(t.title.toLowerCase()))
    return Math.max(0, i)
  }, []) // eslint-disable-line
  const [tplIdx, setTplIdx] = useState(firstTpl)
  const tpl = templates[tplIdx]

  const [f, setF] = useState(() => task ? {
    title: task.title,
    date: task.date || today(),
    due: (task.due || '10:00').padStart(5, '0'),
    duration: task.duration || 15,
    priority: task.priority || 'Normal',
    status: task.status,
    checklist: task.steps.map(s => s.title).join('\n'),
    people: task.people,
  } : {
    title: tpl.title, date: today(), due: nextSlot(), duration: tpl.duration, priority: 'Normal', status: 'pending',
    checklist: tpl.steps.join('\n'), people: [staffId],
  })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const applyTemplate = (i) => {
    const t = templates[i]
    setTplIdx(i)
    setF(x => ({ ...x, title: t.title, duration: t.duration, checklist: t.steps.join('\n') }))
  }
  const togglePerson = id => set('people', f.people.includes(id) ? f.people.filter(p => p !== id) : [...f.people, id])

  const steps = f.checklist.split('\n').map(s => s.trim()).filter(Boolean)
  const toSteps = () => steps.map((title, i) => {
    const old = task?.steps.find(s => s.title === title)
    return old || { title, body: i === 0 ? 'Start here and tick off each item as you go.' : 'Follow the checklist for this step.' }
  })
  const first = staffById[f.people[0]]?.name.split(' ')[0]

  const save = () => {
    if (!f.title.trim() || !f.people.length) return
    if (mode === 'assign') {
      dispatch({ type: 'addTask', task: {
        id: 't-' + Date.now(), title: f.title.trim(), room: room.id, location: room.name, due: f.due, date: f.date,
        duration: +f.duration, priority: f.priority, status: f.priority === 'Urgent' ? 'soon' : 'pending', people: f.people, steps: toSteps(), step: 0,
      } })
      notify(`${f.title} assigned to ${first} · ${room.name}`)
    } else {
      dispatch({ type: 'updateTask', task: {
        id: task.id, title: f.title.trim(), location: task.location, due: f.due, date: f.date, duration: +f.duration, priority: f.priority,
        status: f.status, people: f.people, steps: toSteps(),
      } })
      notify(`Task updated · ${TASK_STATUS[f.status].label}`)
    }
    onClose()
  }

  const people = mode === 'assign' ? [staffId] : f.people
  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal rise" onPointerDown={e => e.stopPropagation()}
        style={{ left: 532, top: mode === 'assign' ? 180 : 120, width: 488, padding: '26px 30px 24px', borderRadius: 30, background: '#f4f7f7', color: 'var(--ink)', boxShadow: '0 40px 80px -30px rgba(0,20,25,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21 }}>{room?.name || task?.location}</div>
            {mode === 'edit' && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Task details · {fmtTime(task.due)}{task.repeat ? ` · ${task.repeat}` : ''}</div>}
          </div>
          <div className="stack">{people.slice(0, 3).map(id => <Avatar key={id} id={id} size={42} />)}</div>
          <button onClick={onClose} style={{ marginLeft: 4, opacity: .5 }} title="Close"><X size={18} /></button>
        </div>

        {mode === 'assign' ? (
          <>
            <button onClick={() => applyTemplate((tplIdx + 1) % templates.length)} title="Try another template"
              style={{ width: '100%', marginTop: 18, height: 48, borderRadius: 24, background: 'linear-gradient(90deg, #0b3a40, #1d6b6e)', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12 }}>
              <AiDots size={22} />
              <span style={{ flex: 1, fontSize: 14 }}>Template identified: {tpl.title}</span>
              <ChevronDown size={16} style={{ opacity: .7 }} />
            </button>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', margin: '8px 0 14px' }}>Templates fill the title, checklist and duration. You can adjust the details below.</div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 3, margin: '18px 0 14px', background: '#e5ecec', padding: 4, borderRadius: 999 }}>
            {STATUS_ORDER.map(k => {
              const st = TASK_STATUS[k], on = f.status === k
              return (
                <button key={k} onClick={() => set('status', k)}
                  style={{ flex: k === 'progress' ? 1.25 : 1, height: 34, borderRadius: 999, fontSize: 11.5, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    background: on ? st.color : 'transparent', color: on ? '#fff' : 'var(--ink)', transition: 'background .2s, color .2s' }}>
                  {on ? (k === 'done' && <Check size={12} />) : <span className="dot" style={{ width: 6, height: 6, background: st.color }} />}{st.label}
                </button>
              )
            })}
          </div>
        )}

        <Box label="TASK TITLE"><input value={f.title} onChange={e => set('title', e.target.value)} style={inp} /></Box>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.05fr .9fr .95fr', gap: 6, marginTop: 10 }}>
          <Box label="DATE"><input value={f.date} onChange={e => set('date', e.target.value)} style={inp} /></Box>
          <Box label="DUE TIME"><input type="time" value={f.due} onChange={e => set('due', e.target.value)} style={inp} /></Box>
          <Box label="DURATION">
            <select value={f.duration} onChange={e => set('duration', e.target.value)} style={inp}>
              {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </Box>
          <Box label="PRIORITY">
            <select value={f.priority} onChange={e => set('priority', e.target.value)} style={{ ...inp, color: f.priority === 'Urgent' ? 'var(--red)' : 'var(--ink)' }}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </Box>
        </div>

        {mode === 'edit' && (
          <div style={{ marginTop: 10, background: '#e9efef', borderRadius: 18, padding: '10px 14px' }}>
            <div style={lbl}>ASSIGNED TO</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {STAFF.filter(s => !s.self || f.people.includes(s.id)).map(s => {
                const on = f.people.includes(s.id)
                return (
                  <button key={s.id} onClick={() => togglePerson(s.id)} title={s.name}
                    style={{ position: 'relative', borderRadius: '50%', opacity: on ? 1 : .45, boxShadow: on ? '0 0 0 2px var(--teal)' : 'none', transition: 'opacity .2s' }}>
                    <Avatar id={s.id} size={30} />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 10, borderRadius: 22, padding: '14px 16px', background: 'linear-gradient(180deg, #0b3a40 0%, #1c6266 100%)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, opacity: .75 }}>
            {mode === 'assign' ? <AiDots size={18} /> : <ListChecks size={15} />}
            CHECKLIST{mode === 'assign' ? ' · AI Generated' : ` · ${steps.length} steps`}
          </div>
          <textarea value={f.checklist} onChange={e => set('checklist', e.target.value)} rows={Math.max(3, Math.min(5, steps.length + 1))}
            placeholder="One step per line"
            style={{ width: '100%', marginTop: 10, background: 'transparent', border: 0, outline: 'none', color: '#fff', fontSize: 14.5, lineHeight: 1.6, resize: 'none', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={save} className="pill-btn" disabled={!f.people.length}
            style={{ flex: 1, height: 50, justifyContent: 'center', background: '#5ec1b2', color: '#fff', fontSize: 14, opacity: f.people.length ? 1 : .5 }}>
            {mode === 'assign' ? `Save & assign to ${first}` : 'Save changes'}
          </button>
          {mode === 'edit' && (
            <>
              <button onClick={() => { onClose(); nav(`/${role}/tasks?task=${task.id}`) }} className="pill-btn" style={{ height: 50, background: '#e5ecec', fontSize: 13 }}>Steps</button>
              <button onClick={() => { dispatch({ type: 'deleteTask', id: task.id }); notify('Task deleted'); onClose() }} title="Delete task"
                className="pill-btn" style={{ height: 50, width: 50, padding: 0, justifyContent: 'center', background: '#f6dfd8', color: 'var(--red)' }}><Trash2 size={16} /></button>
            </>
          )}
          <button onClick={onClose} className="pill-btn" style={{ height: 50, padding: '0 26px', background: '#e5ecec', fontSize: 14 }}>Cancel</button>
        </div>
      </div>
    </>
  )
}

const lbl = { fontSize: 9.5, letterSpacing: '.06em', color: 'var(--ink-2)', opacity: .8 }
const inp = { width: '100%', border: 0, outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', padding: 0, marginTop: 4, fontFamily: 'inherit', appearance: 'none', WebkitAppearance: 'none' }
const Box = ({ label, children }) => (
  <label style={{ display: 'block', background: '#e9efef', borderRadius: 18, padding: '10px 12px', minWidth: 0 }}>
    <div style={lbl}>{label}</div>
    {children}
  </label>
)
