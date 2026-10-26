// Vapor: a drawer whose rows wait on its panel never paints open and at rest on its first open.
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { createVaporApp, nextTick } from 'vue'
import AfterRowsVaporRoot from './fixtures/AfterRowsVaporRoot.vue'

test('Vapor: first open of a drawer with `after` rows: no frame shows it at rest with its rows in', async () => {
  await page.viewport(1200, 800)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(AfterRowsVaporRoot)
  const root = app.mount(host) as unknown as { open: boolean }
  const seen = (el: Element | null) => {
    let o = 1
    for (let at = el; at; at = at.parentElement) o *= Number(getComputedStyle(at).opacity)
    return o
  }
  try {
    await new Promise((resolve) => setTimeout(resolve, 100))
    root.open = true
    await nextTick()
    const frames: { left: number; rows: number }[] = []
    for (let frame = 0; frame < 40; frame++) {
      await new Promise(requestAnimationFrame)
      const panel = document.querySelector('.ui-dialog-panel')
      if (!panel) continue
      frames.push({
        left: Math.round(panel.getBoundingClientRect().left),
        rows: Math.max(...[...document.querySelectorAll('.row')].map(seen)),
      })
    }
    const rest = frames.at(-1)!.left
    const slid = frames.some((f) => Math.abs(f.left - rest) > 20)
    const flash = frames.slice(0, 4).some((f) => Math.abs(f.left - rest) < 1 && f.rows > 0.9)
    expect({
      slid,
      flash,
      first: frames.slice(0, 5).map((f) => `${f.left}/${f.rows.toFixed(2)}`),
    }).toMatchObject({ slid: true, flash: false })
  } finally {
    app.unmount()
    host.remove()
  }
})
