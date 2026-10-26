// `animate()` under reduced motion: movement goes straight to its end; only the fade plays.
import { expect, test, vi } from 'vitest'
import { animate } from '../src/motion/animate'

vi.mock('../src/composables/dom', async (original) => ({
  ...(await original<typeof import('../src/composables/dom')>()),
  prefersReducedMotion: () => true,
}))

test('a flight under reduced motion jumps to its end and only fades', async () => {
  const el = document.createElement('div')
  el.style.cssText = 'position: fixed; left: 0; top: 0; width: 40px; height: 40px'
  document.body.append(el)
  const lefts: number[] = []
  void animate(el, { x: 400, y: 200, scale: 0.5, opacity: 0.4 }, { duration: 500 })
  // Until it lands, however long the player takes to load, then a few frames more.
  const deadline = performance.now() + 3000
  let after = 5
  while (after > 0 && performance.now() < deadline) {
    await new Promise(requestAnimationFrame)
    lefts.push(Math.round(el.getBoundingClientRect().left))
    if (lefts.at(-1)! > 390) after--
  }
  // Where it was until the player loads, then its end (scaled about its centre): never in between.
  expect(lefts.every((left) => left === 0 || left > 390)).toBe(true)
  expect(lefts.at(-1)).toBeGreaterThan(390)
  el.remove()
})
