// Vapor: entrances created before their page is placed (an out-in Transition) play once it is.
import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import Root from './fixtures/PlacedLaterVaporRoot.vue'

test('Vapor: mounted while detached, the entrance and its `after` play once placed', async () => {
  const host = document.createElement('div')
  const app = createVaporApp(Root)
  app.mount(host)
  try {
    await new Promise((r) => setTimeout(r, 150))
    document.body.append(host)
    const seen: number[][] = []
    const t0 = performance.now()
    while (performance.now() - t0 < 900) {
      seen.push(
        ['.hero', '.rest'].map((s) => Number(getComputedStyle(host.querySelector(s)!).opacity)),
      )
      await new Promise(requestAnimationFrame)
    }
    expect(seen[0]!.every((o) => o < 0.05)).toBe(true)
    for (const i of [0, 1]) expect(seen.some((row) => row[i]! > 0.1 && row[i]! < 0.9)).toBe(true)
    expect(seen.at(-1)).toEqual([1, 1])
  } finally {
    app.unmount()
    host.remove()
  }
})
