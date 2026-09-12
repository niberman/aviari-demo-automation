// Preview clip capture. Renders the morning brief loading, then the milk
// crossing that drafts a reorder, as 180 deterministic frames by driving the
// Web Animations clock by hand, then encodes 6s 1200x750 MP4 + WebM + poster.

import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ffmpeg = require('ffmpeg-static')

const base = 'http://localhost:4173'
const FPS = 30
const FRAMES = FPS * 6
const JUMP_AT = Math.round(3.1 * FPS) // frame where the milk crossing fires
const dir = 'frames'

rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })
mkdirSync('preview', { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 750 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
})
const page = await ctx.newPage()

// Sim nearly frozen (speed 0.001) so no stray events land mid clip; the one
// crossing is fired by hand at JUMP_AT. Toast lifetimes scale with speed.
await page.goto(base + '/?clock=36&speed=0.001', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.addStyleTag({ content: 'html { scrollbar-width: none } ::-webkit-scrollbar { display: none } * { caret-color: transparent }' })
await page.waitForTimeout(600)

// Restart the reveal with the settle timer held off, then step time by hand.
await page.evaluate(() => {
  window.__captureHold = true
  window.__demo.replay()
})
await page.waitForTimeout(150)

const step = async (t) => {
  await page.evaluate((now) => {
    window.__seen = window.__seen || new Map()
    for (const a of document.getAnimations()) {
      if (!window.__seen.has(a)) window.__seen.set(a, now)
      a.pause()
      try {
        a.currentTime = Math.max(0, now - window.__seen.get(a))
      } catch {
        // finished or detached animations can refuse a clock, fine
      }
    }
  }, t)
}

const pad = (n) => String(n).padStart(3, '0')
for (let f = 0; f < FRAMES; f++) {
  if (f === JUMP_AT) {
    await page.evaluate(() => window.__demo.jump(42.5))
  }
  if (f === 152) {
    await page.locator('.toast .t-x').click().catch(() => {})
  }
  await step((f * 1000) / FPS)
  await page.screenshot({ path: `${dir}/f${pad(f)}.png`, animations: 'allow' })
  if (f % 30 === 0) console.log('frame', f)
}

await browser.close()

const run = (args) => execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] })

console.log('encoding mp4')
run([
  '-y', '-framerate', String(FPS), '-i', `${dir}/f%03d.png`,
  '-vf', 'scale=1200:750:flags=lanczos',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '19',
  '-movflags', '+faststart', '-an', 'preview/loop.mp4',
])
console.log('encoding webm')
run([
  '-y', '-framerate', String(FPS), '-i', `${dir}/f%03d.png`,
  '-vf', 'scale=1200:750:flags=lanczos',
  '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-an', 'preview/loop.webm',
])
console.log('poster')
run([
  '-y', '-i', `${dir}/f${pad(FRAMES - 2)}.png`,
  '-vf', 'scale=1200:750:flags=lanczos', '-frames:v', '1', '-update', '1', 'preview/poster.png',
])
console.log('capture complete')
