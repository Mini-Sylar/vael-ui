// A drawer whose own elements wait on its panel (`after`): on its first-ever open, it never paints
// open and at rest before it slides in (the runtime that plays `after` loads on demand).
import '../src/style.css'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import Drawer from '../src/components/Drawer/Drawer.vue'
import { vAnimate } from '../src/motion/vAnimate'

test('first open of a drawer with `after` rows: no frame shows it at rest with its rows in', async () => {
  await page.viewport(1200, 800)
  const open = shallowRef(false)
  await render(
    () =>
      h(
        Drawer as never,
        { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v), title: 'Cart' },
        () =>
          ['A', 'B'].map((row) =>
            withDirectives(h('p', { key: row, class: 'row' }, row), [
              [vAnimate, { initial: { opacity: 0, x: 16 }, after: 'panel:70%' }, 'rows'],
            ]),
          ),
      ),
    { global: { stubs: { transition: false } } },
  )
  const seen = (el: Element | null) => {
    let o = 1
    for (let at = el; at; at = at.parentElement) o *= Number(getComputedStyle(at).opacity)
    return o
  }
  await new Promise((resolve) => setTimeout(resolve, 100))
  open.value = true
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
  expect(frames.some((f) => Math.abs(f.left - rest) > 20)).toBe(true)
  expect(frames.slice(0, 4).some((f) => Math.abs(f.left - rest) < 1 && f.rows > 0.9)).toBe(false)
})
