import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Play, Plus, Check, ArrowRight, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Page, useRole } from '../../components/Shell'
import { Avatar, AvatarStack, Ring, AiDots } from '../../components/ui'
import { useAssistantReply } from '../../components/Overlays'
import { VideoModal } from './Training'
import { useStore, taskStats, TASK_STATUS } from '../../data/store'

const STATUS_TEXT = Object.fromEntries(Object.entries(TASK_STATUS).map(([k, v]) => [k, [v.caps, v.color]]))
const PER_PAGE = 6

export default function Tasks() {
  const role = useRole()
  const { tasks, dispatch, notify, lastTask } = useStore()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [video, setVideo] = useState(false)

  const visible = useMemo(() => (role === 'manager' ? tasks : tasks.filter(t => t.people.includes('amy'))), [tasks, role])
  const filtered = visible.filter(t => filter === 'all' || t.status === filter)
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  // open on the task in the URL, else the one last edited/assigned, else the design's default
  const selId = params.get('task') || (visible.some(t => t.id === lastTask) ? lastTask : 't-prep')
  const sel = tasks.find(t => t.id === selId) || filtered[0]

  // jump to the page that contains the selected task
  useEffect(() => {
    const idx = filtered.findIndex(t => t.id === selId)
    if (idx >= 0) setPage(Math.floor(idx / PER_PAGE))
  }, [selId, filter]) // eslint-disable-line

  const stats = taskStats(visible)
  const rail = [
    { k: 'all', n: stats.all },
    ...['overdue', 'soon', 'progress', 'pending', 'done'].map(k => ({ k, n: stats[k], c: TASK_STATUS[k].color })),
  ]

  return (
    <Page view="list" bg="light" nav={false}>
      {/* status rail */}
      <div className="abs rise" style={{ left: 83, top: 335, width: 50, padding: '6px 0', borderRadius: 999, background: 'rgba(255,255,255,.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <Ring size={38} stroke={1.5} value={stats.pct / 100} color="#fff" track="rgba(255,255,255,.4)"><span style={{ fontSize: 11 }}>{stats.pct}%</span></Ring>
        {rail.map(r => (
          <button key={r.k} onClick={() => { setFilter(r.k); setPage(0) }} title={r.k === 'all' ? 'All tasks' : TASK_STATUS[r.k].label}
            style={{ position: 'relative', width: 30, height: 30, borderRadius: '50%', fontSize: 10, background: filter === r.k ? '#fff' : 'rgba(255,255,255,.35)', color: filter === r.k ? 'var(--ink)' : '#fff', transition: 'background .2s' }}>
            {r.c && <span className="dot" style={{ position: 'absolute', left: 13, top: -4, width: 5, height: 5, background: r.c }} />}
            {r.n}
          </button>
        ))}
      </div>

      {/* task cards */}
      <div key={filter + page} style={{ position: 'absolute', left: 160, top: 103, display: 'grid', gridTemplateColumns: '230px 230px', gap: 14 }}>
        {filtered.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((t, i) => (
          <TaskCard key={t.id} t={t} selected={sel?.id === t.id} delay={i * 40} onClick={() => setParams({ task: t.id })} />
        ))}
        {!filtered.length && <div className="paper" style={{ gridColumn: '1 / -1', width: 474, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Nothing here — nice work.</div>}
      </div>
      <div className="abs" style={{ left: 160, width: 474, top: 832, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        {pages > 1 && <button onClick={() => setPage(p => Math.max(0, p - 1))} style={{ opacity: .7 }}><ChevronLeft size={14} /></button>}
        {Array.from({ length: pages }, (_, i) => (
          <button key={i} onClick={() => setPage(i)} className="dot" style={{ width: 6, height: 6, background: i === page ? '#fff' : 'rgba(255,255,255,.5)' }} />
        ))}
        {pages > 1 && <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} style={{ opacity: .7 }}><ChevronRight size={14} /></button>}
      </div>

      {sel && <SopPanel key={sel.id} t={sel} onVideo={() => setVideo(true)}
        onComplete={() => {
          const last = sel.step + 1 >= sel.steps.length
          dispatch({ type: 'completeStep', id: sel.id })
          notify(last ? `${sel.title} completed ✓` : `Step ${String(sel.step + 1).padStart(2, '0')} done`)
        }}
        onReopen={() => { dispatch({ type: 'setTaskStatus', id: sel.id, status: 'progress' }); dispatch({ type: 'setStep', id: sel.id, step: 0 }) }}
        onJump={(i) => dispatch({ type: 'setStep', id: sel.id, step: i })} />}
      {sel && <KitPanel t={sel} />}
      {sel && <AiPanel key={'ai' + sel.id} t={sel} />}

      {video && <VideoModal title={`${sel.sopTitle || sel.title} — SOP`} mins={4} onClose={() => setVideo(false)} />}
    </Page>
  )
}

function TaskCard({ t, selected, onClick, delay }) {
  const [label, color] = STATUS_TEXT[t.status]
  const done = t.status === 'done'
  return (
    <button onClick={onClick} className="rise card-link"
      style={{ width: 230, height: 230, borderRadius: 32, padding: '22px 20px', textAlign: 'left', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', animationDelay: `${delay}ms`,
        background: done ? 'rgba(255,255,255,.12)' : selected ? 'rgba(232,238,239,.72)' : '#fff', color: done ? 'rgba(255,255,255,.45)' : 'var(--ink)',
        boxShadow: done ? 'none' : selected ? 'inset 0 0 0 2px rgba(255,255,255,.9)' : '0 18px 30px -20px rgba(0,30,40,.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1 }}><span style={{ fontSize: 11, opacity: .6 }}>Due </span><span style={{ fontSize: 16 }}>{t.due}</span></span>
        {t.repeat && <span style={{ fontSize: 9.5, padding: '6px 8px', borderRadius: 999, border: `1px solid ${done ? 'rgba(255,255,255,.3)' : '#c46a43'}`, color: done ? 'inherit' : '#b5522c' }}>{t.repeat}</span>}
      </div>
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
        {t.people.length > 0 && !done && <div style={{ marginBottom: 6 }}><AvatarStack ids={t.people} size={22} max={3} /></div>}
        <div style={{ fontSize: 20, letterSpacing: '-.01em', lineHeight: 1.15 }}>{t.title}</div>
        <div style={{ fontSize: 13, opacity: .45, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}><MapPin size={12} />{t.location}</div>
        <div style={{ fontSize: 10, letterSpacing: '.1em', fontWeight: 600, color, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, opacity: done ? .6 : 1 }}>
          <span className="dot" style={{ width: 5, height: 5, background: color }} />{label}
        </div>
      </div>
    </button>
  )
}

function SopPanel({ t, onComplete, onJump, onVideo, onReopen }) {
  const done = t.status === 'done'
  return (
    <div className="abs rise" style={{ left: 647, top: 103, width: 296, height: 720, borderRadius: 34, padding: 11, background: 'rgba(255,255,255,.28)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '22px 12px 12px', position: 'relative' }}>
        <div style={{ fontSize: 20, lineHeight: 1.4, width: 170 }}>{t.sopTitle || t.title}</div>
        <div style={{ fontSize: 12, opacity: .55, marginTop: 6 }}>{t.location}</div>
        {t.booking && <div style={{ fontSize: 12, opacity: .55, marginTop: 10 }}>{t.booking.replace(' · ', '-')}</div>}
        <button onClick={onVideo} style={{ position: 'absolute', right: 0, top: 21, width: 64, height: 54, borderRadius: 27, background: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Play size={9} fill="var(--ink)" /> Video
        </button>
      </div>
      <div className="scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 12 }}>
        {t.steps.map((s, i) => {
          const current = i === t.step && !done
          const complete = i < t.step || done
          if (current) {
            return (
              <div key={i} className="rise" style={{ background: 'rgba(255,255,255,.3)', borderRadius: 28, padding: '20px 16px', minHeight: 170 }}>
                <div style={{ fontSize: 9, letterSpacing: '.06em', opacity: .6 }}>{String(i + 1).padStart(2, '0')}  &nbsp;CURRENT STEP</div>
                <div style={{ fontSize: 16, lineHeight: 1.5, marginTop: 6, width: 200 }}>{s.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 10, opacity: .8 }}>{s.body}</div>
              </div>
            )
          }
          return (
            <button key={i} onClick={() => onJump(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '0 22px 0 14px', borderRadius: 32, background: 'rgba(255,255,255,.3)', textAlign: 'left', opacity: complete ? .65 : 1 }}>
              <span style={{ fontSize: 10, opacity: .6, width: 14 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.35, textDecoration: complete ? 'line-through' : 'none' }}>{s.title}</span>
              {complete ? <Check size={15} color="var(--green)" /> : <Plus size={15} />}
            </button>
          )
        })}
      </div>
      {done ? (
        <button onClick={onReopen} className="pill-btn" style={{ height: 64, justifyContent: 'center', background: 'var(--teal)', color: '#fff', borderRadius: 32, flex: 'none' }}>
          <Check size={16} /> Completed · <RotateCcw size={13} /> Reopen
        </button>
      ) : (
        <button onClick={onComplete} className="pill-btn" style={{ height: 64, justifyContent: 'center', background: 'var(--teal-deep)', color: '#fff', borderRadius: 32, flex: 'none' }}>
          {t.step + 1 >= t.steps.length ? 'Finish task' : 'Complete step'} <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

const PILL_W = 112, PILL_STEP = 100          // pill width, distance between pills (they overlap 12px like the design)
const KIT_W = 358, KIT_PAD = (KIT_W - PILL_W) / 2   // side padding so any product can sit in the centre

function KitPanel({ t }) {
  const kit = t.kit
  const strip = useRef(null)
  const drag = useRef(null)
  const moved = useRef(false)
  const [active, setActive] = useState(1)
  const [grabbing, setGrabbing] = useState(false)

  // start with the second product centred, as in the design
  useEffect(() => { if (strip.current) strip.current.scrollLeft = PILL_STEP }, [t.id])

  const centre = (i, smooth = true) => strip.current?.scrollTo({ left: i * PILL_STEP, behavior: smooth ? 'smooth' : 'auto' })
  const onScroll = () => {
    const el = strip.current
    setActive(Math.max(0, Math.min(kit.items.length - 1, Math.round(el.scrollLeft / PILL_STEP))))
  }
  const scale = () => strip.current.getBoundingClientRect().width / KIT_W
  const onDown = e => {
    if (e.button !== 0) return
    moved.current = false
    drag.current = { x: e.clientX, sl: strip.current.scrollLeft, id: e.pointerId, lastX: e.clientX, v: 0 }
  }
  const onMove = e => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.x) / scale()
    if (!moved.current) {
      if (Math.abs(dx) < 4) return
      moved.current = true
      setGrabbing(true)
      strip.current.setPointerCapture?.(d.id)
    }
    d.v = (e.clientX - d.lastX) / scale(); d.lastX = e.clientX
    strip.current.scrollLeft = d.sl - dx
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!moved.current) return
    setGrabbing(false)
    // flick: carry a little momentum, then settle on the nearest product
    const target = strip.current.scrollLeft - d.v * 6
    centre(Math.max(0, Math.min(kit.items.length - 1, Math.round(target / PILL_STEP))))
  }
  const onWheel = e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) strip.current.scrollLeft += e.deltaY
  }

  return (
    <div className="abs rise" style={{ left: 955, top: 103, width: KIT_W, height: 335, borderRadius: 34, background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', overflow: 'hidden', animationDelay: '80ms' }}>
      <div style={{ textAlign: 'center', fontSize: 15, marginTop: 18 }}>{kit ? kit.name : 'Kit & products'}</div>
      {kit ? (
        <>
          <div ref={strip} className="scroll" onScroll={onScroll}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
            style={{ marginTop: 12, height: 172, display: 'flex', overflowX: 'auto', overflowY: 'hidden', padding: `0 ${KIT_PAD}px`,
              cursor: grabbing ? 'grabbing' : 'grab', touchAction: 'pan-y', userSelect: 'none',
              scrollSnapType: grabbing ? 'none' : 'x mandatory' }}>
            {kit.items.map((item, i) => (
              <button key={item.name} onClick={() => !moved.current && centre(i)} title={item.name}
                style={{ flex: 'none', width: PILL_W, height: 168, marginLeft: i ? PILL_STEP - PILL_W : 0, borderRadius: 56, scrollSnapAlign: 'center',
                  background: i === active ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.22)', display: 'grid', placeItems: 'center',
                  transform: `scale(${i === active ? 1 : 0.94})`, transition: 'transform .3s, background .3s' }}>
                <img src={item.img} alt={item.name} draggable={false}
                  style={{ maxWidth: 88, maxHeight: 118, objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 10px 12px rgba(0,30,40,.18))' }} />
              </button>
            ))}
          </div>
          <div key={active} className="fade" style={{ textAlign: 'center', fontSize: 10, marginTop: 14, opacity: .85 }}>
            {kit.items[active].name}<span style={{ opacity: .6 }}> · {kit.items[active].qty}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
            {kit.items.map((_, i) => (
              <button key={i} onClick={() => centre(i)} className="dot" style={{ width: i === active ? 14 : 5, height: 5, borderRadius: 3, background: i === active ? '#fff' : 'rgba(255,255,255,.5)', transition: 'width .3s' }} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <span style={{ background: '#fff', color: 'var(--ink)', fontSize: 12, padding: '12px 16px', borderRadius: 999 }}>{kit.items.length} Items</span>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', height: 250, textAlign: 'center', opacity: .85 }}>
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><Check size={22} /></div>
            <div style={{ fontSize: 13 }}>No products needed for this task</div>
            <div style={{ fontSize: 11, opacity: .7, marginTop: 4 }}>Standard cleaning caddy in {t.location}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function AiPanel({ t }) {
  const reply = useAssistantReply()
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState(null)
  const [mode, setMode] = useState('step')
  const step = t.steps[Math.min(t.step, t.steps.length - 1)]
  const pairs = step.ai || [['This step', step.body], ['Good to know', 'Log anything unusual with a photo or voice note — I’ll route it to the right person.']]

  const ask = () => {
    if (!q.trim()) return
    setAnswer({ q, a: '…' }); const text = q; setQ('')
    setTimeout(() => setAnswer({ q: text, a: reply(text) }), 600)
  }
  return (
    <>
      <div className="abs deep rise" style={{ left: 952, top: 445, width: 362, height: 292, borderRadius: 34, padding: '22px 22px', animationDelay: '120ms', boxShadow: '0 0 0 1px rgba(255,255,255,.12), 0 30px 50px -24px rgba(0,30,35,.8)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ flex: 1 }}><AiDots size={26} /></span>
          <button onClick={() => { setAnswer(null); setMode(m => m === 'all' ? 'step' : 'all') }} style={{ fontSize: 9.5, opacity: .6, marginTop: 20 }}>{mode === 'all' ? 'Back to current step' : 'Tell me step by step'}</button>
        </div>
        <div key={mode + (answer?.a || '') + t.step} className="fade scroll" style={{ marginTop: 22, height: 176, fontSize: 12, lineHeight: 1.5 }}>
          {answer ? (
            <>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{answer.q}</div>
              <div style={{ opacity: .85, marginTop: 4 }}>{answer.a}</div>
            </>
          ) : mode === 'all' ? (
            t.steps.map((s, i) => <div key={i} style={{ marginBottom: 6, opacity: i < t.step ? .5 : 1 }}><b style={{ fontWeight: 500 }}>{i + 1}. {s.title}.</b> <span style={{ opacity: .8 }}>{s.body}</span></div>)
          ) : (
            <>
              {pairs.map(([h, b]) => (
                <div key={h} style={{ marginBottom: 6 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{h}</div><div style={{ opacity: .85 }}>{b}</div></div>
              ))}
              <button style={{ fontSize: 11, opacity: .6, marginTop: 8, display: 'flex', alignItems: 'center', gap: 3 }}>View treatment protocol <ArrowUpRight size={11} /></button>
            </>
          )}
        </div>
      </div>
      <div className="abs rise" style={{ left: 952, top: 745, width: 362, height: 78, borderRadius: 39, background: 'var(--teal-deep)', display: 'flex', alignItems: 'center', padding: '0 7px 0 24px', gap: 16, animationDelay: '160ms' }}>
        <AiDots size={24} />
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="Ask About This Task..."
          style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', fontSize: 15 }} />
        <button onClick={ask} style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', color: 'var(--ink)', display: 'grid', placeItems: 'center' }}><ArrowUp size={20} /></button>
      </div>
    </>
  )
}
