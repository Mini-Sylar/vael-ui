// RFC rollout: Collapsible, Editable, Field, InputNumber, PasswordInput, Textarea, Progress,
// ScrollArea, Resizable and ColorPicker take a `motion` with their parts' appearance and states.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import type { Component } from 'vue'
import Collapsible from '../src/components/Collapsible/Collapsible.vue'
import ColorPicker from '../src/components/ColorPicker/ColorPicker.vue'
import Editable from '../src/components/Editable/Editable.vue'
import Field from '../src/components/Field/Field.vue'
import InputNumber from '../src/components/InputNumber/InputNumber.vue'
import PasswordInput from '../src/components/PasswordInput/PasswordInput.vue'
import Progress from '../src/components/Progress/Progress.vue'
import Resizable from '../src/components/Resizable/Resizable.vue'
import ScrollArea from '../src/components/ScrollArea/ScrollArea.vue'
import Textarea from '../src/components/Textarea/Textarea.vue'

const frame = () => new Promise(requestAnimationFrame)
const states = (el: Element | null | undefined) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-state')
const animating = (el: HTMLElement) =>
  el.getAnimations().length > 0 || Number(getComputedStyle(el).opacity) < 1

type Part = HTMLElement | HTMLElement[] | null
type Exposed = { parts: Record<string, Part> }
type Slots = Record<string, (...args: never[]) => unknown>

afterEach(() => {
  document.body.innerHTML = ''
})

const first = (part: Part | undefined) => (Array.isArray(part) ? part[0] : part)

/** Mounts it with reactive props, so a test can flip a state; transitions run for real. */
function mount(component: Component, props: () => Record<string, unknown>, slots?: Slots) {
  const instance = shallowRef<Exposed>()
  render(
    { setup: () => () => h(component as never, { ...props(), ref: instance }, slots as never) },
    { global: { stubs: { transition: false } } },
  )
  return instance
}

const rules = [{ label: 'At least 8 characters', test: (v: string) => v.length >= 8 }]

const cases: {
  name: string
  component: Component
  props: Record<string, unknown>
  slots?: Slots
  main: string
  parts: string[]
}[] = [
  {
    name: 'Collapsible',
    component: Collapsible,
    props: { open: true },
    slots: { trigger: () => h('button', 'Show'), default: () => 'Body' },
    main: 'root',
    parts: ['root', 'trigger', 'panel'],
  },
  {
    name: 'Editable (preview)',
    component: Editable,
    props: { modelValue: 'Hello' },
    main: 'root',
    parts: ['root', 'preview'],
  },
  {
    name: 'Editable (editing)',
    component: Editable,
    props: { modelValue: 'Hello', editing: true },
    slots: { actions: () => h('button', 'Save') },
    main: 'root',
    parts: ['root', 'edit', 'input', 'actions'],
  },
  {
    name: 'Field',
    component: Field,
    props: { label: 'Name', description: 'Your full name', error: 'Required' },
    slots: { default: () => h('input') },
    main: 'root',
    parts: ['root', 'label', 'control', 'description', 'error'],
  },
  {
    name: 'InputNumber',
    component: InputNumber,
    props: { modelValue: 1 },
    main: 'root',
    parts: ['root', 'input', 'increment', 'decrement'],
  },
  {
    name: 'PasswordInput',
    component: PasswordInput,
    props: { hintPlacement: 'inline', rules },
    main: 'root',
    parts: ['root', 'input', 'toggle', 'hint'],
  },
  {
    name: 'Textarea',
    component: Textarea,
    props: {},
    main: 'root',
    parts: ['root', 'textarea'],
  },
  {
    name: 'Progress',
    component: Progress,
    props: {
      value: [
        { value: 30, label: 'Photos' },
        { value: 20, label: 'Apps' },
      ],
    },
    main: 'root',
    parts: ['root', 'track', 'fill', 'legend'],
  },
  {
    name: 'ScrollArea',
    component: ScrollArea,
    props: { style: 'height: 100px' },
    slots: { default: () => h('p', 'Content') },
    main: 'root',
    parts: ['root'],
  },
  {
    name: 'Resizable',
    component: Resizable,
    props: { size: 200 },
    slots: { default: () => h('p', 'Panel') },
    main: 'root',
    parts: ['root', 'handle'],
  },
  {
    name: 'ColorPicker',
    component: ColorPicker,
    props: { modelValue: '#3b82f6' },
    main: 'swatch',
    parts: ['swatch'],
  },
]

test.each(cases)(
  '$name: every part is exposed and plays its `initial` on mount',
  async ({ component, props, slots, main, parts }) => {
    const initial = Object.fromEntries(parts.map((part) => [part, { opacity: 0 }]))
    const instance = mount(component, () => ({ ...props, motion: { initial } }), slots)
    await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
    for (const part of parts)
      expect(first(instance.value!.parts[part]), part).toBeInstanceOf(HTMLElement)
    const el = first(instance.value!.parts[main])!
    await vi.waitFor(() => expect(animating(el)).toBe(true))
  },
)

test.each(cases)(
  '$name: `false` plays no appearance',
  async ({ component, props, slots, main }) => {
    const instance = mount(component, () => ({ ...props, motion: false }), slots)
    await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
    for (let i = 0; i < 4; i++) await frame()
    expect(getComputedStyle(first(instance.value!.parts[main])!).opacity).toBe('1')
  },
)

const stateCases: {
  name: string
  component: Component
  props: (on: boolean) => Record<string, unknown>
  slots?: Slots
  motion: Record<string, unknown>
  part: string
  /** Flips the state when it isn't a prop. */
  act?: (instance: Exposed) => void
}[] = [
  {
    name: 'Collapsible: `open` plays on the trigger',
    component: Collapsible,
    props: (on) => ({ open: on }),
    slots: { trigger: () => h('button', 'Show'), default: () => 'Body' },
    motion: { open: { trigger: { scale: '1.1' } } },
    part: 'trigger',
  },
  {
    name: 'Editable: `editing` plays on the root',
    component: Editable,
    props: (on) => ({ modelValue: 'Hello', editing: on }),
    motion: { editing: { root: { scale: '1.02' } } },
    part: 'root',
  },
  {
    name: 'Field: `invalid` plays on the control',
    component: Field,
    props: (on) => ({ label: 'Name', error: on ? 'Required' : undefined }),
    slots: { default: () => h('input') },
    motion: { invalid: { control: { scale: '1.02' } } },
    part: 'control',
  },
  {
    name: 'InputNumber: `invalid` plays on the root',
    component: InputNumber,
    props: (on) => ({ modelValue: 1, invalid: on }),
    motion: { invalid: { root: { scale: '1.02' } } },
    part: 'root',
  },
  {
    name: 'PasswordInput: `invalid` plays on the root',
    component: PasswordInput,
    props: (on) => ({ invalid: on }),
    motion: { invalid: { root: { scale: '1.02' } } },
    part: 'root',
  },
  {
    name: 'Textarea: `invalid` plays on the root',
    component: Textarea,
    props: (on) => ({ invalid: on }),
    motion: { invalid: { root: { scale: '1.02' } } },
    part: 'root',
  },
  {
    name: 'Progress: `complete` plays on the root',
    component: Progress,
    props: (on) => ({ value: on ? 100 : 50 }),
    motion: { complete: { root: { scale: '1.02' } } },
    part: 'root',
  },
  {
    name: 'Progress: `indeterminate` plays on the track',
    component: Progress,
    props: (on) => ({ value: on ? null : 50 }),
    motion: { indeterminate: { track: { scale: '1.02' } } },
    part: 'track',
  },
  {
    name: 'Resizable: `dragging` plays on the handle',
    component: Resizable,
    props: () => ({ size: 200 }),
    slots: { default: () => h('p', 'Panel') },
    motion: { dragging: { handle: { scale: '1.2' } } },
    part: 'handle',
    act: (instance) => {
      const handle = first(instance.parts.handle)!
      handle.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }))
    },
  },
  {
    name: 'ColorPicker: `disabled` plays on the swatch',
    component: ColorPicker,
    props: (on) => ({ modelValue: '#3b82f6', disabled: on }),
    motion: { disabled: { swatch: { scale: '0.9' } } },
    part: 'swatch',
  },
]

test.each(stateCases)('$name', async ({ component, props, slots, motion, part, act }) => {
  const on = shallowRef(false)
  const instance = mount(
    component,
    () => ({ ...props(on.value), motion: { states: motion } }),
    slots,
  )
  await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
  for (let i = 0; i < 3; i++) await frame()
  if (act) act(instance.value!)
  else on.value = true
  await nextTick()
  await vi.waitFor(() =>
    expect(states(first(instance.value!.parts[part])).length).toBeGreaterThan(0),
  )
})

test("ColorPicker: the panel plays the picker's own `motion`, and `false` opens it instantly", async () => {
  const motion = shallowRef<unknown>({ initial: { panel: { opacity: 0, x: -40 } } })
  const instance = mount(ColorPicker, () => ({ modelValue: '#3b82f6', motion: motion.value }))
  await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
  first(instance.value!.parts.swatch)!.click()
  await vi.waitFor(() => expect(first(instance.value!.parts.panel)).toBeInstanceOf(HTMLElement))
  const panel = first(instance.value!.parts.panel)!
  expect(first(instance.value!.parts.positioner)).toBeInstanceOf(HTMLElement)
  // Somewhere along the open it's off to the left: the picker's `x`, not Popover's own look.
  const xs = new Set<number>()
  for (let i = 0; i < 20; i++) {
    xs.add(panel.getBoundingClientRect().left)
    await frame()
  }
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(20)

  first(instance.value!.parts.swatch)!.click()
  await vi.waitFor(() => expect(instance.value!.parts.panel).toBeNull())
  motion.value = false
  await nextTick()
  first(instance.value!.parts.swatch)!.click()
  await vi.waitFor(() => expect(first(instance.value!.parts.panel)).toBeInstanceOf(HTMLElement))
  await frame()
  const open = first(instance.value!.parts.panel)!
  expect(open.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0)
  expect(getComputedStyle(open).opacity).toBe('1')
})
