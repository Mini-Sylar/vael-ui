import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Tree from '../src/components/Tree/Tree.vue'

// Its own file: the flat list's code loads once per page, so here it hasn't loaded yet.
const items = Array.from({ length: 40 }, (_, f) => ({
  label: `Folder ${f}`,
  value: `f${f}`,
  children: Array.from({ length: 50 }, (_, c) => ({
    label: `Item ${f}-${c}`,
    value: `f${f}-${c}`,
  })),
}))

test('expanding past 500 rows before the flat list has loaded mounts a screenful, not every row', async () => {
  const tree = shallowRef<{ expandAll: () => void } | null>(null)
  await render(() =>
    h('div', { style: { blockSize: '400px', display: 'flex' } }, [
      h(Tree as never, { items, ref: (el: unknown) => (tree.value = el as never) }),
    ]),
  )
  let peak = 0
  let busy = false
  const watching = { on: true }
  const sample = () => {
    peak = Math.max(peak, document.querySelectorAll('[role="treeitem"]').length)
    if (document.querySelector('[role="tree"][aria-busy="true"]')) busy = true
    if (watching.on) requestAnimationFrame(sample)
  }
  // At once, before the idle-time fetch: the code isn't there yet.
  tree.value!.expandAll()
  sample()
  await vi.waitFor(() => expect(document.querySelector('.ui-tree-rows--virtual')).not.toBeNull())
  watching.on = false
  expect(peak).toBeLessThanOrEqual(60)
  expect(busy).toBe(true)
  expect(document.querySelector('[role="tree"]')!.getAttribute('aria-busy')).toBeNull()
})
