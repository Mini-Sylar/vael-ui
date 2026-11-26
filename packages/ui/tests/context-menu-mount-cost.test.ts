// A ContextMenu renders once as it mounts: its anchor landing doesn't render it, or its menu, again.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick } from 'vue'
import ContextMenu from '../src/components/ContextMenu/ContextMenu.vue'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const items = [
  { label: 'Copy', value: 'copy' },
  { label: 'Paste', value: 'paste' },
]

test('no re-render after mount, and the menu still opens at the pointer', async () => {
  const updates: string[] = []
  const mixin = {
    beforeUpdate(this: { $: { type: { __name?: string } } }) {
      updates.push(this.$.type.__name ?? '?')
    },
  }
  await render(
    () =>
      h(
        ContextMenu as never,
        { items, motion: false },
        { default: () => h('div', { class: 'area', style: 'width:200px;height:100px' }, 'Area') },
      ),
    { global: { mixins: [mixin] } },
  )
  await nextTick()
  await frame()
  // Was one each: the anchor was handed to the menu through a template ref, a render after mount.
  expect(updates.filter((name) => name === 'ContextMenu' || name === 'Menu')).toEqual([])
  const area = document.querySelector<HTMLElement>('.area')!
  const box = area.getBoundingClientRect()
  area.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: box.left + 40,
      clientY: box.top + 30,
    }),
  )
  const panel = await vi.waitFor(() => {
    const positioner = document.querySelector<HTMLElement>('.ui-menu-positioner')!
    expect(positioner.style.visibility).toBe('visible')
    return positioner
  })
  const placed = panel.getBoundingClientRect()
  expect(Math.abs(placed.left - (box.left + 40))).toBeLessThan(4)
  expect(Math.abs(placed.top - (box.top + 30 + 2))).toBeLessThan(4)
})
