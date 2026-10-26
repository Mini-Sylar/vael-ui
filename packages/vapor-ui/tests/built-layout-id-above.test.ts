// Vapor: a layoutId element arriving above the one leaving starts from where that one was painted,
// not where the arrival pushed it to before it left.
import { expect, test } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import LayoutIdAboveVaporRoot from './fixtures/LayoutIdAboveVaporRoot.vue'

test('Vapor: a detail opened above the grid grows from the card where it was', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(LayoutIdAboveVaporRoot)
  const root = app.mount(host) as unknown as { picked: number }
  try {
    await new Promise(requestAnimationFrame)
    // On the second row: where the detail ends up is far from where it starts.
    const card = host.querySelector('.card-3')!.getBoundingClientRect()
    root.picked = 3
    await nextTick()
    await new Promise(requestAnimationFrame)
    const el = host.querySelector<HTMLElement>('.detail')!
    // At the morph's first frame.
    for (const run of el.getAnimations()) {
      run.pause()
      run.currentTime = 0
    }
    const detail = el.getBoundingClientRect()
    expect(Math.round(detail.top)).toBe(Math.round(card.top))
    expect(Math.round(detail.left)).toBe(Math.round(card.left))
  } finally {
    app.unmount()
    host.remove()
  }
})
