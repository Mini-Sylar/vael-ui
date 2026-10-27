// A box that follows its size, as a grid item: stretched by its row, it notes the new size and never
// replays it; its own content leaving still eases it.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, vShow, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('cards in one grid row: details shown and hidden ease the row, and the neighbour never replays it', async () => {
  const open = shallowRef(false)
  const card = (name: string, details: boolean) =>
    withDirectives(
      h('article', { class: name, style: 'display: grid; align-content: start' }, [
        h('div', { style: 'height: 100px' }),
        details
          ? withDirectives(h('dl', { style: 'height: 40px; margin: 0' }), [
              [vShow, open.value],
              [vAnimate, { initial: { opacity: 0, y: -6 }, exit: { opacity: 0, y: -6 } }],
            ])
          : null,
      ]),
      [[vAnimate, { layout: true }]],
    )
  const screen = await render(() =>
    h('div', { style: 'display: grid; grid-template-columns: 200px 200px' }, [
      card('a', true),
      card('b', false),
    ]),
  )
  const a = screen.container.querySelector<HTMLElement>('.a')!
  const b = screen.container.querySelector<HTMLElement>('.b')!
  await new Promise((resolve) => setTimeout(resolve, 300))
  const sized: string[] = []
  const original = Element.prototype.animate
  Element.prototype.animate = function (keyframes, options) {
    if (typeof options === 'object' && options.id === 'ui-size') sized.push(this.className)
    return original.call(this, keyframes, options)
  }
  try {
    open.value = true
    await vi.waitFor(() => expect(a.getBoundingClientRect().height).toBe(140), { timeout: 2000 })
    await new Promise((resolve) => setTimeout(resolve, 800))
    // Stretched by its row as `a` grew: noted, never played as its own change.
    expect(sized).toEqual(['a'])
    expect(b.getBoundingClientRect().height).toBe(140)

    open.value = false
    await nextTick()
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    // Still on its way down, not snapped.
    expect(a.getBoundingClientRect().height).toBeGreaterThan(102)
    await vi.waitFor(() => expect(a.getBoundingClientRect().height).toBe(100), { timeout: 2000 })
  } finally {
    Element.prototype.animate = original
  }
})
