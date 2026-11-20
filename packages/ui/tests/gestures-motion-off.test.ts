// `motion: false` on a ConfigProvider: useWheel and useDrag still follow the pointer, and go
// straight to where they're heading instead of springing there.
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, useTemplateRef } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { useDrag } from '../src/composables/useDrag'
import type { UseDragReturn } from '../src/composables/useDrag'
import { useWheel } from '../src/composables/useWheel'
import type { UseWheelReturn } from '../src/composables/useWheel'

test('useWheel goes straight to the item', async () => {
  let wheel!: UseWheelReturn
  const model = shallowRef(0)
  const Picker = defineComponent(() => {
    const el = useTemplateRef<HTMLElement>('el')
    wheel = useWheel(model, { el, count: 10, size: 36 })
    return () =>
      h(
        'div',
        { ref: 'el' },
        Array.from({ length: 10 }, (_, i) => h('div', i)),
      )
  })
  await render(() => h(ConfigProvider, { motion: false }, () => h(Picker)))
  await nextTick()
  wheel.goTo(6)
  expect(wheel.position.value).toBe(6)
  expect(model.value).toBe(6)
})

test('useDrag is there at once, and at rest', async () => {
  let drag!: UseDragReturn
  const rests: number[] = []
  const Card = defineComponent(() => {
    const el = useTemplateRef<HTMLElement>('el')
    drag = useDrag({ el, onRest: ({ x }) => rests.push(x) })
    return () => h('div', { ref: 'el' }, 'card')
  })
  await render(() => h(ConfigProvider, { motion: false }, () => h(Card)))
  await nextTick()
  drag.throwTo({ x: 400, y: 0 })
  expect(drag.x.value).toBe(400)
  expect(rests).toEqual([400])
})
