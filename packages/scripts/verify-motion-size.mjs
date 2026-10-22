#!/usr/bin/env node
// Run after `pnpm build`. The CSS engine ships with the components that open and close; the runtime
// (hooks, steps), the morph kit and the states player load only when used. Fails if Dialog or Button
// starts loading any of those up front, if Button picks up the CSS engine, or if anything outgrows
// its budget.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const dist = join(dirname(fileURLToPath(import.meta.url)), '../ui/dist')
// Measured sizes plus a little headroom: a budget catches regressions, it is not a target. Raise
// one only for a deliberate, measured change, and say why here.
// up front 2.5 → 7 KB (2026-10-22): the CSS engine is bundled; lazily, the first open waited ~1s on
// slow 3G. Runtime and morph stay lazy.
// button / states (2026-10-22): `states` on Button, Input, Accordion. Button carries only the check
// for whether states are customised; the player and its listeners load when they are.
// Re-baselined 2026-10-22 when sizes moved to compressed-together (they had been per file).
const BUDGET = {
  upFront: 6 * 1024,
  runtime: 5 * 1024,
  morph: 1 * 1024,
  button: 1 * 1024,
  states: 3.8 * 1024,
}

// Every chunk a file pulls in statically.
function closure(file, seen = new Set()) {
  if (seen.has(file) || !existsSync(file)) return seen
  seen.add(file)
  for (const [, rel] of readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*"(\.[^"]+\.js)"/g))
    closure(normalize(join(dirname(file), rel)), seen)
  return seen
}
// Compressed together, as an app's bundle ships them (per-file gzip overcounts small chunks).
const gz = (files) => gzipSync(Buffer.concat([...files].map((f) => readFileSync(f)))).length
const isMotion = (f) =>
  /[\\/]motion[\\/]|(?:^|[\\/])(?:ids|runner|css|engine|schedule|warn|size|list|playable|targets|values|useComponentMotion|useStateMotion|states|context|morph|springEasing|springStep)[-.]/.test(
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
const button = closure(join(dist, 'components/Button/Button.js'))
const buttonMotion = [...button].filter(isMotion)
const named = (files, name) => files.some((f) => basename(f).startsWith(`${name}-`))
if (!chunk('states')) failures.push('no states chunk: the states player is no longer split out')
for (const lazy of ['states', 'runner', 'morph', 'css'])
  if (named(buttonMotion, lazy)) failures.push(`Button loads ${lazy} up front`)
if (named(upFront, 'states')) failures.push('Dialog loads the states player up front')
const beyond = (file, base = dialog) =>
  file ? gz([...closure(join(dist, file))].filter((f) => !base.has(f))) : 0
const sizes = {
  upFront: gz(upFront),
  runtime: beyond(chunk('runner')),
  morph: beyond(chunk('morph')),
  button: gz(buttonMotion),
  states: beyond(chunk('states'), button),
}
for (const [name, size] of Object.entries(sizes))
  if (size > BUDGET[name]) failures.push(`motion ${name} ${size} B gz > ${BUDGET[name]} B`)

if (failures.length) {
  console.error(`Motion size check failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(
  `OK: motion costs Dialog ${kb(sizes.upFront)} gz up front (the CSS engine included), Button ${kb(sizes.button)}; on demand, the runtime ${kb(sizes.runtime)}, morph ${kb(sizes.morph)}, states ${kb(sizes.states)}.`,
)
