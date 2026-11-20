import { staffById } from '../data/store'

export function Avatar({ id, src, size = 28, ring, style, title }) {
  const s = id ? staffById[id] : null
  return (
    <img
      className="av"
      src={src || s?.photo}
      alt={title || s?.name || ''}
      title={title || s?.name}
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined, ...style }}
    />
  )
}

export function AvatarStack({ ids = [], size = 30, max = 3, extra = 0, moreStyle }) {
  const shown = ids.slice(0, max)
  const rest = ids.length - shown.length + extra
  return (
    <div className="stack">
      {shown.map(id => <Avatar key={id} id={id} size={size} />)}
      {rest > 0 && <div className="more" style={{ width: size, height: size, ...moreStyle }}>{rest}</div>}
    </div>
  )
}

// staff status ring: green = available, red = busy, grey = on break
export const ringColor = (status) => ({ available: '#5fcf8a', busy: '#ef6b55', break: '#aab4b6' }[status] || 'transparent')

/** Circular progress ring. value 0..1 */
export function Ring({ size = 40, stroke = 3, value = 0.35, color = '#fff', track = 'rgba(255,255,255,.25)', children, style }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - value)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  )
}

/** Thin progress bar */
export function Bar({ value, color = '#fff', track = 'rgba(255,255,255,.25)', h = 4, style }) {
  return (
    <div style={{ height: h, borderRadius: h, background: track, overflow: 'hidden', ...style }}>
      <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: color, borderRadius: h, transition: 'width .6s ease' }} />
    </div>
  )
}

/** The 9-dot "AI" glyph used across the design */
export function AiDots({ size = 26, color = '#fff' }) {
  const dots = []
  const pattern = [
    [0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0],
  ]
  const g = size / 5
  pattern.forEach((row, y) => row.forEach((on, x) => {
    if (!on) return
    const big = (x > 0 && x < 4 && y > 0 && y < 4)
    dots.push(<circle key={`${x}${y}`} cx={x * g + g / 2} cy={y * g + g / 2} r={big ? g * 0.32 : g * 0.22} fill={color} opacity={big ? 1 : 0.7} />)
  }))
  return <svg width={size} height={size}>{dots}</svg>
}

export function StatusDot({ status }) {
  const c = { overdue: 'var(--red)', soon: 'var(--amber)', progress: 'var(--green)', pending: '#9aa', done: '#9aa', ontrack: 'var(--green)' }[status]
  return <span className="dot" style={{ background: c }} />
}
