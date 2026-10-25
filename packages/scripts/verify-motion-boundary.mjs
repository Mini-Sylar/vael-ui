#!/usr/bin/env node
// vael-ui/motion depends on nothing in vael-ui outside packages/ui/src/motion, so it can stand on
// its own one day. Components may use motion; motion never reaches back. The one exception: two
// DOM checks (reduced motion, a hidden tab) a separate package would copy.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../ui/src/motion')
const ALLOWED = new Set(['../composables/dom'])
const problems = []
for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
  const source = readFileSync(join(dir, file), 'utf8')
  for (const [, spec] of source.matchAll(/(?:from|import)\s*\(?\s*['"](\.\.\/[^'"]+)['"]/g))
    if (!ALLOWED.has(spec)) problems.push(`motion/${file} imports '${spec}'`)
}
if (problems.length) {
  console.error(`Motion reaches outside motion/:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log('OK: motion/ depends only on itself (and the DOM checks in composables/dom).')
