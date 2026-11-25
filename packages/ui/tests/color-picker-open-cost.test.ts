// Opening a ColorPicker draws its slider and hex field once: placing the panel doesn't redraw them.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import ColorPicker from '../src/components/ColorPicker/ColorPicker.vue'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

test('the slider and the hex field render once as the panel opens', async () => {
  const updates: Record<string, number> = {}
  const mixin = {
    beforeUpdate(this: { $: { type: { __name?: string } } }) {
      const name = this.$.type.__name ?? '?'
      updates[name] = (updates[name] ?? 0) + 1
    },
  }
  const open = shallowRef(false)
  await render(() => h(ColorPicker as never, { open: open.value }), {
    global: { mixins: [mixin], stubs: { transition: false } },
  })
  await nextTick()
  open.value = true
  await vi.waitFor(() => expect(document.querySelector('.ui-color-picker-hue')).not.toBeNull())
  for (let i = 0; i < 20; i++) await frame()
  // Each was redrawn with every render of the panel as it was placed: five to seven times.
  expect(updates.Slider ?? 0).toBe(0)
  expect(updates.Input ?? 0).toBe(0)
})
