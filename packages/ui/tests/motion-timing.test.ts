// An instance's timing: its own transitions follow it, without touching anyone else.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Progress from '../src/components/Progress/Progress.vue'
import Switch from '../src/components/Switch/Switch.vue'

const frame = () => new Promise(requestAnimationFrame)
const durationOf = (el: Element) => getComputedStyle(el).transitionDuration

test('`duration` and `easing` on one Progress retime its fill, and only its own', async () => {
  const screen = await render(() => [
    h(Progress as never, { class: 'mine', value: 40, motion: { duration: 900, easing: 'linear' } }),
    h(Progress as never, { class: 'other', value: 40 }),
  ])
  const fill = (cls: string) => screen.container.querySelector(`.${cls} .ui-progress-fill`)!
  // The tokens arrive with the states player, a moment after mount.
  await expect.poll(() => durationOf(fill('mine'))).toContain('0.9s')
  expect(getComputedStyle(fill('mine')).transitionTimingFunction).toContain('linear')
  expect(durationOf(fill('other'))).not.toContain('0.9s')
})

test('a `spring` on one Switch puts its own transitions on that spring', async () => {
  const screen = await render(() =>
    h(Switch as never, { motion: { spring: { damping: 0.7, response: 0.5 } } }),
  )
  const root = screen.container.querySelector<HTMLElement>('.ui-switch')!
  await expect.poll(() => root.style.getPropertyValue('--ui-ease-out')).toContain('linear(')
  expect(Number.parseFloat(root.style.getPropertyValue('--ui-duration-press'))).toBeGreaterThan(300)
})

test("`when: 'visible'`: a Progress below the fold fills once it's scrolled into view", async () => {
  const screen = await render(() => [
    h('div', { style: 'height: 3000px' }),
    h(Progress as never, { value: 60, motion: { when: 'visible' } }),
    h('div', { style: 'height: 3000px' }),
  ])
  const fill = screen.container.querySelector<HTMLElement>('.ui-progress-fill')!
  const scale = () => fill.style.getPropertyValue('--ui-progress-scale')
  for (let i = 0; i < 3; i++) await frame()
  expect(scale()).toBe('0')
  // What a screen reader hears is the real value all along.
  expect(screen.container.querySelector('[aria-valuenow]')!.getAttribute('aria-valuenow')).toBe(
    '60',
  )
  fill.scrollIntoView()
  await expect.poll(scale).toBe('0.6')
})

test("`when: 'visible'` holds a component's appearance until it scrolls into view", async () => {
  const { default: Slider } = await import('../src/components/Slider/Slider.vue')
  // Earlier tests scroll the page: start from the top.
  window.scrollTo(0, 0)
  const screen = await render(() => [
    h('div', { style: 'height: 3000px' }),
    h(Slider as never, {
      modelValue: 40,
      motion: { when: 'visible', initial: { root: { opacity: 0 } } },
    }),
    h('div', { style: 'height: 3000px' }),
  ])
  const root = screen.container.querySelector<HTMLElement>('.ui-slider')!
  for (let i = 0; i < 6; i++) await frame()
  // Held at its start off screen...
  expect(getComputedStyle(root).opacity).toBe('0')
  // ...and played once it's in view.
  root.scrollIntoView({ block: 'center' })
  await expect.poll(() => getComputedStyle(root).opacity, { timeout: 2000 }).toBe('1')
})
