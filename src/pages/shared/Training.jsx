import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Pause, Plus, Search, Heart, X, Check, SlidersHorizontal, Volume2, Maximize2 } from 'lucide-react'
import { Page, useRole } from '../../components/Shell'
import { Bar } from '../../components/ui'
import { FormModal } from '../../components/Overlays'
import { useStore, TRAINING } from '../../data/store'

const CATS = ['All', 'Sanitisation', 'Hospitality', 'Therapy tech', 'Quiz']
const PER_PAGE = 7

export default function Training() {
  const role = useRole()
  const { liked, dispatch, notify } = useStore()
  const [params, setParams] = useSearchParams()
  const [cat, setCat] = useState('All')
  const [mandatory, setMandatory] = useState(false)
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(0)
  const [extra, setExtra] = useState([])
  const [add, setAdd] = useState(false)
  const [progress, setProgress] = useState(() => Object.fromEntries(TRAINING.map(t => [t.id, t.progress])))

  const all = [...TRAINING.filter(t => t.id !== 'sound'), ...extra]
  const list = all.filter(t => (cat === 'All' || t.group === cat) && (!mandatory || t.kind === 'Mandatory') && t.title.toLowerCase().includes(q.toLowerCase()))
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const playing = [...TRAINING, ...extra].find(t => t.id === params.get('play'))

  return (
    <Page back notice={false} nav="collapsed" bar="minimal">
      <div className="abs rise" style={{ left: 120, top: 70, display: 'flex', alignItems: 'center', gap: 6, height: 40 }}>
        <span style={{ fontSize: 19 }}>Training &amp; Procedures</span>
        <span style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,.4)', display: 'grid', placeItems: 'center', fontSize: 10 }}>{list.length}</span>
      </div>

      <div className="abs" style={{ left: 520, top: 70, display: 'flex', gap: 2 }}>
        {CATS.map(c => (
          <button key={c} onClick={() => { setCat(c); setPage(0) }} className="chip"
            style={{ height: 40, padding: c === 'All' ? '0 14px' : '0 8px', fontSize: 9.5, background: c === cat ? '#fff' : 'rgba(255,255,255,.18)', color: c === cat ? 'var(--ink)' : '#fff', minWidth: 40, justifyContent: 'center' }}>{c}</button>
        ))}
      </div>

      <div className="abs" style={{ left: 976, top: 70, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="chip" onClick={() => setMandatory(m => !m)} style={{ height: 40, padding: '0 14px', fontSize: 9.5, background: mandatory ? 'var(--teal)' : '#fff', color: mandatory ? '#fff' : 'var(--ink)' }}>
          {mandatory ? <><SlidersHorizontal size={11} /> Mandatory</> : 'Filters'}
        </button>
        {searching ? (
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setPage(0) }} onBlur={() => !q && setSearching(false)} placeholder="Search training…" className="field" style={{ width: 180 }} />
        ) : (
          <button className="circle-btn" style={{ width: 40, height: 40, background: 'transparent', border: '1px solid rgba(255,255,255,.4)' }} onClick={() => setSearching(true)}><Search size={15} /></button>
        )}
      </div>


      <div key={cat + mandatory + q + page} style={{ position: 'absolute', left: 244, top: 217, display: 'grid', gridTemplateColumns: 'repeat(4, 232px)', gap: 24 }}>
        {list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((t, i) => (
          <TrainingCard key={t.id} t={t} delay={i * 45} liked={liked[t.id]} progress={progress[t.id] || 0}
            onLike={() => dispatch({ type: 'toggleLike', id: t.id })} onOpen={() => setParams({ play: t.id })} />
        ))}
        <button className="glass soft card-link rise" onClick={() => setAdd(true)} style={{ width: 232, height: 232, textAlign: 'center', animationDelay: '300ms' }}>
          <Plus size={20} strokeWidth={1.5} />
          <div style={{ fontSize: 11, marginTop: 8 }}>{role === 'manager' ? 'Add A Training Video' : 'Request A Training'}</div>
        </button>
      </div>

      <div className="abs" style={{ left: 0, right: 0, top: 786, display: 'flex', justifyContent: 'center', gap: 9 }}>
        {Array.from({ length: Math.max(pages, 1) }, (_, i) => (
          <button key={i} onClick={() => setPage(i)} className="dot" style={{ width: 6, height: 6, background: i === page ? '#fff' : 'rgba(255,255,255,.45)' }} />
        ))}
      </div>

      {playing && <VideoModal title={playing.title} mins={playing.mins} poster={playing.image} start={progress[playing.id] || 0}
        onProgress={p => setProgress(v => ({ ...v, [playing.id]: Math.max(v[playing.id] || 0, p) }))}
        onDone={() => { setProgress(v => ({ ...v, [playing.id]: 1 })); notify(`${playing.title} completed · +40 pts`) }}
        onClose={() => setParams({})} />}
      {add && (
        <FormModal title={role === 'manager' ? 'Add a training video' : 'Request a training'} submit={role === 'manager' ? 'Publish' : 'Send request'} onClose={() => setAdd(false)}
          fields={[
            { name: 'title', label: 'Title', placeholder: 'e.g. Steam Room Safety', required: true },
            { name: 'group', label: 'Category', options: CATS.slice(1) },
            { name: 'kind', label: 'Type', options: ['Selective', 'Mandatory'] },
          ]}
          onSubmit={v => {
            if (role === 'manager') setExtra(x => [...x, { id: 'x' + Date.now(), title: v.title, cat: v.group, group: v.group, kind: v.kind, mins: 10, image: null }])
            setAdd(false); notify(role === 'manager' ? `${v.title} published to the team` : 'Request sent to your manager')
          }} />
      )}
    </Page>
  )
}

function TrainingCard({ t, onOpen, onLike, liked, delay, progress }) {
  const Badge = (
    <span className="chip" style={{ height: 26, padding: '0 12px', fontSize: 8, background: t.kind === 'Mandatory' ? 'var(--teal)' : 'rgba(255,255,255,.22)' }}>{t.kind}</span>
  )
  if (!t.image) {
    const video = t.id === 'cryo'
    return (
      <div className="glass card-link rise" onClick={onOpen} style={{ width: 232, height: 232, position: 'relative', animationDelay: `${delay}ms`, background: 'rgba(255,255,255,.06)' }}>
        <div style={{ position: 'absolute', left: 26, right: 18, top: 18, display: 'flex', alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 10, opacity: video ? .4 : 1 }}>{t.mins} Min</span>
          {video ? <button onClick={e => { e.stopPropagation(); onLike() }}><Heart size={16} color="#ff5b5b" fill={liked ? '#ff5b5b' : 'none'} /></button> : Badge}
        </div>
        {video ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><Play size={14} fill="var(--ink)" color="var(--ink)" /></span>
              <div style={{ fontSize: 15, lineHeight: 1.25 }}>Cryotherapy<br />Equipment</div>
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', right: 18, bottom: 26, textAlign: 'right' }}>
            <div style={{ fontSize: 8, letterSpacing: '.08em', opacity: .6 }}>{t.cat}</div>
            <div style={{ fontSize: 19, lineHeight: 1.25, marginTop: 2 }}>{t.title.split(' & ').length > 1 ? <>{t.title.split(' & ')[0]} &amp; Client<br />Privacy</> : t.title}</div>
          </div>
        )}
        <Progress p={progress} />
      </div>
    )
  }
  return (
    <button className="card-link rise" onClick={onOpen} style={{ width: 232, height: 232, borderRadius: 30, overflow: 'hidden', position: 'relative', textAlign: 'right', animationDelay: `${delay}ms`, boxShadow: '0 20px 40px -22px rgba(0,0,0,.7)' }}>
      <img src={t.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 45%, rgba(25,15,10,.55) 100%)' }} />
      <div style={{ position: 'absolute', left: 26, right: 18, top: 16, display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1, fontSize: 10, textAlign: 'left' }}>{t.mins} Min</span>{Badge}
      </div>
      <div style={{ position: 'absolute', right: 18, left: 18, bottom: 22 }}>
        <div style={{ fontSize: 8, letterSpacing: '.08em', opacity: .75 }}>{t.cat}</div>
        <div style={{ fontSize: 19, lineHeight: 1.25, marginTop: 2 }}>{t.title}</div>
      </div>
      <Progress p={progress} />
    </button>
  )
}
const Progress = ({ p }) => p > 0 ? (
  <div style={{ position: 'absolute', left: 22, right: 22, bottom: 10, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,.25)' }}>
    <div style={{ width: `${p * 100}%`, height: '100%', borderRadius: 2, background: p >= 1 ? 'var(--teal)' : '#fff' }} />
  </div>
) : null

/** Mock video player used by training cards and SOP "Video" buttons */
export function VideoModal({ title, mins = 5, poster, start = 0, onClose, onProgress, onDone }) {
  const [playing, setPlaying] = useState(true)
  const [p, setP] = useState(start >= 1 ? 0 : start)
  const total = mins * 60
  useEffect(() => {
    if (!playing) return
    // playback is sped up 20× so the demo moves visibly
    const t = setInterval(() => setP(x => {
      const n = Math.min(1, x + 20 / total / 10)
      if (n >= 1) { setPlaying(false); onDone?.() }
      return n
    }), 100)
    return () => clearInterval(t)
  }, [playing, total]) // eslint-disable-line
  useEffect(() => { onProgress?.(p) }, [Math.round(p * 20)]) // eslint-disable-line
  const cur = Math.round(p * total)
  return (
    <>
      <div className="overlay fade" onClick={onClose} />
      <div className="modal rise" style={{ left: 336, top: 140, width: 880, height: 560, borderRadius: 34, overflow: 'hidden', background: '#0b2327', boxShadow: '0 40px 80px -30px rgba(0,0,0,.8)' }}>
        {poster ? <img src={poster} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(1px) brightness(.8)' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, #1f6d6d, #0b2327)' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,.7))' }} />
        <div style={{ position: 'absolute', left: 30, top: 26, right: 26, display: 'flex', alignItems: 'center', zIndex: 2 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: .7, letterSpacing: '.1em' }}>TRAINING · {mins} MIN</div>
            <div style={{ fontSize: 24, marginTop: 4 }}>{title}</div>
          </div>
          <button className="circle-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <button onClick={() => { if (p >= 1) setP(0); setPlaying(v => !v) }} style={{ zIndex: 2, position: 'absolute', left: 400, top: 240, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.9)', color: 'var(--ink)', display: 'grid', placeItems: 'center', opacity: playing ? 0 : 1, transition: 'opacity .3s' }}>
          <Play size={26} fill="var(--ink)" />
        </button>
        <div style={{ position: 'absolute', inset: 0 }} onClick={() => setPlaying(v => !v)} />
        <div style={{ position: 'absolute', left: 30, right: 30, bottom: 26, zIndex: 2 }}>
          {p >= 1 && (
            <div className="rise" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: 'rgba(255,255,255,.14)', backdropFilter: 'blur(14px)', padding: '12px 16px', borderRadius: 18 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--teal)', display: 'grid', placeItems: 'center' }}><Check size={16} /></span>
              <span style={{ flex: 1, fontSize: 14 }}>Module complete — a 3-question check is ready.</span>
              <button className="pill-btn white" onClick={onClose}>Take quiz</button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setPlaying(v => !v)} style={{ position: 'relative', zIndex: 1 }}>{playing ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" />}</button>
            <span style={{ fontSize: 12, opacity: .8, width: 86 }}>{fmt(cur)} / {fmt(total)}</span>
            <div style={{ flex: 1, position: 'relative', zIndex: 1, cursor: 'pointer' }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setP((e.clientX - r.left) / r.width) }}>
              <Bar value={p} color="var(--teal)" track="rgba(255,255,255,.3)" h={4} />
            </div>
            <Volume2 size={17} /><Maximize2 size={16} />
          </div>
        </div>
      </div>
    </>
  )
}
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
