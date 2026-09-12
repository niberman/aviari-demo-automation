import { useEffect, useRef, useState } from 'react'
import { Empty, Seg } from '../components'
import { fmtMoney, fmtTime, type LocId, type Shift } from '../demo/seed'
import { acceptSuggestion, dismissSuggestion, gapCovered, moveShift, useDemo } from '../demo/store'
import { CalendarIcon, CheckIcon, GripIcon } from '../icons'

type Lang = 'en' | 'es'
type View = 'week' | 'staff'

const T: Record<Lang, Record<string, string>> = {
  en: {
    week: 'Week',
    staff: 'Staff view',
    baker: 'Baker',
    counter: 'Counter',
    lead: 'Shift lead',
    open: 'open',
    covered: 'The week is covered. Suggestions appear when a gap opens.',
    suggestions: 'Suggestions',
    add: 'Add shift',
    dismiss: 'Dismiss',
    budget: 'Labor budget',
    thisWeek: 'This week',
    of: 'of',
    moveHint: 'Moving a shift. Arrow keys pick a day, Enter places it, Escape cancels.',
    staffNote: 'What the team sees on their phones. Times stay in plain language.',
  },
  es: {
    week: 'Semana',
    staff: 'Vista del equipo',
    baker: 'Horneado',
    counter: 'Mostrador',
    lead: 'Encargado',
    open: 'abierto',
    covered: 'La semana está cubierta. Las sugerencias aparecen cuando se abre un turno.',
    suggestions: 'Sugerencias',
    add: 'Agregar turno',
    dismiss: 'Descartar',
    budget: 'Presupuesto de personal',
    thisWeek: 'Esta semana',
    of: 'de',
    moveHint: 'Moviendo un turno. Las flechas eligen el día, Enter lo coloca, Escape cancela.',
    staffNote: 'Lo que el equipo ve en su teléfono. Horarios en lenguaje claro.',
  },
}

const DAY_ES = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

const SHORT_ROLE: Record<string, string> = { baker: 'B', counter: 'C', lead: 'L' }

export default function Schedule() {
  const s = useDemo()
  const [loc, setLoc] = useState<LocId>('hl')
  const [view, setView] = useState<View>('week')
  const [lang, setLang] = useState<Lang>('en')
  const t = T[lang]

  const weekShifts = s.shifts.filter((x) => x.locId === loc)
  const spent = s.shifts.reduce((sum, sh) => {
    const rate = s.staff.find((p) => p.id === sh.staffId)?.rate ?? 18
    return sum + ((sh.end - sh.start) / 60) * rate
  }, 0)
  const over = spent > s.weekBudget

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Scheduling</h1>
          <p className="sub">Drag a shift to another day, or let the suggestions fill the gaps.</p>
        </div>
        <div className="head-tools">
          <Seg
            options={s.locs.map((l) => ({ id: l.id, label: l.name }))}
            value={loc}
            onChange={setLoc}
            ariaLabel="Location"
          />
          <Seg
            options={[
              { id: 'week' as View, label: t.week },
              { id: 'staff' as View, label: t.staff },
            ]}
            value={view}
            onChange={setView}
            ariaLabel="Schedule view"
          />
          {view === 'staff' && (
            <Seg
              options={[
                { id: 'en' as Lang, label: 'English' },
                { id: 'es' as Lang, label: 'Español' },
              ]}
              value={lang}
              onChange={setLang}
              ariaLabel="Language for the staff view"
            />
          )}
        </div>
      </div>

      {view === 'week' ? (
        <div className="sched-wrap">
          <WeekBoard loc={loc} shifts={weekShifts} lang={lang} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section className="card" aria-label={t.suggestions}>
              <div className="card-head">
                <h2 className="card-title">{t.suggestions}</h2>
                {s.suggestions.length > 0 && <span className="chip chip-accent">{s.suggestions.length}</span>}
              </div>
              {s.suggestions.length === 0 ? (
                <Empty icon={<CheckIcon size={20} />} text={t.covered} />
              ) : (
                <div className="suggest">
                  {s.suggestions.map((sg) => (
                    <div key={sg.id} className="suggest-card">
                      <div className="s-t">{sg.title}</div>
                      <div className="s-b">{sg.body}</div>
                      <div className="s-a">
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => acceptSuggestion(sg.id)}>
                          {t.add}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismissSuggestion(sg.id)}>
                          {t.dismiss}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card" aria-label={t.budget}>
              <div className="card-head">
                <h2 className="card-title">{t.budget}</h2>
                {over && <span className="chip chip-warn">over</span>}
              </div>
              <div className="budget">
                <div className="b-row">
                  <span>{t.thisWeek}, both shops</span>
                  <span className="mono">
                    {fmtMoney(Math.round(spent))} {t.of} {fmtMoney(s.weekBudget)}
                  </span>
                </div>
                <div className={'meter' + (over ? ' warn' : '')}>
                  <i style={{ width: `${Math.min(100, (spent / s.weekBudget) * 100)}%` }} />
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <StaffView lang={lang} />
      )}
    </>
  )
}

function WeekBoard({ loc, shifts, lang }: { loc: LocId; shifts: Shift[]; lang: Lang }) {
  const s = useDemo()
  const t = T[lang]
  const boardRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; day: number | null } | null>(null)
  const [moveId, setMoveId] = useState<string | null>(null)
  const [moveDay, setMoveDay] = useState(0)
  const [announce, setAnnounce] = useState('')
  const dragging = useRef<{ id: string; startX: number; startY: number; active: boolean } | null>(null)

  const dayRects = () => {
    const cols = boardRef.current?.querySelectorAll<HTMLElement>('[data-day]')
    const rects: { day: number; rect: DOMRect }[] = []
    cols?.forEach((c) => rects.push({ day: Number(c.dataset.day), rect: c.getBoundingClientRect() }))
    return rects
  }

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const over = dayRects().find(
        ({ rect }) => e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom,
      )
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, day: over ? over.day : null } : d))
    }
    const onUp = () => {
      setDrag((d) => {
        if (d && d.day !== null) {
          const sh = s.shifts.find((x) => x.id === d.id)
          if (sh && sh.day !== d.day) {
            moveShift(d.id, d.day)
            const who = s.staff.find((p) => p.id === sh.staffId)?.name.split(' ')[0]
            setAnnounce(`${who} moved to ${s.weekDays[d.day].label}`)
          }
        }
        return null
      })
      dragging.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  const startPointer = (e: React.PointerEvent, id: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragging.current = { id, startX: e.clientX, startY: e.clientY, active: false }
    const onFirstMove = (ev: PointerEvent) => {
      const d = dragging.current
      if (!d) return window.removeEventListener('pointermove', onFirstMove)
      if (!d.active && Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) > 6) {
        d.active = true
        setDrag({ id: d.id, x: ev.clientX, y: ev.clientY, day: null })
        window.removeEventListener('pointermove', onFirstMove)
      }
    }
    window.addEventListener('pointermove', onFirstMove)
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onFirstMove), { once: true })
  }

  const keyMove = (e: React.KeyboardEvent, sh: Shift) => {
    if (moveId === sh.id) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        setMoveDay((d) => Math.min(6, Math.max(0, d + (e.key === 'ArrowRight' ? 1 : -1))))
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        moveShift(sh.id, moveDay)
        const who = s.staff.find((p) => p.id === sh.staffId)?.name.split(' ')[0]
        setAnnounce(`${who} moved to ${s.weekDays[moveDay].label}`)
        setMoveId(null)
      } else if (e.key === 'Escape') {
        setMoveId(null)
        setAnnounce('Move canceled')
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setMoveId(sh.id)
      setMoveDay(sh.day)
      setAnnounce(t.moveHint)
    }
  }

  const dragShift = drag ? s.shifts.find((x) => x.id === drag.id) : null

  return (
    <div>
      <div className="card" style={{ padding: 12 }}>
        <div className="week" ref={boardRef}>
          {s.weekDays.map((d, day) => {
            const dayShifts = shifts.filter((x) => x.day === day).sort((a, b) => a.start - b.start)
            const gaps = s.needs.filter((n) => n.locId === loc && n.day === day && !gapCovered(n.id))
            const target = (drag && drag.day === day) || (moveId !== null && moveDay === day)
            return (
              <div
                key={day}
                data-day={day}
                className={'day-col' + (day === s.todayIdx ? ' today' : '') + (target ? ' drop' : '')}
              >
                <div className="day-head">
                  <span className="d">{lang === 'es' ? DAY_ES[day] : d.label}</span>
                  <span className="n">{d.date}</span>
                </div>
                {dayShifts.map((sh) => {
                  const who = s.staff.find((p) => p.id === sh.staffId)
                  return (
                    <button
                      key={sh.id}
                      type="button"
                      className={
                        'shift' +
                        (drag?.id === sh.id ? ' dragging' : '') +
                        (moveId === sh.id ? ' moving' : '')
                      }
                      onPointerDown={(e) => startPointer(e, sh.id)}
                      onKeyDown={(e) => keyMove(e, sh)}
                      aria-label={`${who?.name}, ${t[sh.role]}, ${s.weekDays[sh.day].label} ${fmtTime(sh.start)} to ${fmtTime(sh.end)}. Press Enter to move it.`}
                    >
                      <span className="s-name">
                        <GripIcon size={11} style={{ color: 'var(--muted)', flex: 'none' }} />
                        <span className="s-who">{who?.name.split(' ')[0]}</span>
                        <span className="s-role" title={t[sh.role]}>{SHORT_ROLE[sh.role]}</span>
                      </span>
                      <span className="s-time">{fmtTime(sh.start)}-{fmtTime(sh.end)}</span>
                    </button>
                  )
                })}
                {gaps.map((g) => (
                  <div key={g.id} className="gap-card pop">
                    <div className="g-t">
                      {t[g.role]} {t.open}
                    </div>
                    <div className="g-s">
                      {fmtTime(g.start)} to {fmtTime(g.end)}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      {moveId && (
        <p className="move-hint pop" style={{ marginTop: 10 }}>
          <CalendarIcon size={14} /> {t.moveHint}
        </p>
      )}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {drag && dragShift && (
        <div className="ghost shift" style={{ left: drag.x - 60, top: drag.y - 24 }} aria-hidden="true">
          <span className="s-name">{s.staff.find((p) => p.id === dragShift.staffId)?.name.split(' ')[0]}</span>
          <span className="s-time">{fmtTime(dragShift.start)}-{fmtTime(dragShift.end)}</span>
        </div>
      )}
    </div>
  )
}

function StaffView({ lang }: { lang: Lang }) {
  const s = useDemo()
  const t = T[lang]
  const days = lang === 'es' ? DAY_ES : s.weekDays.map((d) => d.label)
  const roster = s.staff
    .map((p) => ({
      p,
      shifts: s.shifts.filter((x) => x.staffId === p.id).sort((a, b) => a.day - b.day || a.start - b.start),
    }))
    .filter((r) => r.shifts.length > 0)
  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">{lang === 'es' ? 'Turnos de la semana' : 'Shifts this week'}</h2>
        <span className="muted" style={{ fontSize: 11.5 }}>{t.staffNote}</span>
      </div>
      <div className="staff-list">
        {roster.map(({ p, shifts }) => (
          <div key={p.id} className="staff-row">
            <div className="p">
              <div className="nm">{p.name}</div>
              <div className="rl">{t[p.role]}</div>
            </div>
            <div className="days">
              {shifts.map((sh) => (
                <span key={sh.id} className="day-pill">
                  <b>{days[sh.day]}</b>
                  {fmtTime(sh.start)} {lang === 'es' ? 'a' : 'to'} {fmtTime(sh.end)}
                  <span className="muted" style={{ marginLeft: 5 }}>
                    {sh.locId === 'hl' ? 'Highlands' : 'Five Points'}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
