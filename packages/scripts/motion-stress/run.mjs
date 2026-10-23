// Motion stress: drives every demo in the built docs like a user and checks what must always hold.
//   repeat          a press that cycles (open/close, on/off) moves the same each time round
//   clean at rest   it settles, and leaves no motion marker behind
//   visible at rest nothing it shows is covered by another painted element once it's still
//   console         no "they fight" warning, no page error
// Usage: pnpm stress [--base http://localhost:4175] [--only Dialog,motion/blocks] [--workers N]
//        [--controls 4] [--setup default|off|reduced|rtl|vapor|preset:<name>|all, comma-separated]
//        [--shard 1/3] [--fuzz <steps> [--seed <n>]]: random presses, Escapes, hovers and short
//        waits instead; every failure prints the seed and steps to replay it.
// Built for speed, not looks: every (setup, page) is a job in one pool, each worker has its own
// browser, rest is awaited inside the page in one call, and a press that did nothing isn't repeated.
// Exceptions live in allow.json, each with its reason (optionally for one setup).
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { fileURLToPath } from 'node:url'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const { chromium } = createRequire(here('../../ui/package.json'))('playwright')
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .flatMap((a, i, all) => (a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : [])),
)
const BASE = args.base ?? 'http://localhost:4175'
const WORKERS = Number(args.workers ?? Math.max(1, cpus().length - 1))
const CONTROLS = Number(args.controls ?? 4)
const FUZZ = Number(args.fuzz ?? 0)
const SEED = Number(args.seed ?? 1)
const SETTLE_MS = 2500
const LOOP_MS = 300
const pageScript = readFileSync(here('page.js'), 'utf8')
const allow = JSON.parse(readFileSync(here('allow.json'), 'utf8'))

// The ways a page can be set up, as a user could: the docs' own settings, or the browser's.
const SETUPS = {
  default: {},
  off: { storage: { 'vael-ui-docs-motion': 'false' } },
  reduced: { reducedMotion: 'reduce' },
  rtl: { script: "document.documentElement.setAttribute('dir', 'rtl')" },
  vapor: { storage: { 'vael-ui-docs-default-variant': 'vapor' } },
}
const setupOf = (name) =>
  name.startsWith('preset:')
    ? { storage: { 'vael-ui-docs-motion-preset': name.slice(7) } }
    : SETUPS[name]
const ALL = ['default', 'off', 'reduced', 'rtl', 'vapor', 'preset:bouncy', 'preset:snappy']
const setups = (args.setup === 'all' ? ALL : (args.setup ?? 'default').split(',')).filter((n) => {
  if (setupOf(n)) return true
  console.error(`Unknown setup "${n}"`)
  return false
})

// Every component page, then every Motion page.
const manifest = JSON.parse(
  readFileSync(here('../../../docs/src/generated/demo-manifest.json'), 'utf8'),
)
const MOTION = [
  'motion',
  'motion/start',
  'motion/elements',
  'motion/states',
  'motion/overlays',
  'motion/choreography',
  'motion/springs',
  'motion/styles',
  'motion/engines',
  'motion/blocks',
  'motion/side-by-side',
]
let pages = [...Object.keys(manifest).map((name) => `components/${name}`), ...MOTION]
if (args.only)
  pages = pages.filter((p) => args.only.split(',').some((o) => p === o || p.endsWith(`/${o}`)))

// One job per (setup, page); a shard takes every nth.
let jobs = setups.flatMap((setup) => pages.map((page) => ({ setup, page })))
if (args.shard) {
  const [i, n] = args.shard.split('/').map(Number)
  jobs = jobs.filter((_, k) => k % n === i - 1)
}
const total = jobs.length

const violations = []
const report = (v) => {
  const allowed = allow.find(
    (a) =>
      v.page.includes(a.page) &&
      (!a.demo || v.demo.includes(a.demo)) &&
      v.check === a.check &&
      (!a.setup || a.setup === v.setup),
  )
  violations.push({ ...v, allowed: allowed?.reason })
}

// A seeded random: the same seed replays the same steps.
function random(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// What moved in the third press that should have moved as in the first.
function compare(first, third) {
  const lost = []
  const moved = (m) => (m ? Math.max(m.travel, m.fade * 100) : 0)
  for (const [key, a] of Object.entries(first)) {
    // A hover indicator follows the pointer, which stays on the control after the first press.
    // Nor what runs on the pointer or a timer: a hover indicator, a tooltip, a toast that times out.
    if (/-hover\b|ui-tooltip|ui-toast/.test(a.label)) continue
    const b = third[key]
    // How far it went, and in how many steps: a slide that turned into a pop goes as far in a few.
    const shrank = moved(a) >= 24 && moved(b) < moved(a) * 0.3
    const popped = moved(a) >= 24 && a.frames >= 6 && (b?.frames ?? 0) < a.frames * 0.4
    if (shrank || popped)
      lost.push(
        `${a.label}: moved ${a.travel}px / faded ${a.fade} over ${a.frames} frames the second time, ${b ? `${b.travel}px / ${b.fade} over ${b.frames} frames` : 'not at all'} the fourth`,
      )
  }
  return lost
}

// What a user presses in a demo; never the demo's own Code toggle.
const CONTROL = ['button', '[role="tab"]', '[role="switch"]', '[role="checkbox"]']
  .map((s) => `${s}:not(.demo-code-trigger, [data-stress-skip]):visible`)
  .join(', ')

async function runJob(browser, { setup, page: path }) {
  const { storage = {}, reducedMotion, script } = setupOf(setup)
  const context = await browser.newContext({
    viewport: { width: 1300, height: 900 },
    reducedMotion,
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  await context.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
  }, storage)
  if (script) await context.addInitScript(script)
  await context.addInitScript(pageScript)
  const p = await context.newPage()
  const warnings = []
  p.on(
    'console',
    (m) => m.type() === 'warning' && m.text().includes('they fight') && warnings.push(m.text()),
  )
  p.on('pageerror', (e) => warnings.push(`page error: ${e.message}`))
  const base = { setup, page: path }
  try {
    await p.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await p.waitForSelector('section.demo', { timeout: 8000 }).catch(() => {})
    await p.waitForTimeout(300)
  } catch {
    report({ ...base, demo: '', control: '', check: 'console', detail: 'page did not load' })
    return context.close()
  }

  // After a press: rest, then what's hidden; a loop that never rests is said once per demo.
  let loops = false
  const afterPress = async (d, where, after = '') => {
    const r = await p.evaluate(
      ([i, cap]) => window.__stress.rest(i, cap),
      [d, loops ? LOOP_MS : SETTLE_MS],
    )
    if (r.stuck && !loops) {
      loops = true
      report({
        ...where,
        check: 'clean at rest',
        detail: `still moving ${SETTLE_MS}ms ${after || 'after the press'}: ${JSON.stringify(r.stuck)}`,
      })
    }
    for (const h of r.hidden)
      report({ ...where, check: 'visible at rest', detail: after ? `${h} (${after})` : h })
    return r
  }
  const back = async (url) => {
    if (p.url() === url) return false
    await p.goto(url, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('section.demo', { timeout: 8000 }).catch(() => {})
    return true
  }

  const count = await p.locator('section.demo').count()
  for (let d = 0; d < count; d++) {
    loops = false
    const demo = p.locator('section.demo').nth(d)
    const title =
      (
        (await demo
          .locator('h3')
          .first()
          .textContent({ timeout: 500 })
          .catch(() => '')) ?? ''
      ).trim() || `#${d}`
    await demo.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => {})
    await p.waitForTimeout(80)
    const controls = demo.locator(CONTROL)

    if (FUZZ) {
      const where = { ...base, demo: title, control: 'random steps' }
      const rand = random(SEED * 1000 + d)
      const steps = []
      await p.evaluate((i) => window.__stress.begin(i), d)
      for (let i = 0; i < FUZZ; i++) {
        const n = await controls.count()
        const pick = rand()
        const url = p.url()
        if (pick < 0.55 && n) {
          const c = Math.floor(rand() * n)
          steps.push(`press ${c}`)
          await controls
            .nth(c)
            .click({ force: true, timeout: 600 })
            .catch(() => steps.push('(missed)'))
        } else if (pick < 0.7) {
          steps.push('Escape')
          await p.keyboard.press('Escape')
        } else if (pick < 0.85 && n) {
          const c = Math.floor(rand() * n)
          steps.push(`hover ${c}`)
          await controls
            .nth(c)
            .hover({ force: true, timeout: 600 })
            .catch(() => steps.push('(missed)'))
        }
        const wait = Math.floor(rand() * 300)
        steps.push(`wait ${wait}`)
        await p.waitForTimeout(wait)
        if (await back(url)) break
        if (i % 8 === 7 || i === FUZZ - 1)
          await afterPress(d, where, `seed ${SEED}, steps: ${steps.join(', ')}`)
      }
      await p.evaluate(() => window.__stress.end())
      continue
    }

    const n = Math.min(await controls.count(), CONTROLS)
    for (let c = 0; c < n; c++) {
      const label =
        (
          (await controls
            .nth(c)
            .textContent({ timeout: 500 })
            .catch(() => '')) ?? ''
        )
          .trim()
          .slice(0, 24) || `control ${c}`
      const where = { ...base, demo: title, control: label }
      // The pointer is on it before the first press, so its hover isn't counted as the press.
      await controls
        .nth(c)
        .hover({ force: true, timeout: 1000 })
        .catch(() => {})
      await p.evaluate(([i, cap]) => window.__stress.rest(i, cap), [d, LOOP_MS])
      const runs = []
      // Four presses: the first brings the demo into the cycle (pressing it may have closed
      // another part left open earlier), then the second and fourth start alike and are compared.
      for (let run = 0; run < 4; run++) {
        const url = p.url()
        await p.evaluate((i) => window.__stress.begin(i), d)
        const pressed = await controls
          .nth(c)
          .click({ force: true, timeout: 1000 })
          .then(
            () => true,
            () => false,
          )
        if (!pressed) {
          await p.evaluate(() => window.__stress.end())
          break
        }
        const r = await afterPress(d, where)
        let stuckOpen = false
        if (r.overlay) {
          await p.keyboard.press('Escape')
          let after = await afterPress(d, where, 'after Escape')
          // One that Escape doesn't close (it wants a choice): its own Cancel or Close button.
          if (after.overlay) {
            const close = p
              .locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
              .last()
              .getByRole('button', { name: /^(cancel|close|done|ok|got it|dismiss|not now|×)$/i })
            await close
              .first()
              .click({ force: true, timeout: 600 })
              .catch(() => {})
            after = await afterPress(d, where, 'after its close button')
          }
          stuckOpen = after.overlay
        }
        const moved = await p.evaluate(() => window.__stress.end())
        // Where the press left it: an overlay that opened, and the control's own state.
        const state = await controls
          .nth(c)
          .evaluate((el) =>
            ['aria-expanded', 'aria-pressed', 'aria-checked', 'aria-selected', 'data-state']
              .map((a) => el.getAttribute(a))
              .join('|'),
          )
          .catch(() => '?')
        runs.push({ moved, overlay: r.overlay, state, stuckOpen })
        if (await back(url)) break
        // Nothing moved and nothing opened: pressing it again tells us nothing.
        if (run === 0 && !r.overlay && !Object.keys(moved).length) break
      }
      // Only a press that comes back to where it started: an overlay opened and closed again, or a
      // toggle (on, off, on). Next month, another toast, "Open" when open: the third rightly differs.
      const cycles =
        runs.length === 4 &&
        !runs.some((x) => x.stuckOpen) &&
        ((runs[1].overlay && runs[3].overlay) ||
          (runs[1].state === runs[3].state && runs[1].state !== runs[2].state))
      if (cycles) {
        for (const lost of compare(runs[1].moved, runs[3].moved))
          report({ ...where, check: 'repeat', detail: lost })
        // Worn down since the very first time, and still moving: what a stale leftover does (a
        // slide that only goes one way now). Something that stopped moving altogether is left to
        // the comparison above, since the first press may have closed a part left open earlier.
        for (const [key, a] of Object.entries(runs[0].moved)) {
          const b = runs[3].moved[key]
          if (
            b &&
            a.frames >= 10 &&
            b.frames < a.frames * 0.6 &&
            !/-hover\b|ui-tooltip|ui-toast/.test(a.label)
          )
            report({
              ...where,
              check: 'repeat',
              detail: `${a.label}: moved over ${a.frames} frames the first time, ${b.frames} by the fourth`,
            })
        }
      }
    }
  }
  for (const w of new Set(warnings))
    report({ ...base, demo: '', control: '', check: 'console', detail: w })
  await context.close()
}

const started = Date.now()
let done = 0
await Promise.all(
  Array.from({ length: Math.min(WORKERS, jobs.length) }, async () => {
    // A browser per worker: no queueing behind one shared browser process.
    const browser = await chromium.launch()
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      await runJob(browser, job).catch((e) =>
        report({
          ...job,
          demo: '',
          control: '',
          check: 'console',
          detail: `runner: ${e.message.split('\n')[0]}`,
        }),
      )
      done++
      process.stdout.write(`\r${done}/${total} pages`)
    }
    await browser.close()
  }),
)

const open = violations.filter((v) => !v.allowed)
const out = args.shard ? `report-${args.shard.replace('/', '-of-')}.json` : 'report.json'
writeFileSync(here(out), JSON.stringify(violations, null, 2))
console.log(
  `\n${total} page runs (${setups.length} setup(s), ${WORKERS} workers) in ${Math.round((Date.now() - started) / 1000)}s: ${open.length} problems, ${violations.length - open.length} allowed`,
)
for (const [check, list] of Object.entries(Object.groupBy(open, (v) => v.check))) {
  console.log(`\n${check} (${list.length})`)
  for (const v of list.slice(0, 40))
    console.log(
      `  [${v.setup}] ${v.page} › ${v.demo}${v.control ? ` › ${v.control}` : ''}\n    ${v.detail}`,
    )
}
console.log(`\nFull report: packages/scripts/motion-stress/${out}`)
process.exitCode = open.length ? 1 : 0
