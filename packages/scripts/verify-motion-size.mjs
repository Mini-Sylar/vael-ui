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
// up front 6 → 6.5 KB (2026-10-22): `presence` is counted now (Dialog always loaded it, from a chunk
// this check didn't recognise), plus late appearances (`appear`, `joined`): +0.3 KB on all of Dialog.
// linked (2026-10-22): `linked` loads with its own chunk, 1.5 KB, plus values and timing (shared with
// the runtime and the states player).
// button 1 → 1.25 KB (2026-10-22): every component's appearance (`initial`), `parts` on its ref
// and its own timing as tokens (RFC 3.4, 3.7) live in useStateMotion; their work loads lazily
// (appearance with its batch, the tokens with the states player). Measured: 1219 B.
// runtime 5 → 5.05 KB (2026-10-22): dev warnings are guarded with `process.env.NODE_ENV` so an
// app's bundler drops them and their messages; the guards themselves stay in these files.
// Trim (2026-10-22): up front 7 → 6.85 KB and button 1.25 → 1.05 KB. The morph's orchestration
// (hiding the source, opening, closing) moved from the CSS engine into the morph chunk, so only a
// component that morphs pays for it: morph 1.25 → 1.45 KB. useStateMotion's states merge and its
// appearance work moved into their lazy chunks. In a Vite app (Vue external, gzipped), up front:
// Switch 4.5 KB, Button 6.6 KB, Dialog 16.6 KB, each component and everything it needs.
// up front 6.5 → 6.75 KB (2026-10-22): swap, resize, swap direction, select targets, the morph
// mirror and ready, and late arrivals the runtime plays, against `after` chains and reverse exits
// moved to the runtime (−0.3 KB). A byte pass follows the showcase.
// up front 6.75 → 7 KB (2026-10-22): hidden tabs finish at once, a morph cross-fades with its
// source (open and close), `background-color` in the CSS engine, the swap's synchronous step-out,
// the dev trace hook (the inspection itself is a dev-only chunk). The stress pass's byte shedding
// aims to win this back under 6.75 KB.
// morph 1 → 1.25 KB (2026-10-22): the panel takes the trigger's colour, cross-fades when the trigger
// stays, and carries `layoutId` pairs (a label) between the two. Loaded only by morphing components.
// runtime 5.05 → 5.15 KB, states 3.8 → 3.9 KB (2026-10-23): a plain number in motion values means
// px, or degrees for `rotate` (`width: 100`, `strokeDashoffset: 1`); before, it went in unitless and
// silently didn't animate. Measured +93 B and +94 B; the code is inlined in each lazy chunk.
// up front 6.85 → 7.3 KB, runtime 5.15 → 5.5 KB, morph 1.45 → 1.5 KB, states 3.9 → 4.1 KB
// (2026-10-23): the showpiece parity pass. A replay starts over; reopening mid-close turns around
// from where a replaced panel was; clip wipes to and from none; `color`; a fade keeps your
// duration; each element's own delay and look under one name; `exit: false`; appearances you time
// aren't capped; a `layoutId` starts where it was painted; an icon's <svg> leaves; keyframe arrays,
// exits from `auto` and custom properties in the runtime; per-value timing and springs in states.
// Measured 7411, 5556, 1501 and 4143 B.
// runtime 5.5 → 5.8 KB, states 4.1 → 4.9 KB, button 1.05 → 1.2 KB, linked 2.6 → 2.7 KB
// (2026-10-23): the motion basics. Keyframes take `times`, an easing per step and `repeat` (loops
// that stop with their state); each element of a repeated part plays its own states (Stepper,
// Dock, OtpInput cells) with its own pointer; `animate` holds a look and `progress` scrubs it;
// a component's `replay` and `appear: false` (the watch is on every state component, so Button
// pays ~100 B). Measured 5871, 4925, 1177 and 2705 B.
// states 4.9 → 5.2 KB (2026-10-23): a hover that moves its element off a still cursor holds until
// the cursor leaves the element's resting box, instead of flickering on and off. Measured 5228 B.
// runtime 5.8 → 6.2 KB (2026-10-23): an engine (GSAP, motion) reversed mid-way carries on from
// what's on screen, on the same element or on a part Vue replaced as it reopened. Measured 6262 B.
const BUDGET = {
  upFront: 7.3 * 1024,
  runtime: 6.2 * 1024,
  morph: 1.5 * 1024,
  button: 1.2 * 1024,
  states: 5.2 * 1024,
  linked: 2.7 * 1024,
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
  /[\\/]motion[\\/]|(?:^|[\\/])(?:ids|presence|runner|linked|css|engine|schedule|warn|size|list|playable|targets|values|useComponentMotion|useStateMotion|states|context|morph|springEasing|springStep)[-.]/.test(
    f,
  )
const chunk = (name) => readdirSync(dist).find((f) => new RegExp(`^${name}-.*\\.js$`).test(f))

const dialog = closure(join(dist, 'components/Dialog/Dialog.js'))
const upFront = [...dialog].filter(isMotion)
const failures = []
for (const lazy of ['runner', 'morph', 'linked']) {
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
  linked: beyond(chunk('linked')),
}
for (const [name, size] of Object.entries(sizes))
  if (size > BUDGET[name]) failures.push(`motion ${name} ${size} B gz > ${BUDGET[name]} B`)

if (failures.length) {
  console.error(`Motion size check failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(
  `OK: motion costs Dialog ${kb(sizes.upFront)} gz up front (the CSS engine included), Button ${kb(sizes.button)}; on demand, the runtime ${kb(sizes.runtime)}, morph ${kb(sizes.morph)}, states ${kb(sizes.states)}, linked ${kb(sizes.linked)}.`,
)
