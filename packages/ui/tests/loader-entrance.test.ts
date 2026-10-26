// A Loader with its own `initial` plays it as it mounts.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Loader from '../src/components/Loader/Loader.vue'

test('a Loader mounted later comes in from its initial', async () => {
  const shown = shallowRef(false)
  const screen = await render(() =>
    shown.value
      ? h(Loader, {
          label: 'Loading',
          motion: { initial: { root: { opacity: 0, scale: 0.6 } }, duration: 300 },
        })
      : null,
  )
  await new Promise((resolve) => setTimeout(resolve, 100))
  shown.value = true
  await nextTick()
  const seen: number[] = []
  for (let frame = 0; frame < 15; frame++) {
    await new Promise(requestAnimationFrame)
    const root = screen.container.querySelector('.ui-loader')
    if (root) seen.push(Number(getComputedStyle(root).opacity))
  }
  expect(Math.min(...seen)).toBeLessThan(0.5)
})
