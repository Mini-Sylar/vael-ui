// A closed TreeSelect mounts no panel parts; opening draws the tree once.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const items = [
  { label: 'Fruits', value: 'fruits', children: [{ label: 'Apple', value: 'apple' }] },
  { label: 'Vegetables', value: 'vegetables' },
]
// A Teleport leaves two empty text nodes in its target.
const bodyAnchors = () =>
  [...document.body.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).length

test('closed tree selects mount no Teleport; forceMount still does', async () => {
  const before = bodyAnchors()
  const screen = await render(
    defineComponent({
      setup: () => () => Array.from({ length: 10 }, () => h(TreeSelect as never, { items })),
    }),
  )
  await nextTick()
  expect(bodyAnchors()).toBe(before)
  screen.unmount()
  await render(() => h(TreeSelect as never, { items, forceMount: true }))
  expect(document.querySelector('.ui-tree-select-positioner')).not.toBeNull()
})

test('the tree renders once as the panel opens and is placed', async () => {
  const updates: Record<string, number> = {}
  const mixin = {
    beforeUpdate(this: { $: { type: { __name?: string } } }) {
      const name = this.$.type.__name ?? '?'
      updates[name] = (updates[name] ?? 0) + 1
    },
  }
  const open = shallowRef(false)
  await render(() => h(TreeSelect as never, { items, open: open.value }), {
    global: { mixins: [mixin], stubs: { transition: false } },
  })
  await nextTick()
  open.value = true
  await vi.waitFor(() => expect(document.querySelector('[role="tree"]')).not.toBeNull())
  for (let i = 0; i < 20; i++) await frame()
  // Was five: its forwarded slots made it follow every render of the panel as it was placed.
  expect(updates.Tree ?? 0).toBe(0)
})

test('the first open plays the enter, and every open after it too', async () => {
  const open = shallowRef(false)
  await render(() => h(TreeSelect as never, { items, open: open.value }), {
    global: { stubs: { transition: false } },
  })
  const moving = () =>
    (document.querySelector('.ui-tree-select-panel')?.getAnimations({ subtree: true }).length ??
      0) > 0
  for (let round = 0; round < 2; round++) {
    open.value = true
    await vi.waitFor(() => expect(moving()).toBe(true))
    open.value = false
    await vi.waitFor(() => expect(document.querySelector('.ui-tree-select-panel')).toBeNull())
  }
})
