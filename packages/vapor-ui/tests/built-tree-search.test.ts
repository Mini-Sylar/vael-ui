// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp, nextTick } from 'vue'
import TreeSearchRoot from './fixtures/TreeSearchRoot.vue'

// Vapor's Transition reads its props once, so the swap can't rely on a reactive `:css`.
test('clearing a TreeSelect search drops the matched folders at once in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(TreeSearchRoot)
  app.mount(host)
  try {
    await userEvent.click(host.querySelector<HTMLElement>('[role="combobox"]')!)
    await expect.poll(() => document.querySelector('.ui-tree-select-panel input')).toBeTruthy()
    const input = document.querySelector<HTMLInputElement>('.ui-tree-select-panel input')!
    await userEvent.type(input, 'i')
    await expect
      .poll(() => [...document.querySelectorAll('[role="treeitem"]')].length)
      .toBeGreaterThan(3)
    await new Promise((resolve) => setTimeout(resolve, 400))
    await userEvent.clear(input)
    await nextTick()
    // A leaving block still in layout is what put the old rows on top of the new ones.
    const shown = [...document.querySelectorAll<HTMLElement>('.ui-tree-rows')].filter(
      (el) => el.closest('.ui-tree-select-panel') && el.getClientRects().length > 0,
    )
    const leaving = shown.filter((el) => /-leave-active/.test(el.className))
    expect(leaving).toHaveLength(0)
  } finally {
    app.unmount()
    host.remove()
  }
})
