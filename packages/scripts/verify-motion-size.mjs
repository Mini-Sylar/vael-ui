#!/usr/bin/env node
// Run after `pnpm build`. Motion must cost a component almost nothing until it's customised: the
// shell is always loaded; the CSS engine (static motion) and the runtime (hooks, steps) only on
// demand. Fails if any outgrows its budget, or if the shell imports an engine statically.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const dist = join(dirname(fileURLToPath(import.meta.url)), '../ui/dist')
// Measured sizes plus a little headroom: a budget catches regressions, it is not a target. Raise
// one only for a deliberate, measured change, and say why here.
// css 4 → 4.5 KB (2026-10-21): morph's glue stays in the engine (~0.4 KB); its kit is lazy (0.7 KB).
const BUDGET = { shell: 2.5 * 1024, css: 4.5 * 1024, runtime: 6.5 * 1024 }

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
  /[\\/]motion[\\/]|(?:^|[\\/])(?:ids|runner|css|engine|schedule|warn|size|list|playable|targets|values|useComponentMotion|context)-/.test(
    f,
  )
const chunk = (name) => readdirSync(dist).find((f) => new RegExp(`^${name}-.*\\.js$`).test(f))

const dialog = closure(join(dist, 'components/Dialog/Dialog.js'))
const shell = [...dialog].filter(isMotion)
const runnerFile = chunk('runner')
const cssFile = chunk('css')
const failures = []
if (!runnerFile) failures.push('no runner chunk: the motion runtime is no longer split out')
if (!cssFile) failures.push('no css chunk: the CSS engine is no longer split out')
if (shell.some((f) => /(?:runner|css|engine)-[^/\\]*\.js$/.test(f)))
  failures.push('Dialog loads an engine statically: keep css/runner behind their loaders')
// What each engine adds beyond what Dialog already loaded.
const beyond = (file) =>
  file ? gz([...closure(join(dist, file))].filter((f) => !dialog.has(f))) : 0
const sizes = { shell: gz(shell), css: beyond(cssFile), runtime: beyond(runnerFile) }
for (const [name, size] of Object.entries(sizes))
  if (size > BUDGET[name]) failures.push(`motion ${name} ${size} B gz > ${BUDGET[name]} B`)

if (failures.length) {
  console.error(`Motion size check failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(
  `OK: motion costs Dialog ${kb(sizes.shell)} gz up front; on demand, the CSS engine ${kb(sizes.css)}, the runtime ${kb(sizes.runtime)}.`,
)
