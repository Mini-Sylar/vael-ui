// A style's `drawer` key reaches drawers, over its `dialog` key, and survives parseMotionStyle.
import '../src/style.css'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Drawer from '../src/components/Drawer/Drawer.vue'
import { parseMotionStyle } from '../src/motion/parse'

test('parseMotionStyle keeps `drawer` and the transform shorthands', () => {
  const { style, issues } = parseMotionStyle({
    version: 1,
    drawer: { initial: { panel: { x: '100%' } } },
    presets: { flip: { initial: { rotateY: 90, scaleY: 0.5, skewX: 4, perspective: 600 } } },
  })
  expect(issues).toEqual([])
  expect(style.drawer).toBeDefined()
})

test('a style whose dialog key fades still lets drawers slide, through its drawer key', async () => {
  await page.viewport(1200, 800)
  const open = shallowRef(false)
  await render(
    () =>
      h(
        ConfigProvider,
        {
          motion: {
            version: 1,
            dialog: { initial: { panel: { opacity: 0, scale: 0.96 } } },
            drawer: { initial: { panel: { x: '100%', opacity: 1, scale: 1 } } },
          },
        },
        () => h(Drawer as never, { open: open.value, title: 'Cart' }),
      ),
    { global: { stubs: { transition: false } } },
  )
  open.value = true
  await nextTick()
  const lefts: number[] = []
  for (let frame = 0; frame < 30; frame++) {
    await new Promise(requestAnimationFrame)
    const panel = document.querySelector('.ui-dialog-panel')
    if (panel) lefts.push(Math.round(panel.getBoundingClientRect().left))
  }
  expect(Math.max(...lefts) - Math.min(...lefts)).toBeGreaterThan(100)
})
