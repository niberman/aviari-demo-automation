// In browser demo database plus the simulation engine. All writes land here
// and the whole thing regenerates from seed on the hour.

import { useSyncExternalStore } from 'react'
import {
  generateWorld,
  hourSeed,
  type Item,
  type Shift,
  type Suggestion,
  type Thread,
  type World,
} from './seed'
import { buildProgram, ACKS, type Ev } from './program'

export interface Toast {
  id: number
  kind: 'accent' | 'warn' | 'ok'
  title: string
  body?: string
  leaving?: boolean
}

export interface State extends World {
  toasts: Toast[]
  clock: string // sim time like 6:24
  todayIdx: number // 0 = Monday, in Denver
  weekDays: { label: string; date: string }[]
  freshLog: number // count of run log lines added live
}

const DENVER = 'America/Denver'

const UNIT_COST: Record<string, number> = {
  'milk-hl': 4.6,
  'milk-fp': 4.6,
  'butter-hl': 5.2,
  'beans-hl': 11,
  'bflour-hl': 24,
  'aflour-fp': 21,
  'eggs-hl': 3.9,
  'cups-fp': 29,
  'oat-fp': 33,
  'sugar-fp': 18,
  'choc-fp': 9,
  'boxes-hl': 24,
}

const RULE_FOR_VENDOR: Record<string, string> = {
  goldmesa: 'r-dry',
  juniper: 'r-pack',
}

function denverTodayIdx(now: number): number {
  const wd = new Date(now).toLocaleDateString('en-US', { weekday: 'short', timeZone: DENVER })
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd)
}

function weekDayLabels(now: number, todayIdx: number) {
  const days: { label: string; date: string }[] = []
  for (let d = 0; d < 7; d++) {
    const dt = new Date(now + (d - todayIdx) * 86400_000)
    days.push({
      label: dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: DENVER }),
      date: dt.toLocaleDateString('en-US', { day: 'numeric', timeZone: DENVER }),
    })
  }
  return days
}

function clockLabel(now: number): string {
  const d = new Date(now)
  return '6:' + String(d.getMinutes()).padStart(2, '0')
}

// ---- module state ----

let state: State
let program: Ev[] = []
let applied = 0
let visitStart = 0
let speed = 1
let toastSeq = 0
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  notify()
}

function toast(kind: Toast['kind'], title: string, body?: string) {
  const t: Toast = { id: ++toastSeq, kind, title, body }
  state = { ...state, toasts: [...state.toasts, t].slice(-3) }
  window.setTimeout(() => dismissToast(t.id), 7000 / Math.min(speed, 1))
}

export function dismissToast(id: number) {
  const t = state.toasts.find((x) => x.id === id)
  if (!t || t.leaving) return
  set({ toasts: state.toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x)) })
  window.setTimeout(() => {
    if (!state.toasts.some((x) => x.id === id)) return
    set({ toasts: state.toasts.filter((x) => x.id !== id) })
  }, 220)
}

function logLine(text: string) {
  state = {
    ...state,
    runLog: [...state.runLog, { at: state.clock, text }].slice(-40),
    freshLog: state.freshLog + 1,
  }
}

function freshWorld(now: number): State {
  const seed = hourSeed(now)
  const todayIdx = denverTodayIdx(now)
  return {
    ...generateWorld(seed),
    toasts: [],
    clock: clockLabel(now),
    todayIdx,
    weekDays: weekDayLabels(now, todayIdx),
    freshLog: 0,
  }
}

// ---- events ----

function orderDraftFor(item: Item, source: string) {
  const qty = Math.max(item.par - item.onHand + Math.ceil(item.pace / 3), 2)
  const cost = Math.round(qty * (UNIT_COST[item.id] ?? 10))
  const line = { itemId: item.id, itemName: item.name, qty, unit: item.unit, cost }
  const existing = state.orders.find((o) => o.vendorId === item.vendorId && o.status === 'draft')
  if (existing) {
    if (existing.lines.some((l) => l.itemId === item.id)) return existing
    const orders = state.orders.map((o) =>
      o === existing ? { ...o, lines: [...o.lines, line] } : o,
    )
    state = { ...state, orders }
    return existing
  }
  const po = 'PO-' + (4100 + ((state.seed + state.orders.length * 7) % 260))
  const order = {
    id: 'o' + Date.now() + state.orders.length,
    vendorId: item.vendorId,
    po,
    lines: [line],
    status: 'draft' as const,
    source,
  }
  state = { ...state, orders: [...state.orders, order] }
  return order
}

function onCross(item: Item, silent: boolean) {
  const ruleId = item.id === 'milk-hl' ? 'r-milk' : RULE_FOR_VENDOR[item.vendorId]
  const rule = ruleId ? state.rules.find((r) => r.id === ruleId) : undefined
  if (!rule || !rule.enabled) return
  const vendor = state.vendors.find((v) => v.id === item.vendorId)
  if (!vendor) return
  orderDraftFor(item, 'Drafted automatically from pace and par')
  state = {
    ...state,
    rules: state.rules.map((r) => (r.id === rule.id ? { ...r, lastRun: state.clock } : r)),
  }
  logLine('Drafted ' + vendor.name + ' order, ' + item.name.toLowerCase() + ' below par at ' + locName(item.locId))
  if (!silent) {
    toast('warn', item.name + ' fell below par at ' + locName(item.locId), 'Order drafted for ' + vendor.name + '. Review it in Vendor orders.')
  }
}

function locName(id: string) {
  return state.locs.find((l) => l.id === id)?.name ?? id
}

function applyEvent(ev: Ev, silent: boolean) {
  switch (ev.kind) {
    case 'preorder': {
      const tick = { at: state.clock, what: ev.what, locId: ev.locId, amount: ev.amount }
      state = {
        ...state,
        preorders: [tick, ...state.preorders].slice(0, 6),
        preorderTotal: state.preorderTotal + ev.amount,
      }
      break
    }
    case 'arrival': {
      const triage = state.rules.find((r) => r.id === 'r-triage')
      const sorted = triage?.enabled !== false
      const thread: Thread = {
        ...ev.thread,
        draft: sorted ? ev.thread.draft : undefined,
        msgs: ev.thread.msgs.map((m) => ({ ...m, at: m.at || state.clock })),
      }
      state = { ...state, threads: [thread, ...state.threads] }
      if (sorted) {
        state = {
          ...state,
          rules: state.rules.map((r) => (r.id === 'r-triage' ? { ...r, lastRun: state.clock } : r)),
        }
        logLine('Sorted a new message from ' + thread.who + (thread.draft ? ' and drafted a reply' : ''))
      }
      if (!silent) toast('accent', 'New message from ' + thread.who, thread.subject)
      break
    }
    case 'drain': {
      const item = state.items.find((i) => i.id === ev.itemId)
      if (!item) break
      const was = item.onHand
      const onHand = Math.max(0, was - ev.by)
      state = { ...state, items: state.items.map((i) => (i.id === item.id ? { ...i, onHand } : i)) }
      if (was >= item.par && onHand < item.par) {
        onCross({ ...item, onHand }, silent)
      }
      break
    }
    case 'restock': {
      const item = state.items.find((i) => i.id === ev.itemId)
      if (!item) break
      state = { ...state, items: state.items.map((i) => (i.id === item.id ? { ...i, onHand: ev.to } : i)) }
      logLine(ev.note)
      if (!silent) toast('ok', 'Delivery received', ev.note)
      break
    }
    case 'rosaOut': {
      const shifts = state.shifts.filter(
        (s) => !(s.staffId === 'rosa' && s.day === state.todayIdx && s.locId === 'hl'),
      )
      const needs = state.needs.some((n) => n.id === 'gap-today')
        ? state.needs
        : [...state.needs, { id: 'gap-today', locId: 'hl' as const, day: state.todayIdx, start: 420, end: 780, role: 'counter' as const }]
      state = { ...state, shifts, needs }
      const rosaMsg: Thread = {
        id: 't-rosa',
        channel: 'sms',
        who: 'Rosa Jimenez',
        org: 'Staff',
        subject: 'Out sick today',
        category: 'reply',
        unread: true,
        summary: 'Rosa cannot make the 7:00 and needs the morning covered.',
        msgs: [{ from: 'them', at: state.clock, text: 'Feeling rough this morning. I cannot make the 7:00. So sorry for the short notice.' }],
        draft: 'Rest up Rosa. We will cover the morning, check in tomorrow.',
      }
      state = { ...state, threads: [rosaMsg, ...state.threads] }
      const cover = state.rules.find((r) => r.id === 'r-cover')
      if (cover?.enabled) {
        addTodaySuggestion()
        state = {
          ...state,
          rules: state.rules.map((r) => (r.id === 'r-cover' ? { ...r, lastRun: state.clock } : r)),
        }
        logLine('Flagged a counter gap at Highlands and suggested a cover')
      }
      if (!silent) {
        toast('warn', 'Rosa is out sick today', 'Counter opens at 7:00 at Highlands. A cover suggestion is ready in Scheduling.')
      }
      break
    }
  }
}

function addTodaySuggestion() {
  if (state.suggestions.some((s) => s.id === 'sg-today')) return
  const sg: Suggestion = {
    id: 'sg-today',
    title: 'Today counter at Highlands, 7:00 to 1:00',
    body: 'Nia can start at 7:00 and Jordan covers the register until she arrives.',
    shift: { locId: 'hl', day: state.todayIdx, start: 420, end: 780, staffId: 'nia', role: 'counter' },
  }
  state = { ...state, suggestions: [sg, ...state.suggestions] }
}

// ---- engine ----

function elapsedSec(now: number): number {
  return ((now - visitStart) * speed) / 1000
}

function tick() {
  const now = Date.now()
  const before = state
  if (hourSeed(now) !== state.seed) {
    // Top of the hour. The demo database resets to seed.
    program = buildProgram(hourSeed(now))
    applied = 0
    visitStart = now
    state = freshWorld(now)
    toast('accent', 'Top of the hour', 'The demo just reset to its seed data. Fresh morning, same bakery.')
    notify()
    return
  }
  const el = elapsedSec(now)
  let changed = false
  while (applied < program.length && program[applied].at <= el) {
    applyEvent(program[applied], false)
    applied++
    changed = true
  }
  const clock = clockLabel(now)
  if (clock !== state.clock) {
    state = { ...state, clock }
    changed = true
  }
  if (changed && state !== before) notify()
}

export function initDemo() {
  if (state) return
  const now = Date.now()
  const params = new URLSearchParams(window.location.search)
  speed = Math.max(0.1, Math.min(60, Number(params.get('speed')) || 1))
  const skip = Math.max(0, Number(params.get('clock')) || 0)
  visitStart = now - (skip * 1000) / speed
  state = freshWorld(now)
  program = buildProgram(state.seed)
  // Catch up silently so a deep linked clock lands mid story without a toast
  // storm. Each event is stamped with the sim time it would have fired at.
  const el = elapsedSec(now)
  while (applied < program.length && program[applied].at <= el) {
    state = { ...state, clock: clockLabel(visitStart + (program[applied].at * 1000) / speed) }
    applyEvent(program[applied], true)
    applied++
  }
  state = { ...state, clock: clockLabel(now) }
  window.setInterval(tick, speed > 1 ? 250 : 1000)
  ;(window as unknown as Record<string, unknown>).__demo = {
    jump(sec: number) {
      visitStart = Date.now() - (sec * 1000) / speed
      tick()
    },
    get state() {
      return state
    },
    replay() {
      window.dispatchEvent(new Event('demo:replay'))
    },
    tick,
  }
}

// ---- actions (writes into the demo database) ----

export function sendReply(threadId: string, text: string) {
  const th = state.threads.find((t) => t.id === threadId)
  if (!th || !text.trim()) return
  const msg = { from: 'dana' as const, at: state.clock, text: text.trim() }
  state = {
    ...state,
    threads: state.threads.map((t) =>
      t.id === threadId ? { ...t, msgs: [...t.msgs, msg], category: 'done' as const, unread: false, draft: undefined } : t,
    ),
  }
  notify()
  const ack = ACKS[threadId]
  if (ack) {
    window.setTimeout(() => {
      state = {
        ...state,
        threads: state.threads.map((t) =>
          t.id === threadId ? { ...t, msgs: [...t.msgs, { from: 'them' as const, at: state.clock, text: ack }], unread: true } : t,
        ),
      }
      toast('accent', th.who + ' replied', ack)
      notify()
    }, 45000 / speed)
  }
}

export function markDone(threadId: string) {
  state = {
    ...state,
    threads: state.threads.map((t) => (t.id === threadId ? { ...t, category: 'done' as const, unread: false } : t)),
  }
  notify()
}

export function markRead(threadId: string) {
  const th = state.threads.find((t) => t.id === threadId)
  if (!th?.unread) return
  state = {
    ...state,
    threads: state.threads.map((t) => (t.id === threadId ? { ...t, unread: false } : t)),
  }
  notify()
}

export function draftReorder(itemId: string) {
  const item = state.items.find((i) => i.id === itemId)
  if (!item) return
  const vendor = state.vendors.find((v) => v.id === item.vendorId)
  orderDraftFor(item, 'Drafted by Dana from the morning brief')
  toast('ok', 'Reorder drafted', item.name + ' added to the ' + (vendor?.name ?? 'vendor') + ' draft.')
  notify()
}

export function sendOrder(orderId: string) {
  const order = state.orders.find((o) => o.id === orderId)
  if (!order || order.status === 'sent') return
  const vendor = state.vendors.find((v) => v.id === order.vendorId)
  state = {
    ...state,
    orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: 'sent' as const, sentAt: state.clock } : o)),
  }
  const file = state.rules.find((r) => r.id === 'r-file')
  if (file?.enabled) {
    logLine('Filed ' + order.po + ' to ' + (vendor?.name ?? 'vendor') + ' and watching for the confirmation')
    state = {
      ...state,
      rules: state.rules.map((r) => (r.id === 'r-file' ? { ...r, lastRun: state.clock } : r)),
    }
  }
  toast('ok', 'Order sent to ' + (vendor?.name ?? 'vendor'), order.po + ' went out as a PDF and is filed on the order.')
  notify()
}

export function toggleRule(ruleId: string) {
  const rule = state.rules.find((r) => r.id === ruleId)
  if (!rule) return
  const enabled = !rule.enabled
  state = { ...state, rules: state.rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r)) }
  if (ruleId === 'r-cover' && enabled && state.needs.some((n) => n.id === 'gap-today')) {
    addTodaySuggestion()
  }
  notify()
}

export function moveShift(shiftId: string, day: number) {
  state = {
    ...state,
    shifts: state.shifts.map((s) => (s.id === shiftId ? { ...s, day } : s)),
  }
  notify()
}

export function acceptSuggestion(id: string) {
  const sg = state.suggestions.find((s) => s.id === id)
  if (!sg) return
  const shift: Shift = { ...sg.shift, id: 'sh-' + id }
  state = {
    ...state,
    shifts: [...state.shifts, shift],
    suggestions: state.suggestions.filter((s) => s.id !== id),
  }
  toast('ok', 'Shift added', sg.title + '.')
  notify()
}

export function dismissSuggestion(id: string) {
  state = { ...state, suggestions: state.suggestions.filter((s) => s.id !== id) }
  notify()
}

// Cross screen handoff: the brief can open a specific inbox thread.
let pending: string | null = null

export function openThread(id: string) {
  pending = id
}

export function takePendingThread(): string | null {
  const p = pending
  pending = null
  return p
}

// ---- react binding ----

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useDemo(): State {
  return useSyncExternalStore(subscribe, () => state)
}

export function gapCovered(needId: string): boolean {
  const need = state.needs.find((n) => n.id === needId)
  if (!need) return true
  return state.shifts.some(
    (s) => s.locId === need.locId && s.day === need.day && s.role === need.role && s.start <= need.start && s.end >= need.end,
  )
}
