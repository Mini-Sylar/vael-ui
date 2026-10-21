import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Badge from '../src/components/Badge/Badge.vue'
import { springEasing, springTokens } from '../src/composables/springEasing'

test('springEasing turns a spring into a linear() curve and its settle time', () => {
  const crisp = springEasing({ damping: 1, response: 0.3 })
  const bouncy = springEasing({ damping: 0.5, response: 0.3 })
  expect(crisp.easing.startsWith('linear(0, ')).toBe(true)
  expect(crisp.easing.endsWith(', 1)')).toBe(true)
  const peak = (easing: string) => Math.max(...easing.slice(7, -1).split(', ').map(Number))
  expect(peak(crisp.easing)).toBeLessThanOrEqual(1)
  expect(peak(bouncy.easing)).toBeGreaterThan(1.1)
  expect(bouncy.duration).toBeGreaterThan(crisp.duration)
  expect(CSS.supports('transition-timing-function', bouncy.easing)).toBe(true)
})

test('ConfigProvider motion.spring puts the motion tokens on it, and motion false zeroes them', async () => {
  const spring = { damping: 0.6, response: 0.4 }
  const tokens = springTokens(spring)
  const screen = await render({
    render: () => h(ConfigProvider, { motion: { spring } }, () => h(Badge, { value: 3 })),
  })
  const scoped = screen.container.querySelector<HTMLElement>('[data-ui-theme]')!
  const style = getComputedStyle(scoped)
  expect(style.getPropertyValue('--ui-ease-drawer').trim()).toBe(tokens['--ui-ease-drawer'])
  expect(style.getPropertyValue('--ui-duration-toast').trim()).toBe(tokens['--ui-duration-toast'])

  const off = await render({
    render: () => h(ConfigProvider, { motion: false }, () => h(Badge, { value: 3 })),
  })
  const offScoped = off.container.querySelector<HTMLElement>('[data-ui-theme]')!
  expect(getComputedStyle(offScoped).getPropertyValue('--ui-duration-toast').trim()).toBe('0s')
})

test('the spring follows its prop, so sliders can tune it live', async () => {
  const damping = shallowRef(1)
  const screen = await render({
    render: () =>
      h(ConfigProvider, { motion: { spring: { damping: damping.value, response: 0.3 } } }, () =>
        h(Badge, { value: 1 }),
      ),
  })
  const read = () =>
    getComputedStyle(screen.container.querySelector<HTMLElement>('[data-ui-theme]')!)
      .getPropertyValue('--ui-ease-drawer')
      .trim()
  const calm = read()
  damping.value = 0.5
  await nextTick()
  expect(read()).not.toBe(calm)
  expect(read()).toBe(springTokens({ damping: 0.5, response: 0.3 })['--ui-ease-drawer'])
})

test('a zero or invalid spring settles at once instead of hanging', () => {
  for (const spring of [
    { damping: 1, response: 0 },
    { damping: -1, response: 0.3 },
    { damping: Number.NaN, response: 0.3 },
  ]) {
    expect(springEasing(spring).duration).toBeLessThan(10)
  }
})
