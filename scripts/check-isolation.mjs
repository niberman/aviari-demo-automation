// Build gate. Fails if anything that looks like a production connection
// string or live credential is present in the source tree or environment.
// This demo must not be able to reach a real database, key, or webhook.

import { readdirSync, readFileSync, lstatSync } from 'node:fs'
import { join } from 'node:path'

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vercel', 'preview', 'shots'])
const SELF = 'check-isolation.mjs'

// Assembled so this file does not match itself by accident.
const SCHEMES = ['postgres', 'postgresql', 'mysql', 'mongodb', 'mongodb+srv', 'redis', 'rediss', 'amqp', 'mssql', 'libsql']
const schemeRe = new RegExp('\\b(' + SCHEMES.join('|').replace(/\+/g, '\\+') + '):' + '//\\S+', 'i')
const keyRes = [
  new RegExp('sk_' + 'live_[A-Za-z0-9]{8,}'),
  new RegExp('whsec' + '_[A-Za-z0-9]{8,}'),
  new RegExp('AKIA' + '[0-9A-Z]{16}'),
  new RegExp('hooks\\.slack\\.com/services/'),
  new RegExp('service_role', 'i'),
]

const bad = []

function scan(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    let st
    try {
      st = lstatSync(p)
    } catch {
      continue
    }
    if (st.isSymbolicLink()) continue
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name) && !name.includes('\\')) scan(p)
      continue
    }
    if (name === SELF) continue
    if (!/\.(ts|tsx|js|mjs|json|html|css|md|yml|yaml|env|txt)$/.test(name) && !name.startsWith('.env')) continue
    const text = readFileSync(p, 'utf8')
    const hit = schemeRe.exec(text) ?? keyRes.map((r) => r.exec(text)).find(Boolean)
    if (hit) bad.push(p + ': ' + String(hit[0]).slice(0, 60))
  }
}

scan(process.cwd())

for (const [k, v] of Object.entries(process.env)) {
  if (!v) continue
  if (schemeRe.test(v) || keyRes.some((r) => r.test(v))) {
    bad.push('env ' + k)
  }
}

if (bad.length > 0) {
  console.error('Isolation check failed. Remove these before building:')
  for (const b of bad) console.error('  ' + b)
  process.exit(1)
}
console.log('Isolation check passed: no production connection strings or live keys.')
