// The mid-motion detectors catch what they claim to: plants a ghost (faded out, then drawn again)
// and a jump (a glide cut short and restarted far away) on a blank page, and a clean glide that
// must not be flagged. Usage: node packages/scripts/motion-stress/selftest.mjs
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const { chromium } = createRequire(here('../../ui/package.json'))('playwright')
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(
  '<section class="demo"><div id="g">glide</div><div id="gh">ghost</div><div id="j">jump</div><div id="w">wrap</div></section>',
)
await page.addScriptTag({ content: readFileSync(here('page.js'), 'utf8') })
const flags = await page.evaluate(async () => {
  const frame = () => new Promise(requestAnimationFrame)
  const el = (id) => document.getElementById(id)
  for (const id of ['g', 'gh', 'j', 'w'])
    Object.assign(el(id).style, { position: 'absolute', top: '10px', left: '0' })
  window.__stress.begin(0)
  // a clean glide, eased: never flagged
  el('g').animate([{ translate: '0' }, { translate: '300px' }], {
    duration: 500,
    easing: 'ease-out',
    fill: 'forwards',
  })
  // faded out, then back at full strength
  el('gh').animate(
    [{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }],
    { duration: 600 },
  )
  // gliding 12px a frame, then 200px in one
  let x = 0
  for (let i = 0; i < 12; i++) {
    x += 12
    el('j').style.translate = `${x}px`
    await frame()
  }
  el('j').style.translate = `${x + 200}px`
  await frame()
  // a looping card wrapping round behind the others: far, but unseen
  let w = 0
  el('w').style.opacity = '0'
  for (let i = 0; i < 12; i++) {
    w += 12
    el('w').style.translate = `${w}px`
    await frame()
  }
  el('w').style.translate = `${w + 900}px`
  await frame()
  await new Promise((r) => setTimeout(r, 700))
  return window.__stress.end()
})
await browser.close()
const flagged = Object.values(flags).filter((m) => m.flags?.length)
const by = (text) => flagged.some((m) => m.flags.some((f) => f.includes(text)))
const results = [
  ['a ghost is caught', by('faded out, then showed again')],
  ['a jump in a glide is caught', by('then jumped')],
  ['a clean glide is not flagged', !flagged.some((m) => m.label.includes('glide'))],
  ['an unseen wrap-around is not flagged', !flagged.some((m) => m.label.includes('wrap'))],
]
for (const [name, ok] of results) console.log(ok ? 'PASS' : 'FAIL', name)
if (results.some(([, ok]) => !ok)) {
  console.log(JSON.stringify(flags, null, 1))
  process.exit(1)
}
