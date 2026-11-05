// A page that comes in through an out-in Transition is created before it's placed: its entrances
// wait for it to be in the page, then play, `after` included.
import '../src/style.css'
import { afterEach, expect, test } from 'vitest'
import { createApp, h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

const frame = () => new Promise(requestAnimationFrame)
let host: HTMLElement | undefined
afterEach(() => host?.remove())

async function opacities(selectors: string[], ms: number) {
  const seen: number[][] = []
  const t0 = performance.now()
  while (performance.now() - t0 < ms) {
    seen.push(selectors.map((s) => Number(getComputedStyle(host!.querySelector(s)!).opacity)))
    await frame()
  }
  return seen
}

test('mounted while detached: unseen until placed, then the entrance plays, `after` waiting as it should', async () => {
  host = document.createElement('div')
  const rise = { initial: { opacity: 0, y: 6 }, duration: 240 }
  createApp({
    render: () =>
      h('div', [
        withDirectives(h('h1', { class: 'hero' }, 'Hero'), [[vAnimate, rise, 'hero']]),
        withDirectives(h('p', { class: 'rest' }, 'Rest'), [
          [vAnimate, { ...rise, after: 'hero:50%' }, 'rest'],
        ]),
        withDirectives(h('p', { class: 'plain' }, 'Plain'), [[vAnimate, rise]]),
        withDirectives(h('i', { class: 'one' }, '1'), [
          [vAnimate, { ...rise, stagger: 0.12 }, 'rows'],
        ]),
        withDirectives(h('i', { class: 'two' }, '2'), [
          [vAnimate, { ...rise, stagger: 0.12 }, 'rows'],
        ]),
      ]),
  }).mount(host)
  // The old page leaving.
  await new Promise((r) => setTimeout(r, 150))
  document.body.append(host)
  const seen = await opacities(['.hero', '.rest', '.plain', '.one', '.two'], 900)

  // The first frame placed shows nothing yet: no flash of the end look.
  expect(seen[0]!.every((o) => o < 0.05)).toBe(true)
  // Each one passes through the middle of its entrance, then ends shown.
  for (const i of [0, 1, 2]) expect(seen.some((row) => row[i]! > 0.1 && row[i]! < 0.9)).toBe(true)
  expect(seen.at(-1)).toEqual([1, 1, 1, 1, 1])
  // Placed together, they still stagger as one group: the second row starts after the first.
  const firstMoves = seen.findIndex((row) => row[3]! > 0.05)
  expect(seen[firstMoves]![4]!).toBeLessThan(0.05)
  // `rest` waits for `hero`: when hero is halfway in, rest has barely started.
  const half = seen.find((row) => row[0]! >= 0.5)!
  expect(half[1]!).toBeLessThan(0.3)
})
