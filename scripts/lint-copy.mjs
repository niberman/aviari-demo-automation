// Copy rules gate. No em dashes, en dashes, exclamation points, or emoji in
// any user facing copy: app strings, README, DECISIONS, index.html.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DASHES = /[–—]/
const EMOJI = /\p{Extended_Pictographic}/u

const problems = []

function checkWhole(file, text) {
  text.split('\n').forEach((line, i) => {
    if (DASHES.test(line)) problems.push(`${file}:${i + 1} has an em or en dash`)
    if (EMOJI.test(line)) problems.push(`${file}:${i + 1} has an emoji`)
  })
}

function checkBang(file, text, { strings }) {
  text.split('\n').forEach((line, i) => {
    if (strings) {
      // Only string literal contents matter in code files.
      const lits = line.match(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g) ?? []
      for (const lit of lits) {
        const inner = lit.slice(1, -1)
        if (inner.includes('!')) problems.push(`${file}:${i + 1} exclamation point in string: ${inner.slice(0, 40)}`)
        if (/[¡]/.test(inner)) problems.push(`${file}:${i + 1} inverted exclamation in string`)
      }
    } else {
      const cleaned = line.replace(/<!(doctype|--)/gi, '').replace(/!\[/g, '')
      if (cleaned.includes('!')) problems.push(`${file}:${i + 1} exclamation point`)
    }
  })
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

for (const f of walk('src')) {
  const text = readFileSync(f, 'utf8')
  checkWhole(f, text)
  if (/\.(ts|tsx)$/.test(f)) checkBang(f, text, { strings: true })
}

for (const f of ['README.md', 'DECISIONS.md', 'index.html']) {
  if (!existsSync(f)) continue
  const text = readFileSync(f, 'utf8')
  checkWhole(f, text)
  checkBang(f, text, { strings: false })
}

if (problems.length > 0) {
  console.error('Copy lint failed:')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log('Copy lint passed: no banned punctuation or emoji in copy.')
