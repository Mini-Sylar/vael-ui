// Vapor: motion turned off on the provider at runtime: a replay plays nothing, its callback runs.
import { expect, test, vi } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import MotionOffReplayVaporRoot from './fixtures/MotionOffReplayVaporRoot.vue'

test('Vapor: after turning motion off, a Badge replay starts nothing and calls onAfterEnter', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(MotionOffReplayVaporRoot)
  const root = app.mount(host) as unknown as { on: boolean; count: number; afterEnter: number }
  try {
    await new Promise((resolve) => setTimeout(resolve, 100))
    root.on = false
    await nextTick()
    root.count = 1
    await nextTick()
    await new Promise(requestAnimationFrame)
    const badge = host.querySelector('.ui-badge')!
    // Watched for a while: the appearance code loads on demand, a frame or two later.
    let moved = 0
    let lowest = 1
    for (let frame = 0; frame < 20; frame++) {
      await new Promise(requestAnimationFrame)
      moved += badge.getAnimations().length
      lowest = Math.min(lowest, Number(getComputedStyle(badge).opacity))
    }
    expect(moved).toBe(0)
    expect(lowest).toBe(1)
    await vi.waitFor(() => expect(root.afterEnter).toBe(1))
  } finally {
    app.unmount()
    host.remove()
  }
})
