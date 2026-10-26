// A top or bottom Drawer is a panel on that edge of the screen and slides in from it, as a side one
// does; a Dialog placed at the top or bottom stays a card.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Drawer from '../src/components/Drawer/Drawer.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

const panelOf = () => document.querySelector<HTMLElement>('.ui-dialog-panel')!

for (const side of ['top', 'bottom'] as const) {
  test(`a ${side} Drawer spans its edge and slides in from off screen`, async () => {
    const tops: number[] = []
    await render(() => h(Drawer as never, { open: true, side, title: 'Filters' }, () => 'Body'), {
      global: { stubs: { transition: false } },
    })
    for (let frame = 0; frame < 30; frame++) {
      await new Promise(requestAnimationFrame)
      const box = panelOf()?.getBoundingClientRect()
      if (box) tops.push(side === 'top' ? box.bottom : window.innerHeight - box.top)
    }
    const box = panelOf().getBoundingClientRect()
    // Edge to edge, flush with its edge.
    expect(Math.round(box.width)).toBe(window.innerWidth)
    expect(Math.abs(Math.round(side === 'top' ? box.top : window.innerHeight - box.bottom))).toBe(0)
    // It started (nearly) all the way off screen: its visible height grew from about 0.
    expect(Math.min(...tops)).toBeLessThan(box.height * 0.3)
  })
}

test('a Dialog at the bottom stays a card', async () => {
  await render(
    () => h(Dialog as never, { open: true, position: 'bottom', title: 'Note' }, () => 'Body'),
    {
      global: { stubs: { transition: false } },
    },
  )
  await new Promise((resolve) => setTimeout(resolve, 600))
  expect(panelOf().getBoundingClientRect().width).toBeLessThan(window.innerWidth)
})
