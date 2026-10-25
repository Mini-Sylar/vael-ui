// v-animate's modifiers pick (a built-in entrance, a spring, `stagger`), and its value tunes.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import type { DirectiveArguments } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { SPRINGS, springEasing } from '../src/composables/springEasing'
import { vAnimate } from '../src/directives/vAnimate'

afterEach(() => {
  document.body.innerHTML = ''
})

const frame = () => new Promise(requestAnimationFrame)
// Its starting look, once its entrance has begun.
async function startOf(selector: string) {
  const el = await vi.waitFor(() => {
    const found = document.querySelector<HTMLElement>(selector)
    expect(found?.style.transition || found?.getAnimations().length).toBeTruthy()
    return found!
  })
  const style = getComputedStyle(el)
  return {
    opacity: Number(style.opacity),
    y: parseFloat(style.translate.split(' ')[1] ?? '0') || 0,
    scale: Number(style.scale === 'none' ? 1 : style.scale),
    filter: style.filter,
  }
}
const one = (cls: string, dir: DirectiveArguments[number]) =>
  render(() => withDirectives(h('div', { class: cls }, 'Hi'), [dir]))

test('v-animate.rise comes in from below, faded', async () => {
  one('rise', [vAnimate, undefined, undefined, { rise: true }])
  const start = await startOf('.rise')
  expect(start.opacity).toBeLessThan(0.5)
  expect(start.y).toBeGreaterThan(4)
})

test('a built-in entrance by name works with no ConfigProvider around it', async () => {
  one('named', [vAnimate, 'drop'])
  const start = await startOf('.named')
  expect(start.opacity).toBeLessThan(0.5)
  expect(start.y).toBeLessThan(-4)
})

test('v-animate.pop.bouncy grows in on the bouncy spring', async () => {
  one('pop', [vAnimate, undefined, undefined, { pop: true, bouncy: true }])
  const start = await startOf('.pop')
  expect(start.scale).toBeLessThan(0.97)
  const curves = [
    ...document.querySelector<HTMLElement>('.pop')!.style.transition.matchAll(/linear\([^)]*\)/g),
  ].map((m) => m[0])
  const bouncy = springEasing(SPRINGS.bouncy).easing
  const head = (easing: string) =>
    easing
      .replace(/^linear\(|\)$/g, '')
      .split(',')
      .slice(0, 8)
      .map((stop) => parseFloat(stop))
      .join()
  expect(curves.some((c) => head(c) === head(bouncy))).toBe(true)
})

test('the value tunes the picked entrance: its looks merge, its timing replaces', async () => {
  one('tuned', [
    vAnimate,
    { initial: { y: 24 }, duration: 300, easing: 'linear' },
    undefined,
    { rise: true },
  ])
  const start = await startOf('.tuned')
  // rise's fade kept, its distance replaced.
  expect(start.opacity).toBeLessThan(0.5)
  expect(start.y).toBeGreaterThan(16)
  expect(document.querySelector<HTMLElement>('.tuned')!.style.transition).toContain('300ms linear')
})

test('v-animate:rows.rise.stagger staggers by the token, in page order', async () => {
  const items = shallowRef<number[]>([])
  render(() =>
    h(
      'ul',
      items.value.map((i) =>
        withDirectives(h('li', { key: i, class: `row row-${i}` }, `Row ${i}`), [
          [vAnimate, undefined, 'rows', { rise: true, stagger: true }],
        ]),
      ),
    ),
  )
  await frame()
  items.value = [0, 1, 2]
  await vi.waitFor(() =>
    expect(
      [0, 1, 2].map((i) => document.querySelector<HTMLElement>(`.row-${i}`)?.style.transition),
    ).not.toContain(undefined),
  )
  const ms = (delay: string) => parseFloat(delay) * (delay.trim().endsWith('ms') ? 1 : 1000)
  const delays = [0, 1, 2].map((i) =>
    Math.round(ms(document.querySelector<HTMLElement>(`.row-${i}`)!.style.transitionDelay)),
  )
  expect(delays).toEqual([0, 40, 80])
})

test('stagger words start the wave at the end, the centre or the edges', async () => {
  const { staggerAt } = await import('../src/motion/playable')
  const at = (s: Parameters<typeof staggerAt>[0], n = 5) =>
    Array.from({ length: n }, (_, i) => +staggerAt(s, i, n).toFixed(3))
  expect(at(true)).toEqual([0, 0.04, 0.08, 0.12, 0.16])
  expect(at('end')).toEqual([0.16, 0.12, 0.08, 0.04, 0])
  expect(at('center')).toEqual([0.08, 0.04, 0, 0.04, 0.08])
  expect(at('edges')).toEqual([0, 0.04, 0.08, 0.04, 0])
  expect(at(0.1, 3)).toEqual([0, 0.1, 0.2])
  // The token where the element is sets the spacing.
  const el = document.createElement('div')
  el.style.setProperty('--ui-duration-stagger', '100ms')
  document.body.append(el)
  expect(staggerAt(true, 2, 3, el)).toBeCloseTo(0.2)
})

test('a preset of yours works as a modifier', async () => {
  render(() =>
    h(
      ConfigProvider as never,
      { motion: { version: 1, presets: { sink: { initial: { opacity: 0, y: 30 } } } } },
      () =>
        withDirectives(h('div', { class: 'sink' }, 'Hi'), [
          [vAnimate, undefined, undefined, { sink: true }],
        ]),
    ),
  )
  expect((await startOf('.sink')).y).toBeGreaterThan(20)
})

test('an unknown modifier says so', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  one('odd', [vAnimate, undefined, undefined, { rsie: true }])
  await vi.waitFor(() =>
    expect(warn.mock.calls.some(([m]) => String(m).includes('v-animate.rsie'))).toBe(true),
  )
  warn.mockRestore()
})
