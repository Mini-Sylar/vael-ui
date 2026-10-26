// An element travelling under a layoutId passes over what's around it, not behind it.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('a detail growing from a card travels over the cards it passes, then sits back in the flow', async () => {
  const picked = shallowRef(0)
  // Cards with their own stacking context, as hover and layout motion give them.
  const card = (id: number) =>
    picked.value === id
      ? null
      : withDirectives(
          h('article', {
            class: `card card-${id}`,
            style: 'height: 80px; background: #ddd; will-change: transform',
          }),
          [[vAnimate, { layoutId: `card-${id}`, duration: 2000 }]],
        )
  const screen = await render(() =>
    h('div', [
      picked.value
        ? withDirectives(
            h('section', { class: 'detail', style: 'height: 200px; background: #888' }),
            [[vAnimate, { layoutId: `card-${picked.value}`, duration: 2000 }]],
          )
        : null,
      // The grid slides down as the detail opens above it, so its first row is in the way.
      withDirectives(
        h('div', { style: 'display: grid; grid-template-columns: 100px 100px; gap: 10px' }, [
          card(1),
          card(2),
          card(3),
        ]),
        [[vAnimate, { layout: 'position', duration: 2000 }]],
      ),
    ]),
  )
  await new Promise((resolve) => setTimeout(resolve, 100))
  picked.value = 3
  await nextTick()
  const detail = await vi.waitFor(() => {
    const el = screen.container.querySelector<HTMLElement>('.detail')
    if (!el?.getAnimations().length) throw new Error('not travelling yet')
    return el
  })
  for (const run of document.getAnimations()) {
    run.pause()
    run.currentTime = 1000
  }
  // Where it overlaps a card on its way, it's the one seen.
  const box = detail.getBoundingClientRect()
  const overlaps = [...screen.container.querySelectorAll('.card')]
    .map((card) => card.getBoundingClientRect())
    .map((c) => ({
      left: Math.max(c.left, box.left),
      right: Math.min(c.right, box.right),
      top: Math.max(c.top, box.top),
      bottom: Math.min(c.bottom, box.bottom),
    }))
    .filter((o) => o.right - o.left > 4 && o.bottom - o.top > 4)
  expect(overlaps.length).toBeGreaterThan(0)
  for (const o of overlaps)
    expect(document.elementFromPoint((o.left + o.right) / 2, (o.top + o.bottom) / 2)).toBe(detail)
  // Landed: back to its own stacking.
  for (const run of detail.getAnimations()) run.finish()
  await vi.waitFor(() => expect(detail.style.zIndex).toBe(''))
})
