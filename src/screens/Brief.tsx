import type { CSSProperties } from 'react'
import { Empty, Sparkbars, useFlash } from '../components'
import { fmtMoney, fmtTime, type LocId } from '../demo/seed'
import { draftReorder, gapCovered, openThread, useDemo } from '../demo/store'
import { Link, navigate } from '../router'
import { AlertIcon, ArrowDown, ArrowUp, CheckIcon, CloudSun } from '../icons'

const DENVER = 'America/Denver'

export default function Brief() {
  const s = useDemo()
  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: DENVER,
  })

  const below = s.items
    .filter((i) => i.onHand < i.par)
    .sort((a, b) => a.onHand / a.par - b.onHand / b.par)
  const topMsgs = s.threads.filter((t) => t.category === 'reply').slice(0, 3)
  const openGaps = s.needs.filter((n) => !gapCovered(n.id))

  return (
    <>
      <header className="brief-head reveal" style={{ marginBottom: 24 }}>
        <h1 className="greeting">Good morning, {s.owner}</h1>
        <p className="date-line">
          <span>{dateLine}</span>
          <span className="sep" aria-hidden="true">·</span>
          <span>Larkspur Bakery, Denver</span>
          <span className="sep" aria-hidden="true">·</span>
          <span className="chip chip-warn" style={{ height: 20 }}>
            <CloudSun size={12} /> {s.weather.cond.split(',')[0]}, high {s.weather.temp}
          </span>
        </p>
      </header>

      <div className="grid cols-12 brief-top" style={{ marginBottom: 16 }}>
        <SalesCard loc="hl" delay={40} />
        <SalesCard loc="fp" delay={80} />
        <PreordersCard delay={120} />
      </div>

      <div className="grid cols-12" style={{ marginBottom: 16 }}>
        <section className="card span-7 reveal" style={{ '--d': '160ms' } as CSSProperties} aria-label="Today's staffing">
          <div className="card-head">
            <h2 className="card-title">Today&rsquo;s staffing</h2>
            <Link to="/schedule" className="btn btn-quiet btn-sm">Open schedule</Link>
          </div>
          {s.locs.map((loc) => (
            <Lane key={loc.id} locId={loc.id} />
          ))}
          {openGaps.length > 0 && (
            <p className="pop" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--warn)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertIcon size={14} />
              <span>
                {openGaps.some((g) => g.id === 'gap-today')
                  ? 'Counter is open 7:00 to 1:00 at Highlands. A cover suggestion is waiting in Scheduling.'
                  : 'The week has open counter time at Five Points. Suggestions are ready in Scheduling.'}
              </span>
            </p>
          )}
        </section>

        <section className="card span-5 reveal" style={{ '--d': '200ms' } as CSSProperties} aria-label="Inventory below par">
          <div className="card-head">
            <h2 className="card-title">Below par</h2>
            <span className={'chip chip-warn' + useFlash(below.length)}>{below.length} items</span>
          </div>
          {below.length === 0 ? (
            <Empty icon={<CheckIcon size={20} />} text="Everything is at or above par." />
          ) : (
            below.map((item) => <ParRow key={item.id} id={item.id} />)
          )}
        </section>
      </div>

      <div className="grid cols-12">
        <section className="card span-7 reveal" style={{ '--d': '240ms' } as CSSProperties} aria-label="Most important messages">
          <div className="card-head">
            <h2 className="card-title">Needs your reply</h2>
            <Link to="/inbox" className="btn btn-quiet btn-sm">Open inbox</Link>
          </div>
          {topMsgs.length === 0 ? (
            <Empty icon={<CheckIcon size={20} />} text="Inbox is clear. New messages sort themselves as they arrive." />
          ) : (
            topMsgs.map((t) => (
              <button
                key={t.id}
                type="button"
                className="msg-row pop"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => {
                  openThread(t.id)
                  navigate('/inbox')
                }}
              >
                <span className="avatar" aria-hidden="true">{initials(t.who)}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="who">{t.who}{t.org ? ' · ' + t.org : ''}</span>
                  <span className="what" style={{ display: 'block' }}>{t.summary ?? t.msgs[0].text}</span>
                </span>
                <span className="chip chip-accent" style={{ flex: 'none' }}>Reply drafted</span>
              </button>
            ))
          )}
        </section>

        <section className="card span-5 reveal" style={{ '--d': '280ms' } as CSSProperties} aria-label="Weather and expected traffic">
          <div className="card-head">
            <h2 className="card-title">Weather and traffic</h2>
            <span className="chip chip-accent">{s.weather.chip}</span>
          </div>
          <div className="weather">
            <CloudSun size={34} className="icon" />
            <div>
              <div className="temp">{s.weather.temp}&deg;</div>
              <div className="cond">{s.weather.cond}</div>
            </div>
          </div>
          <p className="weather-note">{s.weather.note}</p>
        </section>
      </div>
    </>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}

function SalesCard({ loc, delay }: { loc: LocId; delay: number }) {
  const s = useDemo()
  const d = s.sales[loc]
  const up = d.deltaPct >= 0
  const name = s.locs.find((l) => l.id === loc)?.name
  return (
    <section className="card span-4 lift reveal" style={{ '--d': `${delay}ms` } as CSSProperties} aria-label={`Yesterday's sales at ${name}`}>
      <div className="card-head">
        <h2 className="card-title">Yesterday · {name}</h2>
        <span className={'chip ' + (up ? 'chip-ok' : 'chip-danger')}>
          {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
          <span className="mono">{Math.abs(d.deltaPct)}%</span>
        </span>
      </div>
      <div className="stat-row">
        <span className="stat">{fmtMoney(d.total)}</span>
        <span className="muted" style={{ fontSize: 12 }}>register feed, 6a to 3p</span>
      </div>
      <Sparkbars values={d.hourly} label={`Hourly sales yesterday at ${name}`} />
      <p className="top-line">
        Top sellers <b>{d.top}</b>
      </p>
    </section>
  )
}

function PreordersCard({ delay }: { delay: number }) {
  const s = useDemo()
  const flash = useFlash(s.preorderTotal)
  return (
    <section className="card span-4 reveal" style={{ '--d': `${delay}ms` } as CSSProperties} aria-label="Preorders coming in this morning">
      <div className="card-head">
        <h2 className="card-title">Preorders this morning</h2>
        <span className="chip chip-ok"><span className="live-dot" style={{ width: 6, height: 6 }} /> Live</span>
      </div>
      <div className="stat-row">
        <span className={'stat' + flash}>{fmtMoney(s.preorderTotal)}</span>
        <span className="muted" style={{ fontSize: 12 }}>on the books for today</span>
      </div>
      <div style={{ marginTop: 10 }}>
        {s.preorders.length === 0 ? (
          <p className="muted" style={{ fontSize: 12.5, paddingTop: 8 }}>
            Quiet minute. New preorders land here as they come in.
          </p>
        ) : (
          s.preorders.slice(0, 4).map((p, i) => (
            <div key={p.at + p.what} className={'feed-row' + (i === 0 ? ' pop' : '')}>
              <span className="at">{p.at}</span>
              <span className="what">{p.what}</span>
              <span className="loc">{p.locId === 'hl' ? 'HL' : 'FP'}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function Lane({ locId }: { locId: LocId }) {
  const s = useDemo()
  const name = s.locs.find((l) => l.id === locId)?.name
  const win = { from: 240, to: 960 } // 4a to 4p
  const span = win.to - win.from
  const todays = s.shifts
    .filter((x) => x.locId === locId && x.day === s.todayIdx)
    .sort((a, b) => a.start - b.start)
  const gaps = s.needs.filter((n) => n.locId === locId && n.day === s.todayIdx && !gapCovered(n.id))

  // Pack overlapping shifts into rows so nothing draws on top of anything.
  const rowEnds: number[] = []
  const placed = todays.map((sh) => {
    let row = rowEnds.findIndex((end) => end <= sh.start)
    if (row === -1) {
      row = rowEnds.length
      rowEnds.push(sh.end)
    } else {
      rowEnds[row] = sh.end
    }
    return { sh, row }
  })
  const gapRow = rowEnds.length
  const rows = gapRow + (gaps.length > 0 ? 1 : 0)
  const ROW = 30

  return (
    <div className="lane">
      <div className="lane-label">
        <b>{name}</b>
        <span>{todays.length} on today</span>
      </div>
      <div className="lane-track" style={{ height: rows * ROW + 4 }}>
        {placed.map(({ sh, row }) => {
          const staff = s.staff.find((p) => p.id === sh.staffId)
          const left = Math.max(0, ((sh.start - win.from) / span) * 100)
          const width = Math.min(100 - left, ((sh.end - Math.max(sh.start, win.from)) / span) * 100)
          return (
            <div
              key={sh.id}
              className="lane-seg"
              style={{ left: `${left}%`, width: `${width}%`, top: 4 + row * ROW }}
              title={`${staff?.name} · ${fmtTime(sh.start)} to ${fmtTime(sh.end)}`}
            >
              <span className="role">{sh.role === 'baker' ? 'BAKE' : sh.role === 'lead' ? 'LEAD' : 'CTR'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff?.name.split(' ')[0]}</span>
            </div>
          )
        })}
        {gaps.map((g) => {
          const left = ((g.start - win.from) / span) * 100
          const width = ((g.end - g.start) / span) * 100
          return (
            <div
              key={g.id}
              className="lane-seg gap pop"
              style={{ left: `${left}%`, width: `${width}%`, top: 4 + gapRow * ROW }}
            >
              open
            </div>
          )
        })}
      </div>
      <div className="lane-hours" aria-hidden="true">
        <span>4a</span>
        <span>7a</span>
        <span>10a</span>
        <span>1p</span>
        <span>4p</span>
      </div>
    </div>
  )
}

function ParRow({ id }: { id: string }) {
  const s = useDemo()
  const item = s.items.find((i) => i.id === id)
  const flash = useFlash(item?.onHand)
  if (!item) return null
  const loc = s.locs.find((l) => l.id === item.locId)?.name
  const drafted = s.orders.some((o) => o.status === 'draft' && o.lines.some((l) => l.itemId === item.id))
  return (
    <div className="par-row">
      <div className="par-name">
        <div className="n">{item.name}</div>
        <div className="l">{loc}</div>
      </div>
      <div className="par-meter">
        <div className="meter warn" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (item.onHand / item.par) * 100)}%` }} />
        </div>
      </div>
      <div className={'par-level' + flash}>
        {item.onHand} <span className="of">of {item.par} {item.unit}</span>
      </div>
      {drafted ? (
        <Link to="/orders" className="chip chip-accent" ariaCurrent={false}>
          Draft ready
        </Link>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => draftReorder(item.id)}>
          Draft reorder
        </button>
      )}
    </div>
  )
}
