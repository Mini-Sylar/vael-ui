// A component's own entrance on its first-ever mount, while the appearance code is still loading:
// its parts never paint in their final look first.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, markRaw } from 'vue'
import Dock from '../src/components/Dock/Dock.vue'

const Icon = markRaw({ render: () => h('svg', { viewBox: '0 0 24 24', width: 24, height: 24 }) })

test('Dock with a staggered entrance: no item is at full opacity in the first frames', async () => {
  const seen: number[] = []
  const watch = (async () => {
    for (let frame = 0; frame < 4; frame++) {
      await new Promise(requestAnimationFrame)
      const items = [...document.querySelectorAll<HTMLElement>('.ui-dock-item')]
      if (items.length)
        seen.push(Math.max(...items.map((el) => Number(getComputedStyle(el).opacity))))
    }
  })()
  await render(() =>
    h(Dock, {
      items: [
        { label: 'One', icon: Icon },
        { label: 'Two', icon: Icon },
      ],
      motion: { initial: { item: { opacity: 0, y: 10 } }, stagger: 0.05 },
    }),
  )
  await watch
  expect(seen.length).toBeGreaterThan(0)
  expect(Math.max(...seen)).toBeLessThan(1)
})
