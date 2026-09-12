// The simulator script. A visit relative timeline of fictional activity so
// every screen changes while it is being watched. Offsets are seconds.

import { mulberry32, type LocId, type Thread } from './seed'

export type Ev =
  | { at: number; kind: 'preorder'; what: string; locId: LocId; amount: number }
  | { at: number; kind: 'arrival'; thread: Thread }
  | { at: number; kind: 'drain'; itemId: string; by: number }
  | { at: number; kind: 'restock'; itemId: string; to: number; note: string }
  | { at: number; kind: 'rosaOut' }

const arrival = (at: number, thread: Thread): Ev => ({ at, kind: 'arrival', thread })

export function buildProgram(seed: number): Ev[] {
  const rnd = mulberry32(seed ^ 0x5f3759df)

  const evs: Ev[] = [
    { at: 8, kind: 'preorder', what: 'Two dozen morning buns, pickup 9:00', locId: 'fp', amount: 66 },
    arrival(18, {
      id: 't-elena',
      channel: 'email',
      who: 'Elena Costa',
      subject: 'Catering an office breakfast',
      category: 'reply',
      unread: true,
      summary: 'Wants breakfast for 25 next Friday, needs a quote.',
      msgs: [
        {
          from: 'them',
          at: '',
          text: 'Good morning. We are hosting about 25 people next Friday and would love pastry boxes and coffee delivered around 8:30. Could you send a quote?',
        },
      ],
      draft:
        'Hi Elena. We can do breakfast for 25 next Friday. Pastry boxes, fruit, and drip coffee land around $6 a person, delivered by 8:30. Send the address and we will hold the date. Dana',
    }),
    { at: 30, kind: 'preorder', what: 'Six breakfast boxes, pickup 8:30', locId: 'hl', amount: 54 },
    { at: 42, kind: 'drain', itemId: 'milk-hl', by: 2 },
    { at: 62, kind: 'preorder', what: 'Half sheet carrot cake, deposit', locId: 'fp', amount: 45 },
    { at: 95, kind: 'rosaOut' },
    { at: 120, kind: 'drain', itemId: 'beans-hl', by: 1 },
    { at: 142, kind: 'preorder', what: 'Baguette standing order for Friday', locId: 'hl', amount: 38 },
    arrival(180, {
      id: 't-statement',
      channel: 'email',
      who: 'Sable Peak Dairy',
      subject: 'September statement',
      category: 'fyi',
      unread: true,
      summary: 'September statement is ready, balance unchanged.',
      msgs: [{ from: 'them', at: '', text: 'Your September statement is ready in the portal. Balance is unchanged from last month.' }],
    }),
    { at: 212, kind: 'preorder', what: 'Cortado round for a walking tour', locId: 'fp', amount: 28 },
    { at: 240, kind: 'drain', itemId: 'aflour-fp', by: 2 },
    { at: 274, kind: 'preorder', what: 'Two sourdough loaves, pickup noon', locId: 'hl', amount: 22 },
    arrival(300, {
      id: 't-gf',
      channel: 'sms',
      who: 'Jess Calloway',
      subject: 'Gluten free morning buns',
      category: 'reply',
      unread: true,
      summary: 'Asking if gluten free morning buns are out today.',
      msgs: [{ from: 'them', at: '', text: 'Hi, do you have the gluten free morning buns today?' }],
      draft: 'We do. They come out of the oven at 8:00 and usually sell through by 10:00. We can hold two with a name on them.',
    }),
    { at: 338, kind: 'preorder', what: 'Office drip box and a dozen scones', locId: 'fp', amount: 58 },
    { at: 400, kind: 'drain', itemId: 'choc-fp', by: 1 },
    { at: 452, kind: 'preorder', what: 'Birthday candle add on, cake pickup', locId: 'hl', amount: 6 },
    { at: 480, kind: 'drain', itemId: 'milk-fp', by: 3 },
    {
      at: 540,
      kind: 'restock',
      itemId: 'cups-fp',
      to: 13,
      note: 'Juniper Box delivery arrived at Five Points, cups back over par',
    },
  ]

  // Filler after the scripted opening so long visits keep moving.
  const pool: [string, LocId, number][] = [
    ['Dozen assorted pastries, pickup 10:00', 'hl', 42],
    ['Cold brew growler refill', 'fp', 16],
    ['Quiche whole, pickup 11:30', 'hl', 34],
    ['Two morning bun add ons', 'fp', 9],
    ['Sandwich loaves for a deli, weekly', 'hl', 51],
    ['Cookie tin, gift note attached', 'fp', 26],
    ['Croissant tray for a meeting', 'hl', 48],
    ['Seeded sourdough, sliced', 'fp', 12],
  ]
  const drains: [string, number][] = [
    ['eggs-hl', 2],
    ['butter-hl', 1],
    ['oat-fp', 1],
    ['sugar-fp', 1],
    ['bflour-hl', 1],
    ['milk-hl', 1],
  ]
  let t = 600
  let pi = Math.floor(rnd() * pool.length)
  let di = 0
  while (t < 3540) {
    const p = pool[pi % pool.length]
    evs.push({ at: t, kind: 'preorder', what: p[0], locId: p[1], amount: p[2] })
    pi++
    if ((pi & 1) === 0) {
      const d = drains[di % drains.length]
      evs.push({ at: t + 24, kind: 'drain', itemId: d[0], by: d[1] })
      di++
    }
    t += 38 + Math.floor(rnd() * 26)
  }

  return evs.sort((a, b) => a.at - b.at)
}

// Short vendor style confirmations that arrive a bit after a reply is sent.
export const ACKS: Record<string, string> = {
  't-marta': 'Locked in for 7:00 Friday. Ray will text from the alley. Thanks Dana.',
  't-caleb': 'Thanks. Swapping with Marisol on the board now.',
  't-elena': 'That works for us. Address coming shortly, please hold the date.',
  't-marcus': 'Confirmed, see you on the 20th.',
  't-gf': 'Two under Jess please, thank you.',
}
