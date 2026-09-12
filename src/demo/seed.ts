// The isolated demo database. Everything here is fictional and generated
// from an hour based seed, so the whole world returns to this state on the hour.

export type LocId = 'hl' | 'fp'
export type Role = 'baker' | 'counter' | 'lead'
export type Category = 'reply' | 'fyi' | 'done'

export interface Loc {
  id: LocId
  name: string
}

export interface Staff {
  id: string
  name: string
  role: Role
  rate: number
  bilingual?: boolean
}

export interface Shift {
  id: string
  locId: LocId
  day: number // 0 = Monday
  start: number // minutes from midnight
  end: number
  staffId: string
  role: Role
}

export interface GapNeed {
  id: string
  locId: LocId
  day: number
  start: number
  end: number
  role: Role
}

export interface Item {
  id: string
  name: string
  unit: string
  locId: LocId
  par: number
  onHand: number
  pace: number // per day
  vendorId: string
}

export interface Vendor {
  id: string
  name: string
  contact: string
  kind: string
}

export interface Msg {
  from: 'them' | 'dana'
  text: string
  at: string
}

export interface Thread {
  id: string
  channel: 'email' | 'sms'
  who: string
  org?: string
  subject: string
  category: Category
  unread: boolean
  msgs: Msg[]
  draft?: string
  summary?: string
}

export interface OrderLine {
  itemId?: string
  itemName: string
  qty: number
  unit: string
  cost: number
}

export interface Order {
  id: string
  vendorId: string
  po: string
  lines: OrderLine[]
  status: 'draft' | 'sent'
  sentAt?: string
  source: string
}

export interface Rule {
  id: string
  text: string
  enabled: boolean
  lastRun: string
}

export interface Suggestion {
  id: string
  title: string
  body: string
  shift: Omit<Shift, 'id'>
}

export interface PreorderTick {
  at: string
  what: string
  locId: LocId
  amount: number
}

export interface World {
  seed: number
  owner: string
  locs: Loc[]
  staff: Staff[]
  shifts: Shift[]
  needs: GapNeed[]
  items: Item[]
  vendors: Vendor[]
  threads: Thread[]
  orders: Order[]
  rules: Rule[]
  runLog: { at: string; text: string }[]
  suggestions: Suggestion[]
  preorders: PreorderTick[]
  preorderTotal: number
  sales: Record<LocId, { total: number; deltaPct: number; hourly: number[]; top: string }>
  weather: { temp: number; cond: string; note: string; chip: string }
  weekBudget: number
}

export function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const HOUR = 3600_000

export function hourSeed(now: number): number {
  return Math.floor(now / HOUR)
}

const H = 60 // minutes helper

export function generateWorld(seed: number): World {
  const rnd = mulberry32(seed)
  const vary = (base: number, spread: number) => Math.round(base + (rnd() - 0.5) * 2 * spread)

  const locs: Loc[] = [
    { id: 'hl', name: 'Highlands' },
    { id: 'fp', name: 'Five Points' },
  ]

  const staff: Staff[] = [
    { id: 'marisol', name: 'Marisol Vega', role: 'baker', rate: 24, bilingual: true },
    { id: 'tomas', name: 'Tomás Rivera', role: 'baker', rate: 23, bilingual: true },
    { id: 'caleb', name: 'Caleb Ford', role: 'baker', rate: 22 },
    { id: 'jordan', name: 'Jordan Pryce', role: 'lead', rate: 26 },
    { id: 'devon', name: 'Devon Marsh', role: 'lead', rate: 25 },
    { id: 'nia', name: 'Nia Okafor', role: 'counter', rate: 19 },
    { id: 'sam', name: 'Sam Whitaker', role: 'counter', rate: 18 },
    { id: 'priya', name: 'Priya Anand', role: 'counter', rate: 18 },
    { id: 'rosa', name: 'Rosa Jimenez', role: 'counter', rate: 19, bilingual: true },
    { id: 'lucia', name: 'Lucía Herrera', role: 'counter', rate: 17, bilingual: true },
  ]

  // Week grid, Monday first. Bakers start early, counter covers open hours.
  let sid = 0
  const mk = (locId: LocId, day: number, start: number, end: number, staffId: string, role: Role): Shift => ({
    id: 'sh' + sid++,
    locId,
    day,
    start,
    end,
    staffId,
    role,
  })

  const shifts: Shift[] = []
  for (let d = 0; d < 7; d++) {
    const weekend = d >= 5
    // Highlands bakers
    shifts.push(mk('hl', d, 4 * H + 30, 12 * H + 30, d % 2 === 0 ? 'marisol' : 'caleb', 'baker'))
    if (weekend) shifts.push(mk('hl', d, 5 * H, 13 * H, d % 2 === 0 ? 'caleb' : 'marisol', 'baker'))
    // Five Points baker
    shifts.push(mk('fp', d, 5 * H, 13 * H, 'tomas', 'baker'))
    // Leads
    shifts.push(mk('hl', d, 6 * H, 14 * H, 'jordan', 'lead'))
    shifts.push(mk('fp', d, 6 * H + 30, 14 * H + 30, 'devon', 'lead'))
    // Counter
    shifts.push(mk('hl', d, 7 * H, 13 * H, d === 6 ? 'nia' : 'rosa', 'counter'))
    if (d < 5) shifts.push(mk('hl', d, 10 * H, 15 * H, 'nia', 'counter'))
    shifts.push(mk('fp', d, 7 * H, 13 * H, d % 3 === 2 ? 'lucia' : 'sam', 'counter'))
    if (weekend) shifts.push(mk('fp', d, 8 * H, 14 * H, 'priya', 'counter'))
  }

  // Deliberate holes the suggestion panel can fix. Thursday afternoon counter
  // at Five Points, and Saturday mid shift at Five Points.
  const needs: GapNeed[] = [
    { id: 'gap-thu', locId: 'fp', day: 3, start: 13 * H, end: 15 * H, role: 'counter' },
    { id: 'gap-sat', locId: 'fp', day: 5, start: 8 * H, end: 14 * H, role: 'counter' },
  ]
  // Remove the Saturday priya shift so the gap is real.
  const satIdx = shifts.findIndex((s) => s.day === 5 && s.staffId === 'priya')
  if (satIdx >= 0) shifts.splice(satIdx, 1)

  const vendors: Vendor[] = [
    { id: 'sable', name: 'Sable Peak Dairy', contact: 'orders@sablepeakdairy.example', kind: 'Dairy' },
    { id: 'goldmesa', name: 'Gold Mesa Flour', contact: 'sales@goldmesaflour.example', kind: 'Dry goods' },
    { id: 'copper', name: 'Copper Spool Coffee', contact: 'wholesale@copperspool.example', kind: 'Coffee' },
    { id: 'juniper', name: 'Juniper Box Supply', contact: 'help@juniperbox.example', kind: 'Packaging' },
  ]

  const items: Item[] = [
    { id: 'milk-hl', name: 'Whole milk', unit: 'gal', locId: 'hl', par: 20, onHand: 21, pace: 9, vendorId: 'sable' },
    { id: 'butter-hl', name: 'Butter', unit: 'lb', locId: 'hl', par: 30, onHand: vary(24, 2), pace: 11, vendorId: 'sable' },
    { id: 'beans-hl', name: 'Espresso beans', unit: 'lb', locId: 'hl', par: 12, onHand: 13, pace: 4, vendorId: 'copper' },
    { id: 'bflour-hl', name: 'Bread flour', unit: 'bag', locId: 'hl', par: 10, onHand: vary(14, 1), pace: 2, vendorId: 'goldmesa' },
    { id: 'eggs-hl', name: 'Eggs', unit: 'doz', locId: 'hl', par: 30, onHand: vary(36, 3), pace: 12, vendorId: 'sable' },
    { id: 'milk-fp', name: 'Whole milk', unit: 'gal', locId: 'fp', par: 16, onHand: vary(18, 1), pace: 7, vendorId: 'sable' },
    { id: 'aflour-fp', name: 'All purpose flour', unit: 'bag', locId: 'fp', par: 8, onHand: 9, pace: 2, vendorId: 'goldmesa' },
    { id: 'cups-fp', name: 'Cups, 12 oz', unit: 'case', locId: 'fp', par: 10, onHand: vary(7, 1), pace: 2, vendorId: 'juniper' },
    { id: 'oat-fp', name: 'Oat milk', unit: 'case', locId: 'fp', par: 6, onHand: vary(8, 1), pace: 2, vendorId: 'sable' },
    { id: 'sugar-fp', name: 'Cane sugar', unit: 'bag', locId: 'fp', par: 6, onHand: vary(9, 1), pace: 1, vendorId: 'goldmesa' },
    { id: 'choc-fp', name: 'Dark chocolate', unit: 'lb', locId: 'fp', par: 8, onHand: vary(11, 1), pace: 2, vendorId: 'goldmesa' },
    { id: 'boxes-hl', name: 'Pastry boxes', unit: 'pack', locId: 'hl', par: 12, onHand: vary(15, 1), pace: 3, vendorId: 'juniper' },
  ]

  const threads: Thread[] = [
    {
      id: 't-marta',
      channel: 'email',
      who: 'Marta Delgado',
      org: 'Sable Peak Dairy',
      subject: 'Friday delivery window',
      category: 'reply',
      unread: true,
      summary: 'Sable Peak can move the Friday drop to 7:00 if you confirm today.',
      msgs: [
        {
          from: 'them',
          at: '5:38',
          text: 'Morning Dana. Route change on our end this week. Can we move your Friday drop from 6:30 to 7:00? Same driver, same dock. Let me know today and I will lock it in.',
        },
      ],
      draft: 'Hi Marta. 7:00 on Friday works for us. Use the alley door and have Ray text when he is close. Thanks, Dana.',
    },
    {
      id: 't-marcus',
      channel: 'email',
      who: 'Marcus Hale',
      subject: 'Birthday cake for the 20th',
      category: 'reply',
      unread: true,
      summary: 'Wants a lemon olive oil cake for twelve, pickup Saturday the 20th.',
      msgs: [
        {
          from: 'them',
          at: '5:12',
          text: 'Hi there. My partner loved the lemon olive oil cake we had at a friend’s party. Could you make one for about twelve people for Saturday the 20th? Happy to come to either shop.',
        },
      ],
      draft:
        'Hi Marcus. We can do a lemon olive oil cake for twelve on Saturday the 20th. It will be $68 and you can pick it up at either shop after 10:00. Reply to confirm and we will get it on the books. Dana',
    },
    {
      id: 't-caleb',
      channel: 'sms',
      who: 'Caleb Ford',
      org: 'Staff',
      subject: 'Friday bake swap',
      category: 'reply',
      unread: true,
      summary: 'Caleb wants to swap the Friday bake shift with Marisol.',
      msgs: [
        {
          from: 'them',
          at: '5:51',
          text: 'Hey Dana, any chance I can swap Friday bake with Marisol? I have a morning appointment. She said she is open to it.',
        },
      ],
      draft: 'That works if Marisol is in. Swap it on the board and I will confirm tonight.',
    },
    {
      id: 't-goldmesa',
      channel: 'email',
      who: 'Gold Mesa Flour',
      subject: 'October price sheet',
      category: 'fyi',
      unread: true,
      summary: 'Bread flour goes up 40 cents a bag starting October.',
      msgs: [
        {
          from: 'them',
          at: '4:55',
          text: 'Hello from Gold Mesa. Heads up that bread flour moves up 40 cents a bag on October 1. The full sheet is attached. No change to delivery days.',
        },
      ],
    },
    {
      id: 't-merchants',
      channel: 'email',
      who: 'Highlands Merchants Group',
      subject: 'Street fair on the 27th',
      category: 'fyi',
      unread: false,
      summary: 'The 32nd Avenue street fair runs the 27th, expect heavy foot traffic.',
      msgs: [
        {
          from: 'them',
          at: '4:20',
          text: 'Reminder that the street fair runs Saturday the 27th from 10:00 to 4:00. Expect heavy foot traffic and no street parking in front of the shops.',
        },
      ],
    },
    {
      id: 't-juniper',
      channel: 'sms',
      who: 'Juniper Box Supply',
      subject: 'Cup cases shipped',
      category: 'fyi',
      unread: false,
      summary: 'Cup cases shipped, arriving Thursday.',
      msgs: [
        { from: 'them', at: '4:41', text: 'Your cup cases shipped this morning. Tracking says Thursday by end of day.' },
      ],
    },
    {
      id: 't-copper',
      channel: 'email',
      who: 'Copper Spool Coffee',
      subject: 'September roast schedule',
      category: 'done',
      unread: false,
      summary: 'Roast schedule confirmed for September.',
      msgs: [
        { from: 'them', at: '4:02', text: 'Confirming your September roast schedule. Deliveries land Tuesdays. Same blend split as August unless you say otherwise.' },
        { from: 'dana', at: '6:02', text: 'Same split is right. Thanks for confirming.' },
      ],
    },
    {
      id: 't-priya',
      channel: 'sms',
      who: 'Priya Anand',
      org: 'Staff',
      subject: 'Saturday confirmed',
      category: 'done',
      unread: false,
      summary: 'Priya confirmed Saturday at 8:00.',
      msgs: [
        { from: 'them', at: '5:58', text: 'Confirmed for Saturday at 8:00. See you then.' },
        { from: 'dana', at: '6:04', text: 'Great, thanks Priya.' },
      ],
    },
  ]

  const orders: Order[] = [
    {
      id: 'o-juniper',
      vendorId: 'juniper',
      po: 'PO-41' + String(16 + (seed % 80)),
      lines: [
        { itemId: 'cups-fp', itemName: 'Cups, 12 oz', qty: 6, unit: 'case', cost: 174 },
        { itemId: 'boxes-hl', itemName: 'Pastry boxes', qty: 4, unit: 'pack', cost: 96 },
      ],
      status: 'draft',
      source: 'Drafted from pace and par before open',
    },
  ]

  const rules: Rule[] = [
    {
      id: 'r-milk',
      text: 'When milk falls below 20 gallons at Highlands, draft an order to Sable Peak Dairy.',
      enabled: true,
      lastRun: 'Yesterday 2:10',
    },
    {
      id: 'r-dry',
      text: 'When a dry goods item falls below par at either location, draft an order to Gold Mesa Flour.',
      enabled: true,
      lastRun: 'Tuesday 8:40',
    },
    {
      id: 'r-pack',
      text: 'When packaging falls below par, add it to the next Juniper Box Supply order.',
      enabled: true,
      lastRun: '5:42',
    },
    {
      id: 'r-triage',
      text: 'When a new message arrives, sort it into needs reply, FYI, or done, and write a plain draft when a reply is needed.',
      enabled: true,
      lastRun: '5:52',
    },
    {
      id: 'r-cover',
      text: 'When someone calls out with less than a day of notice, flag the gap and suggest covers from availability and the labor budget.',
      enabled: true,
      lastRun: 'Monday 6:15',
    },
    {
      id: 'r-brief',
      text: 'Every morning at 5:45, assemble this brief from the register feed, the schedule, inventory, and the inbox.',
      enabled: true,
      lastRun: '5:45',
    },
    {
      id: 'r-file',
      text: 'When an order is sent, file the PDF and watch the thread for the vendor confirmation.',
      enabled: true,
      lastRun: 'Yesterday 9:03',
    },
  ]

  const runLog = [
    { at: '5:45', text: 'Assembled the morning brief from the register feed, schedule, inventory, and inbox' },
    { at: '5:46', text: 'Flagged butter below par at Highlands' },
    { at: '5:52', text: 'Sorted six overnight messages and drafted three replies' },
    { at: '5:58', text: 'Drafted the Juniper Box Supply order from pace and par' },
  ]

  const suggestions: Suggestion[] = [
    {
      id: 'sg-sat',
      title: 'Saturday counter at Five Points, 8:00 to 2:00',
      body: 'Priya is free Saturday and this keeps the week inside the labor budget.',
      shift: { locId: 'fp', day: 5, start: 8 * H, end: 14 * H, staffId: 'priya', role: 'counter' },
    },
    {
      id: 'sg-thu',
      title: 'Thursday counter at Five Points, 1:00 to 3:00',
      body: 'Lucía is available after 12:30 and stays under thirty hours for the week.',
      shift: { locId: 'fp', day: 3, start: 13 * H, end: 15 * H, staffId: 'lucia', role: 'counter' },
    },
  ]

  // Yesterday, hourly register totals 6a to 3p.
  const curve = [3, 7, 12, 15, 13, 10, 8, 9, 6]
  const mkHourly = (total: number) => {
    const weights = curve.map((c) => c * (0.85 + rnd() * 0.3))
    const wsum = weights.reduce((a, b) => a + b, 0)
    return weights.map((w) => Math.round((w / wsum) * total))
  }
  const hlTotal = vary(2412, 140)
  const fpTotal = vary(1834, 120)

  const sales: World['sales'] = {
    hl: {
      total: hlTotal,
      deltaPct: Math.round((4 + rnd() * 5) * 10) / 10,
      hourly: mkHourly(hlTotal),
      top: 'sourdough loaf, ham and gruyere croissant, cortado',
    },
    fp: {
      total: fpTotal,
      deltaPct: -Math.round((1 + rnd() * 3) * 10) / 10,
      hourly: mkHourly(fpTotal),
      top: 'morning bun, breakfast burrito, cold brew',
    },
  }

  const skies = [
    {
      temp: 82,
      cond: 'Sunny, light wind',
      chip: 'Busier than usual',
      note: 'Warm and clear. Expect a strong patio morning at Highlands and steady walk-ins at Five Points. Ice and cold brew will move early.',
    },
    {
      temp: 58,
      cond: 'Morning rain, clearing by 11',
      chip: 'Slower start',
      note: 'Rain until late morning. Expect a soft open and a catch-up rush near noon. Soup and warm drinks will carry the first half.',
    },
    {
      temp: 74,
      cond: 'High clouds, calm',
      chip: 'Steady',
      note: 'Mild and gray. A steady, even morning at both shops. Good day to run the full pastry case without a second bake.',
    },
    {
      temp: 90,
      cond: 'Hot by 10, clear',
      chip: 'Early rush likely',
      note: 'Heat builds fast. Expect the rush to land before 9 and thin out after lunch. Cold drinks and early patio seats will go first.',
    },
  ]
  const weather = skies[seed % skies.length]

  return {
    seed,
    owner: 'Dana',
    locs,
    staff,
    shifts,
    needs,
    items,
    vendors,
    threads,
    orders,
    rules,
    runLog,
    suggestions,
    preorders: [],
    preorderTotal: vary(184, 30),
    sales,
    weather,
    weekBudget: 8600,
  }
}

export const fmtMoney = (n: number) =>
  '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

export const fmtTime = (mins: number) => {
  const h24 = Math.floor(mins / 60)
  const m = mins % 60
  const h = ((h24 + 11) % 12) + 1
  return m === 0 ? String(h) + ':00' : String(h) + ':' + String(m).padStart(2, '0')
}
