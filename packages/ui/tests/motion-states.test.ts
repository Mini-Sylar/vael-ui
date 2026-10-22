import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Accordion from '../src/components/Accordion/Accordion.vue'
import AccordionItem from '../src/components/AccordionItem/AccordionItem.vue'
import Button from '../src/components/Button/Button.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Input from '../src/components/Input/Input.vue'
import type { AccordionMotion, ButtonMotion, InputMotion } from '../src/motion/types'

const frame = () => new Promise(requestAnimationFrame)
const states = (el: Element | null) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-state')
const settle = async () => {
  for (
    let i = 0;
    i < 40 &&
    document.getAnimations().some((a) => a.id === 'ui-state' && a.playState === 'running');
    i++
  )
    await frame()
}

afterEach(() => {
  document.body.innerHTML = ''
})

test('an invalid field shakes on entering the state, not when it mounts invalid, and again each time', async () => {
  const invalid = shallowRef(true)
  const motion: InputMotion = { states: { invalid: { root: { x: [0, -6, 6, -3, 0] } } } }
  render({ setup: () => () => h(Input, { invalid: invalid.value, motion }) })
  const root = () => document.querySelector('.ui-input')
  await vi.waitFor(() => expect(root()).not.toBeNull())
  // Mounted invalid: shown as is, nothing plays.
  for (let i = 0; i < 5; i++) await frame()
  expect(states(root()).filter((a) => a.playState === 'running')).toHaveLength(0)

  invalid.value = false
  await nextTick()
  invalid.value = true
  await vi.waitFor(() => expect(states(root()).some((a) => a.playState === 'running')).toBe(true))
  // It moves: somewhere along the shake it's off its rest position.
  const xs = new Set<string>()
  while (states(root()).some((a) => a.playState === 'running')) {
    xs.add(getComputedStyle(root()!).translate)
    await frame()
  }
  expect(xs.size).toBeGreaterThan(2)
  expect(getComputedStyle(root()!).translate).toBe('none')

  invalid.value = false
  await nextTick()
  invalid.value = true
  await vi.waitFor(() => expect(states(root()).some((a) => a.playState === 'running')).toBe(true))
})

test("an accordion's chevron holds its open look while open and eases back when closed", async () => {
  const open = shallowRef<string | undefined>(undefined)
  const motion: AccordionMotion = { states: { open: { chevron: { rotate: '90deg' } } } }
  render({
    setup: () => () =>
      h(
        Accordion as never,
        { value: open.value, 'onUpdate:value': (v: string) => (open.value = v), motion },
        () => h(AccordionItem, { value: 'a', title: 'A' }, () => 'Body'),
      ),
  })
  const chevron = () => document.querySelector<SVGElement>('.ui-accordion-chevron')!
  await vi.waitFor(() => expect(chevron()).not.toBeNull())
  open.value = 'a'
  await vi.waitFor(() => expect(states(chevron()).length).toBeGreaterThan(0))
  await settle()
  expect(getComputedStyle(chevron()).rotate).toBe('90deg')
  // Held by an animation, never by rewriting the component's own transition.
  expect(chevron().style.transition).toBe('')

  open.value = undefined
  const seen = new Set<string>()
  await nextTick()
  while (states(chevron()).some((a) => a.playState === 'running')) {
    seen.add(getComputedStyle(chevron()).rotate)
    await frame()
  }
  // Eased back through values on the way, and nothing left holding it.
  expect(seen.size).toBeGreaterThan(2)
  expect(states(chevron())).toHaveLength(0)
  expect(getComputedStyle(chevron()).rotate).not.toBe('90deg')
})

test('a button presses by pointer and by keyboard, and hovers only for a mouse', async () => {
  const motion: ButtonMotion = {
    states: { active: { label: { scale: '0.8' } }, hover: { root: { opacity: 0.5 } } },
  }
  render({ setup: () => () => h(Button, { motion }, () => 'Save') })
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  const label = () => document.querySelector<HTMLElement>('.ui-button-label')!
  await vi.waitFor(() => expect(button()).not.toBeNull())
  await frame()
  const pointer = (type: string, pointerType = 'mouse') =>
    button().dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType }))

  pointer('pointerdown')
  await vi.waitFor(() => expect(getComputedStyle(label()).scale).toBe('0.8'), { timeout: 2000 })
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
  await vi.waitFor(() => expect(states(label())).toHaveLength(0), { timeout: 2000 })

  button().focus()
  button().dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  await vi.waitFor(() => expect(getComputedStyle(label()).scale).toBe('0.8'), { timeout: 2000 })
  button().dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }))
  await vi.waitFor(() => expect(states(label())).toHaveLength(0), { timeout: 2000 })

  // A touch never hovers.
  pointer('pointerenter', 'touch')
  for (let i = 0; i < 5; i++) await frame()
  expect(states(button())).toHaveLength(0)
  pointer('pointerenter')
  await vi.waitFor(() => expect(getComputedStyle(button()).opacity).toBe('0.5'), { timeout: 2000 })
})

test('with nothing customised, states never run: the built-in look is the CSS', async () => {
  render({ setup: () => () => h(Button, null, () => 'Save') })
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  await vi.waitFor(() => expect(button()).not.toBeNull())
  button().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
  for (let i = 0; i < 5; i++) await frame()
  expect(document.getAnimations().filter((a) => a.id === 'ui-state')).toHaveLength(0)
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})

test("a shared style's press.active reaches every button; motion false opts one out", async () => {
  render({
    setup: () => () =>
      h(
        ConfigProvider as never,
        { motion: { version: 1, press: { active: { opacity: 0.4 } } } },
        () => [
          h(Button, { 'data-testid': 'styled' }, () => 'A'),
          h(Button, { 'data-testid': 'off', motion: false }, () => 'B'),
        ],
      ),
  })
  const get = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!
  await vi.waitFor(() => expect(get('styled')).not.toBeNull())
  await frame()
  for (const id of ['styled', 'off'])
    get(id).dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
    )
  await vi.waitFor(() => expect(getComputedStyle(get('styled')).opacity).toBe('0.4'), {
    timeout: 2000,
  })
  expect(states(get('off'))).toHaveLength(0)
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})
