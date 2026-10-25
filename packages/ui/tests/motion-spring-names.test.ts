// A spring by name works everywhere a spring goes: a v-animate, a component, a provider, a style.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import Accordion from '../src/components/Accordion/Accordion.vue'
import AccordionItem from '../src/components/AccordionItem/AccordionItem.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { SPRINGS, springEasing, springOf } from '../src/composables/springEasing'
import { vAnimate } from '../src/directives/vAnimate'
import { parseMotionStyle } from '../src/motion/parse'

const curve = (name: keyof typeof SPRINGS) => springEasing(SPRINGS[name]).easing
// A linear() easing's values, without the stops a browser adds when it writes one back.
const values = (easing: unknown) =>
  String(easing)
    .replace(/^linear\(|\)$/g, '')
    .split(',')
    .map((stop) => parseFloat(stop))
// The linear() curves an element rides: its animations' and its inline transition's.
const curvesOn = (el: HTMLElement | null) => [
  ...(el?.getAnimations().map((a) => String(a.effect?.getTiming().easing)) ?? []),
  ...(el?.style.transition.match(/linear\([^)]*\)/g) ?? []),
]
// Rides this spring: one of its curves has the spring's values.
const rides = (found: string[], name: keyof typeof SPRINGS) =>
  found.some(
    (easing) =>
      easing.startsWith('linear(') && values(easing).join() === values(curve(name)).join(),
  )
const ridesSoon = (selector: string, name: keyof typeof SPRINGS) =>
  vi.waitFor(() =>
    expect(rides(curvesOn(document.querySelector<HTMLElement>(selector)), name)).toBe(true),
  )

test('a name is its numbers; numbers stay as they are', () => {
  expect(springOf('bouncy')).toEqual({ damping: 0.55, response: 0.45 })
  const own = { damping: 0.7, response: 0.3 }
  expect(springOf(own)).toBe(own)
  expect(springOf(undefined)).toBeUndefined()
})

test('a v-animate on a named spring', async () => {
  render(() =>
    withDirectives(h('div', { class: 'named' }, 'Hi'), [
      [vAnimate, { initial: { opacity: 0, y: 8 }, spring: 'bouncy' }],
    ]),
  )
  await ridesSoon('.named', 'bouncy')
})

test("a component's motion on a named spring", async () => {
  const open = shallowRef(false)
  render(
    () => h(Dialog as never, { open: open.value, title: 'Named', motion: { spring: 'snappy' } }),
    { global: { stubs: { transition: false } } },
  )
  open.value = true
  // Every frame of the opening: what the panel's transitions and animations ride.
  const found: string[] = []
  for (let i = 0; i < 30; i++) {
    await new Promise(requestAnimationFrame)
    found.push(...curvesOn(document.querySelector<HTMLElement>('.ui-dialog-panel')))
  }
  expect(rides(found, 'snappy')).toBe(true)
})

test('a provider on a named spring retimes the components and the v-animate inside', async () => {
  render(() =>
    h(ConfigProvider as never, { motion: { version: 1, spring: 'gentle' } }, () => [
      withDirectives(h('div', { class: 'inside' }, 'Hi'), [
        [vAnimate, { initial: { opacity: 0, y: 8 } }],
      ]),
      h(Accordion as never, { type: 'single', defaultValue: 'a' }, () =>
        h(AccordionItem as never, { value: 'a', title: 'A' }, () => 'Body'),
      ),
    ]),
  )
  await ridesSoon('.inside', 'gentle')
  const root = document.querySelector<HTMLElement>('.ui-accordion')!
  expect(root.style.getPropertyValue('--ui-accordion-ease')).toBe(curve('gentle'))
})

test('a ConfigProvider { spring } by name, as the app-wide spring', async () => {
  render(() =>
    h(ConfigProvider as never, { motion: { spring: 'bouncy' } }, () =>
      h(Accordion as never, { type: 'single', defaultValue: 'a' }, () =>
        h(AccordionItem as never, { value: 'a', title: 'A' }, () => 'Body'),
      ),
    ),
  )
  const root = await vi.waitFor(() => document.querySelector<HTMLElement>('.ui-accordion')!)
  expect(root.style.getPropertyValue('--ui-accordion-ease')).toBe(curve('bouncy'))
})

test('a style from data may name its spring, and an unknown name is an issue', () => {
  expect(
    parseMotionStyle({ version: 1, spring: 'smooth', dialog: { spring: 'bouncy' } }).issues,
  ).toEqual([])
  expect(parseMotionStyle({ version: 1, spring: 'wobbly' }).issues.length).toBeGreaterThan(0)
})
