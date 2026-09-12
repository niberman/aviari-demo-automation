// Unit checks for the seed world, program, and PDF writer.
// The TS modules are bundled to .test-build first (see pretest in package.json).

import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { createRequire } from 'node:module'

const { generateWorld, hourSeed } = await import('../.test-build/seed.mjs')
const { buildProgram } = await import('../.test-build/program.mjs')
const { orderPdf } = await import('../.test-build/pdf.mjs')

test('world generation is deterministic per seed', () => {
  const a = generateWorld(497000)
  const b = generateWorld(497000)
  assert.deepEqual(a, b)
  const c = generateWorld(497001)
  assert.notDeepEqual(a.sales, c.sales)
})

test('seed world starts with a story to tell', () => {
  for (const seed of [100, 497123, 941822]) {
    const w = generateWorld(seed)
    const below = w.items.filter((i) => i.onHand < i.par)
    assert.ok(below.length >= 2, 'at least two items below par at seed')
    assert.ok(w.threads.filter((t) => t.category === 'reply').length >= 3, 'three replies waiting')
    assert.ok(w.orders.some((o) => o.status === 'draft'), 'a draft order exists')
    assert.ok(w.rules.every((r) => r.text.length > 20), 'rules read as sentences')
    const spent = w.shifts.reduce((sum, sh) => {
      const rate = w.staff.find((p) => p.id === sh.staffId)?.rate ?? 18
      return sum + ((sh.end - sh.start) / 60) * rate
    }, 0)
    assert.ok(spent < w.weekBudget, 'labor starts under budget')
    assert.ok(spent > w.weekBudget * 0.8, 'budget bar is not empty theater')
  }
})

test('milk crossing lands in the first minute of the program', () => {
  const evs = buildProgram(497000)
  assert.deepEqual(
    evs.map((e) => e.at),
    [...evs.map((e) => e.at)].sort((x, y) => x - y),
    'events sorted',
  )
  const milk = evs.find((e) => e.kind === 'drain' && e.itemId === 'milk-hl')
  assert.ok(milk && milk.at <= 60, 'milk drops below par within a minute')
  const last = evs[evs.length - 1]
  assert.ok(last.at > 3000, 'program covers most of the hour')
})

test('hour seed changes exactly on the hour', () => {
  const t = Date.UTC(2026, 8, 11, 14, 59, 59, 999)
  assert.equal(hourSeed(t) + 1, hourSeed(t + 1))
  assert.equal(hourSeed(t), hourSeed(t - 3599999))
})

test('order pdf is structurally valid and carries the disclaimer', async () => {
  const w = generateWorld(497000)
  const order = w.orders[0]
  const vendor = w.vendors.find((v) => v.id === order.vendorId)
  const bytes = orderPdf(order, vendor, 'September 11, 2026')
  const text = Buffer.from(bytes).toString('latin1')
  assert.ok(text.startsWith('%PDF-1.4'), 'pdf header')
  assert.ok(text.endsWith('%%EOF'), 'pdf trailer')

  // Every xref offset must point at its object header.
  const xrefAt = Number(text.match(/startxref\n(\d+)\n/)[1])
  assert.equal(text.slice(xrefAt, xrefAt + 4), 'xref')
  const entries = [...text.matchAll(/^(\d{10}) 00000 n /gm)].map((m) => Number(m[1]))
  entries.forEach((off, i) => {
    assert.match(text.slice(off, off + 12), new RegExp('^' + (i + 1) + ' 0 obj'), 'offset ' + i)
  })

  // And a real parser must agree.
  const require = createRequire(import.meta.url)
  const { getDocument } = require('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument({ data: bytes }).promise
  const page = await doc.getPage(1)
  const content = await page.getTextContent()
  const all = content.items.map((i) => i.str).join(' ')
  assert.ok(all.includes('Larkspur Bakery'))
  assert.ok(all.includes('Fictional demo document'))
})

test('copy in the seed world follows the banned character rules', () => {
  const w = generateWorld(497000)
  const texts = [
    ...w.threads.flatMap((t) => [t.subject, t.summary ?? '', t.draft ?? '', ...t.msgs.map((m) => m.text)]),
    ...w.rules.map((r) => r.text),
    ...w.runLog.map((l) => l.text),
    w.weather.note,
    w.weather.cond,
  ]
  for (const t of texts) {
    assert.ok(!/[–—]/.test(t), 'no dashes in: ' + t)
    assert.ok(!t.includes('!'), 'no exclamation in: ' + t)
    assert.ok(!/\p{Extended_Pictographic}/u.test(t), 'no emoji in: ' + t)
  }
})
