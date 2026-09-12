// Ship the committed preview assets with the built site so the poster and
// clips are servable from the deployed origin. Skips quietly if absent.

import { cpSync, existsSync } from 'node:fs'

if (existsSync('preview')) {
  cpSync('preview', 'dist/preview', { recursive: true })
  console.log('Copied preview assets into dist.')
} else {
  console.log('No preview directory yet, skipping.')
}
