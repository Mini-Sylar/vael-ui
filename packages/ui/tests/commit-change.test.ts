import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Slider from '../src/components/Slider/Slider.vue'
import Knob from '../src/components/Knob/Knob.vue'
import Dial from '../src/components/Dial/Dial.vue'

// Like a native range input: v-model on every move, `change` once the value is committed.
for (const [name, component] of [
  ['Slider', Slider],
  ['Knob', Knob],
  ['Dial', Dial],
] as const) {
  test(`${name} fires change with the committed value after a key press`, async () => {
    const value = shallowRef(50)
    const changes: unknown[] = []
    const screen = await render(() =>
      h(component as never, {
        modelValue: value.value,
        'onUpdate:modelValue': (next: number) => (value.value = next),
        onChange: (next: unknown) => changes.push(next),
        min: 0,
        max: 100,
        ariaLabel: name,
      }),
    )
    screen.container.querySelector<HTMLElement>('[role="slider"]')!.focus()
    await userEvent.keyboard('{ArrowUp}')
    await vi.waitFor(() => expect(changes).toEqual([value.value]))
    expect(value.value).not.toBe(50)
  })
}

test('Slider fires change once on release, not on every move', async () => {
  const value = shallowRef(0)
  const changes: unknown[] = []
  const screen = await render(() =>
    h(Slider as never, {
      modelValue: value.value,
      'onUpdate:modelValue': (next: number) => (value.value = next),
      onChange: (next: unknown) => changes.push(next),
      ariaLabel: 'Volume',
      style: 'width: 200px',
    }),
  )
  const thumb = screen.container.querySelector<HTMLElement>('[role="slider"]')!
  const box = thumb.getBoundingClientRect()
  const y = box.top + box.height / 2
  thumb.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: box.left, clientY: y, pointerId: 1, bubbles: true }),
  )
  for (const x of [40, 80, 120]) {
    window.dispatchEvent(
      new PointerEvent('pointermove', { clientX: box.left + x, clientY: y, pointerId: 1 }),
    )
  }
  expect(changes).toHaveLength(0)
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientX: box.left + 120, clientY: y, pointerId: 1 }),
  )
  await vi.waitFor(() => expect(changes).toEqual([value.value]))
  expect(value.value).toBeGreaterThan(0)
})
