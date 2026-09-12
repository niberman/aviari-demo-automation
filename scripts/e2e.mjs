// Interaction test pass over the built app. Run: npm run e2e
// Assumes `vite preview` is serving dist on :4173.

import { chromium } from 'playwright'
import { strict as assert } from 'node:assert'
import { createRequire } from 'node:module'

const base = 'http://localhost:4173'
const require = createRequire(import.meta.url)
let passed = 0

async function step(name, fn) {
  try {
    await fn()
    passed++
    console.log('ok · ' + name)
  } catch (err) {
    console.error('FAIL · ' + name)
    throw err
  }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, colorScheme: 'dark' })
const page = await ctx.newPage()
page.on('pageerror', (e) => {
  throw new Error('page error: ' + e.message)
})

await step('banner is exact, 12px, and not dismissible', async () => {
  await page.goto(base + '/?clock=30', { waitUntil: 'networkidle' })
  const banner = page.locator('.banner')
  assert.equal((await banner.textContent()).trim(), 'Demo. Fictional data. Resets hourly.')
  assert.equal(await banner.evaluate((el) => getComputedStyle(el).fontSize), '12px')
  assert.equal(await banner.locator('button').count(), 0)
})

await step('brief renders fast with greeting and sales', async () => {
  const t0 = Date.now()
  await page.goto(base + '/?clock=30', { waitUntil: 'domcontentloaded' })
  await page.getByText('Good morning, Dana').waitFor({ state: 'visible', timeout: 2000 })
  assert.ok(Date.now() - t0 < 2000, 'landed within 2s')
  await page.getByText('Yesterday · Highlands').waitFor()
})

await step('milk crossing drafts an order live with a toast', async () => {
  await page.goto(base + '/?clock=38&speed=4', { waitUntil: 'networkidle' })
  await page.getByText('Whole milk fell below par at Highlands').waitFor({ timeout: 8000 })
  await page.locator('.par-row', { hasText: 'Whole milk' }).getByText('Draft ready').waitFor()
})

await step('one tap reorder drafts from the brief', async () => {
  await page.goto(base + '/?clock=20', { waitUntil: 'networkidle' })
  const row = page.locator('.par-row', { hasText: 'Butter' })
  await row.getByRole('button', { name: 'Draft reorder' }).click()
  await page.getByText('Reorder drafted').first().waitFor()
  await row.getByText('Draft ready').waitFor()
})

await step('inbox send updates the thread and moves it to done', async () => {
  await page.goto(base + '/inbox?clock=30', { waitUntil: 'networkidle' })
  await page.locator('.thread-row', { hasText: 'Marta Delgado' }).click()
  const draft = page.locator('.draft textarea')
  const text = await draft.inputValue()
  assert.ok(text.includes('Marta'), 'draft prefilled')
  await draft.fill(text + ' See you then.')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.locator('.bubble.out', { hasText: 'See you then.' }).waitFor()
  await page.locator('.draft').waitFor({ state: 'detached' })
  const doneTab = page.locator('.seg button', { hasText: 'Done' })
  await doneTab.click()
  await page.locator('.thread-row', { hasText: 'Marta Delgado' }).waitFor()
})

await step('sending an order downloads a valid PDF and marks it sent', async () => {
  await page.goto(base + '/orders?clock=20', { waitUntil: 'networkidle' })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.card', { hasText: 'Juniper Box Supply' }).getByRole('button', { name: 'Send order' }).click(),
  ])
  const path = await download.path()
  const { getDocument } = require('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await getDocument(path).promise
  const pg = await doc.getPage(1)
  const content = await pg.getTextContent()
  const textAll = content.items.map((i) => i.str).join(' ')
  assert.ok(textAll.includes('Larkspur Bakery'), 'pdf header')
  assert.ok(textAll.includes('Juniper Box Supply'), 'pdf vendor')
  assert.ok(textAll.includes('Fictional demo document'), 'pdf disclaimer')
  await page.locator('.card', { hasText: 'Juniper Box Supply' }).getByText(/Sent 6:/).waitFor()
  await page.getByText('went out as a PDF').waitFor()
})

await step('rule off means no auto draft, manual button instead', async () => {
  await page.goto(base + '/automations?clock=20', { waitUntil: 'networkidle' })
  const milkRule = page.locator('.rule', { hasText: 'milk falls below 20 gallons' })
  await milkRule.getByRole('switch').click()
  assert.equal(await milkRule.getByRole('switch').getAttribute('aria-checked'), 'false')
  await page.evaluate(() => window.__demo.jump(60))
  await page.getByRole('link', { name: 'Morning brief' }).click()
  const milkRow = page.locator('.par-row', { hasText: 'Whole milk' })
  await milkRow.getByRole('button', { name: 'Draft reorder' }).waitFor()
  assert.equal(await milkRow.getByText('Draft ready').count(), 0)
})

await step('keyboard moves a shift', async () => {
  await page.goto(base + '/schedule?clock=20', { waitUntil: 'networkidle' })
  const shift = page.locator('[data-day="0"] .shift', { hasText: 'Nia' })
  await shift.focus()
  await page.keyboard.press('Enter')
  await page.locator('.move-hint').waitFor()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await page.locator('[data-day="1"] .shift', { hasText: 'Nia' }).nth(0).waitFor()
})

await step('mouse drags a shift to another day', async () => {
  await page.goto(base + '/schedule?clock=20', { waitUntil: 'networkidle' })
  const shift = page.locator('[data-day="2"] .shift', { hasText: 'Rosa' }).first()
  const from = await shift.boundingBox()
  const target = await page.locator('[data-day="3"]').boundingBox()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + 200, { steps: 12 })
  await page.mouse.up()
  const thu = page.locator('[data-day="3"] .shift', { hasText: 'Rosa' })
  assert.ok((await thu.count()) >= 1, 'shift landed on Thursday')
})

await step('suggestion accept fills the Saturday gap', async () => {
  await page.goto(base + '/schedule?clock=20', { waitUntil: 'networkidle' })
  await page.locator('.seg button', { hasText: 'Five Points' }).click()
  await page.locator('[data-day="5"] .gap-card').waitFor()
  await page
    .locator('.suggest-card', { hasText: 'Saturday counter' })
    .getByRole('button', { name: 'Add shift' })
    .click()
  await page.locator('[data-day="5"] .gap-card').waitFor({ state: 'detached' })
  await page.locator('[data-day="5"] .shift', { hasText: 'Priya' }).waitFor()
})

await step('staff view speaks Spanish', async () => {
  await page.goto(base + '/schedule?clock=20', { waitUntil: 'networkidle' })
  await page.locator('.seg button', { hasText: 'Staff view' }).click()
  await page.locator('.seg button', { hasText: 'Español' }).click()
  await page.getByText('Turnos de la semana').waitFor()
  await page.getByText('Mostrador').first().waitFor()
})

await step('deep links load every screen directly', async () => {
  for (const r of ['/inbox', '/schedule', '/orders', '/automations']) {
    const res = await page.goto(base + r, { waitUntil: 'domcontentloaded' })
    assert.equal(res.status(), 200)
    await page.locator('h1').first().waitFor()
  }
})

await step('no horizontal scroll at 375px on any screen', async () => {
  const m = await browser.newContext({ viewport: { width: 375, height: 700 }, colorScheme: 'dark' })
  const mp = await m.newPage()
  for (const r of ['/', '/inbox', '/schedule', '/orders', '/automations']) {
    await mp.goto(base + r + '?clock=30', { waitUntil: 'networkidle' })
    await mp.waitForTimeout(600)
    const over = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    assert.ok(over <= 1, r + ' overflows by ' + over + 'px')
    const tabbar = await mp.locator('.tabbar').isVisible()
    assert.ok(tabbar, 'tab bar visible on ' + r)
  }
  await m.close()
})

await step('mobile inbox opens the thread as an overlay and returns', async () => {
  const m = await browser.newContext({ viewport: { width: 375, height: 700 }, colorScheme: 'dark' })
  const mp = await m.newPage()
  await mp.goto(base + '/inbox?clock=30', { waitUntil: 'networkidle' })
  await mp.locator('.thread-row', { hasText: 'Marta Delgado' }).click()
  await mp.locator('.thread-pane.overlay').waitFor()
  await mp.getByRole('button', { name: 'Back to the thread list' }).click()
  await mp.locator('.thread-pane.overlay').waitFor({ state: 'hidden' })
  await m.close()
})

await step('reduced motion skips the reveal', async () => {
  const rm = await browser.newContext({
    viewport: { width: 1360, height: 860 },
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  })
  const rp = await rm.newPage()
  await rp.goto(base + '/?clock=30', { waitUntil: 'domcontentloaded' })
  await rp.getByText('Good morning, Dana').waitFor()
  const op = await rp.locator('.card').first().evaluate((el) => getComputedStyle(el).opacity)
  assert.equal(op, '1')
  await rm.close()
})

await step('tab order reaches nav, cards, and actions', async () => {
  await page.goto(base + '/?clock=20', { waitUntil: 'networkidle' })
  const seen = new Set()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const tag = await page.evaluate(() => {
      const el = document.activeElement
      return el ? el.tagName + ':' + (el.textContent ?? '').slice(0, 24).trim() : ''
    })
    seen.add(tag)
  }
  const all = [...seen].join(' | ')
  assert.ok(all.includes('Skip to content'), 'skip link first')
  assert.ok(all.includes('Draft reorder') || all.includes('Open schedule'), 'card actions reachable')
})

await browser.close()
console.log(`\n${passed} e2e checks passed`)
