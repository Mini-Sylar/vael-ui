// useTween: a number that eases to each new value of its source.
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { useTween } from '../src/motion/useTween'

const frame = () => new Promise(requestAnimationFrame)

function mount(total: { value: number }, motion?: boolean) {
  const seen: number[] = []
  const Total = defineComponent({
    setup() {
      const shown = useTween(() => total.value, { duration: 300, easing: 'linear' })
      return () => {
        seen.push(shown.value)
        return h('span', { class: 'total' }, Math.round(shown.value))
      }
    },
  })
  render(() => h(ConfigProvider, motion === false ? { motion: false } : {}, () => h(Total)))
  return seen
}

test('it eases through the values in between, and ends on the new one', async () => {
  const total = shallowRef(0)
  const seen = mount(total)
  await frame()
  total.value = 100
  await vi.waitFor(() => expect(seen.at(-1)).toBe(100))
  const between = seen.filter((v) => v > 0 && v < 100)
  expect(between.length).toBeGreaterThan(3)
  // Rising all the way: each value at or past the last.
  expect(seen.every((v, i) => !i || v >= seen[i - 1]!)).toBe(true)
})

test('changed mid-way, it carries on from where it is', async () => {
  const total = shallowRef(0)
  const seen = mount(total)
  await frame()
  total.value = 100
  await vi.waitFor(() => expect(seen.at(-1)!).toBeGreaterThan(30))
  const at = seen.at(-1)!
  total.value = 0
  await frame()
  await frame()
  // No jump back to 100 or to 0: it turns around near where it was.
  expect(Math.abs(seen.at(-1)! - at)).toBeLessThan(25)
  await vi.waitFor(() => expect(seen.at(-1)).toBe(0))
})

test('with motion off it jumps', async () => {
  const total = shallowRef(0)
  const seen = mount(total, false)
  await frame()
  total.value = 100
  await vi.waitFor(() => expect(seen.at(-1)).toBe(100))
  expect(seen.filter((v) => v > 0 && v < 100)).toHaveLength(0)
})
