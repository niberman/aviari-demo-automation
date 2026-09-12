import { useEffect, useRef, useState, type ReactNode } from 'react'
import { dismissToast, useDemo } from './demo/store'
import { AlertIcon, CheckIcon, InboxIcon, XIcon } from './icons'

// Adds a brief highlight when a watched value changes between renders.
export function useFlash(value: unknown): string {
  const prev = useRef(value)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value
      setOn(true)
      const t = window.setTimeout(() => setOn(false), 900)
      return () => window.clearTimeout(t)
    }
  }, [value])
  return on ? ' flash' : ''
}

export function Sparkbars({ values, label }: { values: number[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...values, 1)
  const n = values.length
  const gap = 2
  const w = 100
  const bw = (w - gap * (n - 1)) / n
  return (
    <div className="spark">
      <svg viewBox={`0 0 ${w} 30`} preserveAspectRatio="none" role="img" aria-label={label}>
        {values.map((v, i) => {
          const h = Math.max((v / max) * 27, 1.2)
          return (
            <rect
              key={i}
              x={i * (bw + gap)}
              y={30 - h}
              width={bw}
              height={h}
              rx={1.1}
              fill={hover === i ? '#8fd0ff' : '#4FB3FF'}
              opacity={hover === null || hover === i ? 1 : 0.45}
              style={{ transition: 'opacity 180ms ease-out, fill 180ms ease-out' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
        <line x1="0" y1="30" x2={w} y2="30" stroke="rgba(230,237,243,0.12)" strokeWidth="0.6" />
      </svg>
      {hover !== null && (
        <div className="spark-tip" style={{ left: `${((hover + 0.5) / n) * 100}%` }}>
          {hourLabel(hover)} · ${values[hover]}
        </div>
      )}
      <div className="axis" aria-hidden="true">
        <span>6a</span>
        <span>9a</span>
        <span>12p</span>
        <span>3p</span>
      </div>
    </div>
  )
}

function hourLabel(i: number): string {
  const h = 6 + i
  return h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`
}

export function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="switch"
      onClick={onToggle}
    />
  )
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  counts,
  ariaLabel,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  counts?: Partial<Record<T, number>>
  ariaLabel: string
}) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
          {counts && counts[o.id] !== undefined && <span className="count">{counts[o.id]}</span>}
        </button>
      ))}
    </div>
  )
}

export function ToastStack() {
  const { toasts } = useDemo()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={('toast ' + (t.kind === 'accent' ? '' : t.kind) + (t.leaving ? ' leaving' : '')).trim()}>
          {t.kind === 'warn' ? <AlertIcon size={16} /> : t.kind === 'ok' ? <CheckIcon size={16} /> : <InboxIcon size={16} />}
          <div>
            <div className="t-title">{t.title}</div>
            {t.body && <div className="t-body">{t.body}</div>}
          </div>
          <button type="button" className="t-x" aria-label="Dismiss notification" onClick={() => dismissToast(t.id)}>
            <XIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function Empty({ icon, text, hint }: { icon: ReactNode; text: string; hint?: string }) {
  return (
    <div className="empty">
      {icon}
      <div>{text}</div>
      {hint && <div style={{ fontSize: 12, opacity: 0.8 }}>{hint}</div>}
    </div>
  )
}
