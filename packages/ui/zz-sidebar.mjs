import { chromium } from 'playwright'
const out = '/private/tmp/claude-502/-Users-terence-Desktop-Projects-vue-u-ui/42e22ab8-39c4-40b8-9589-6be32226488e/scratchpad'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: `${out}/auth.json` })
await ctx.addInitScript(() => {
  window.__anims = []
  const orig = Element.prototype.animate
  Element.prototype.animate = function (...a) {
    const run = orig.apply(this, a)
    if (this.closest?.('.sidebar-projects')) window.__anims.push({ t: Math.round(performance.now()), tag: this.tagName, cls: String(this.className).slice(0, 30), id: run.id, kf: JSON.stringify(a[0]).slice(0, 80) })
    return run
  }
  window.__rows = []
  new MutationObserver(() => {
    const n = document.querySelectorAll('.sidebar-projects .nav-link').length
    if (window.__rows.at(-1)?.n !== n) window.__rows.push({ t: Math.round(performance.now()), n })
  }).observe(document, { childList: true, subtree: true })
})
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => (m.type() === 'warning' || m.type() === 'error') && logs.push(m.text().slice(0, 160)))
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500); await page.screenshot({ path: out + '/app-home.png' }); console.log('projects lists:', await page.locator('.sidebar-projects').count(), 'rows:', await page.locator('.sidebar-projects [data-project-id], .sidebar-projects a').count())
const r = await page.evaluate(() => ({ anims: window.__anims, rows: window.__rows }))
console.log('rows over time:', JSON.stringify(r.rows.slice(0, 8)))
console.log('animations on sidebar rows:', r.anims.length)
console.log(JSON.stringify(r.anims.slice(0, 6), null, 0))
console.log('warnings:', logs.filter((l) => /vael|motion/i.test(l)).slice(0, 5))
await browser.close()
