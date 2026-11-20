// A shared style's `overlay` look is written for a centred overlay. It must not replace the slide of
// a panel that comes in from an edge, while a centred Dialog still takes it.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Drawer from '../src/components/Drawer/Drawer.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

const jelly = {
  version: 1,
  spring: { damping: 0.25, response: 0.4 },
  overlay: { initial: { opacity: 0, scale: '0.6 1.35', y: 30 } },
} as const
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const panelOf = () => document.querySelector<HTMLElement>('.ui-dialog-panel')

test('a drawer under a style with an overlay look still slides in from its edge', async () => {
  await render(
    () =>
      h(ConfigProvider as never, { motion: jelly }, () =>
        h(Drawer as never, { open: true, side: 'right', title: 'D' }, () => 'x'),
      ),
    { global: { stubs: { transition: false } } },
  )
  const away: number[] = []
  let opacity = 0
  for (let i = 0; i < 6; i++) {
    await frame()
    const panel = panelOf()
    if (!panel) continue
    away.push(innerWidth - panel.getBoundingClientRect().right)
    opacity = Math.max(opacity, Number(getComputedStyle(panel).opacity))
  }
  // It starts off screen, to the right, and is not a fade in place.
  expect(Math.min(...away)).toBeLessThan(-100)
  expect(opacity).toBeGreaterThan(0.9)
})

test('a centred Dialog under the same style still takes the overlay look', async () => {
  await render(
    () =>
      h(ConfigProvider as never, { motion: jelly }, () =>
        h(Dialog as never, { open: true, title: 'D' }, () => 'x'),
      ),
    { global: { stubs: { transition: false } } },
  )
  let lowest = 1
  for (let i = 0; i < 5; i++) {
    await frame()
    const panel = panelOf()
    if (panel) lowest = Math.min(lowest, Number(getComputedStyle(panel).opacity))
  }
  expect(lowest).toBeLessThan(0.6)
})
