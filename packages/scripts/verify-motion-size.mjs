#!/usr/bin/env node
// Run after `pnpm build`. The CSS engine ships with the components (every animating one plays
// through it); the runtime (hooks, steps) and the morph kit load only when used. Fails if Dialog
// starts loading either of those up front, or if anything outgrows its budget.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const dist = join(dirname(fileURLToPath(import.meta.url)), '../ui/dist')
// Measured sizes plus a little headroom: a budget catches regressions, it is not a target. Raise
// one only for a deliberate, measured change, and say why here.
// up front 2.5 → 7 KB (2026-10-22): the CSS engine is bundled; lazily, the first open waited ~1s on
// slow 3G. Runtime and morph stay lazy.
const BUDGET = { upFront: 7 * 1024, runtime: 6.5 * 1024, morph: 1 * 1024 }

// Every chunk a file pulls in statically.
function closure(file, seen = new Set()) {
  if (seen.has(file) || !existsSync(file)) return seen
  seen.add(file)
  for (const [, rel] of readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*"(\.[^"]+\.js)"/g))
    closure(normalize(join(dirname(file), rel)), seen)
  return seen
}
const gz = (files) => [...files].reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0)
const isMotion = (f) =>
  /[\\/]motion[\\/]|(?:^|[\\/])(?:ids|runner|css|engine|schedule|warn|size|list|playable|targets|values|useComponentMotion|context|morph|springEasing|springStep)[-.]/.test(
    f,
  )
const chunk = (name) => readdirSync(dist).find((f) => new RegExp(`^${name}-.*\\.js$`).test(f))

const dialog = closure(join(dist, 'components/Dialog/Dialog.js'))
const upFront = [...dialog].filter(isMotion)
const failures = []
for (const lazy of ['runner', 'morph']) {
  if (!chunk(lazy)) failures.push(`no ${lazy} chunk: it is no longer split out`)
  if (upFront.some((f) => new RegExp(`(?:^|[\\\\/])${lazy}-[^/\\\\]*\\.js$`).test(f)))
    failures.push(`Dialog loads ${lazy} up front: keep it behind its loader`)
}
const beyond = (file) =>
  file ? gz([...closure(join(dist, file))].filter((f) => !dialog.has(f))) : 0
const sizes = {
  upFront: gz(upFront),
  runtime: beyond(chunk('runner')),
  morph: beyond(chunk('morph')),
}
for (const [name, size] of Object.entries(sizes))
  if (size > BUDGET[name]) failures.push(`motion ${name} ${size} B gz > ${BUDGET[name]} B`)

if (failures.length) {
  console.error(`Motion size check failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(
  `OK: motion costs Dialog ${kb(sizes.upFront)} gz up front (the CSS engine included); on demand, the runtime ${kb(sizes.runtime)}, morph ${kb(sizes.morph)}.`,
)
