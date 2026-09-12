// Screenshot helper for design review. node scripts/shots.mjs [clockSeconds]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const clock = process.argv[2] ?? '50'
const base = `http://localhost:4173`
const routes = ['/', '/inbox', '/schedule', '/orders', '/automations']

mkdirSync('shots', { recursive: true })
const browser = await chromium.launch()

for (const [w, h, tag, dsf] of [
  [1440, 900, 'desktop', 2],
  [375, 740, 'mobile', 2],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: dsf,
    colorScheme: 'dark',
  })
  const page = await ctx.newPage()
  for (const r of routes) {
    await page.goto(`${base}${r}?clock=${clock}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1600)
    const name = `shots/${tag}${r === '/' ? '-brief' : r.replaceAll('/', '-')}.png`
    await page.screenshot({ path: name, fullPage: r !== '/' ? false : true })
    console.log(name)
  }
  await ctx.close()
}
await browser.close()
