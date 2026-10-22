// Motion rollout: appearance, parts and states for the form controls, chips and separators.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, type Component } from 'vue'
import Checkbox from '../src/components/Checkbox/Checkbox.vue'
import Chip from '../src/components/Chip/Chip.vue'
import Dial from '../src/components/Dial/Dial.vue'
import Knob from '../src/components/Knob/Knob.vue'
import Radio from '../src/components/Radio/Radio.vue'
import RadioGroup from '../src/components/RadioGroup/RadioGroup.vue'
import Rating from '../src/components/Rating/Rating.vue'
import Separator from '../src/components/Separator/Separator.vue'
import Slider from '../src/components/Slider/Slider.vue'
import Switch from '../src/components/Switch/Switch.vue'
import Tag from '../src/components/Tag/Tag.vue'

const frame = () => new Promise(requestAnimationFrame)
const states = (el: Element | null | undefined) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-state')
// The state player loads on demand; once it's here, a change plays instead of catching up.
const playerReady = async () => {
  await import('../src/motion/states')
  for (let i = 0; i < 3; i++) await frame()
}
const hidden = (parts: string[]) => ({
  initial: Object.fromEntries(parts.map((part) => [part, { opacity: 0 }])),
})
type Exposed = { parts: Record<string, HTMLElement | HTMLElement[] | null> }

afterEach(() => {
  document.body.innerHTML = ''
})

const cases: {
  name: string
  parts: string[]
  view: (motion: object, ref: (el: unknown) => void) => ReturnType<typeof h>
  repeated?: Record<string, number>
}[] = [
  {
    name: 'Checkbox',
    parts: ['root', 'control', 'indicator', 'label'],
    view: (motion, ref) => h(Checkbox, { label: 'Agree', motion, ref }),
  },
  {
    name: 'Radio',
    parts: ['root', 'control', 'label', 'description'],
    view: (motion, ref) =>
      h(RadioGroup, null, () =>
        h(Radio, { value: 'a', label: 'A', description: 'First', motion, ref }),
      ),
  },
  {
    name: 'RadioGroup',
    parts: ['root'],
    view: (motion, ref) =>
      h(RadioGroup, { motion, ref }, () => h(Radio, { value: 'a', label: 'A' })),
  },
  {
    name: 'Switch',
    parts: ['root', 'track', 'thumb'],
    view: (motion, ref) => h(Switch, { label: 'Wi-Fi', motion, ref }),
  },
  {
    name: 'Chip',
    parts: ['root', 'remove'],
    view: (motion, ref) => h(Chip, { label: 'Vue', removable: true, motion, ref }),
  },
  {
    name: 'Tag',
    parts: ['root'],
    view: (motion, ref) => h(Tag, { motion, ref }, () => 'New'),
  },
  {
    name: 'Rating',
    parts: ['root', 'item'],
    repeated: { item: 5 },
    view: (motion, ref) => h(Rating, { modelValue: 3, 'aria-label': 'Rating', motion, ref }),
  },
  {
    name: 'Slider',
    parts: ['root', 'track', 'fill', 'thumb'],
    view: (motion, ref) => h(Slider, { modelValue: 40, 'aria-label': 'Volume', motion, ref }),
  },
  {
    name: 'Knob',
    parts: ['root', 'track', 'fill', 'indicator'],
    view: (motion, ref) => h(Knob, { modelValue: 40, 'aria-label': 'Gain', motion, ref }),
  },
  {
    name: 'Dial',
    parts: ['root', 'track', 'fill', 'face', 'ticks'],
    view: (motion, ref) =>
      h(Dial, { modelValue: 40, min: 0, max: 100, 'aria-label': 'Pan', motion, ref }),
  },
  {
    name: 'Separator',
    parts: ['root', 'line', 'text'],
    repeated: { line: 2 },
    view: (motion, ref) => h(Separator, { motion, ref }, () => 'or'),
  },
]

for (const c of cases)
  test(`${c.name}: plays its appearance and exposes its parts`, async () => {
    let exposed: Exposed | undefined
    render({ setup: () => () => c.view(hidden(c.parts), (el) => (exposed = el as Exposed)) })
    await vi.waitFor(() => expect(exposed).toBeTruthy())
    const parts = exposed!.parts
    for (const part of c.parts) {
      const el = parts[part]
      if (c.repeated?.[part]) {
        expect(el, part).toBeInstanceOf(Array)
        expect((el as HTMLElement[]).length, part).toBe(c.repeated[part])
      } else expect(el, part).toBeInstanceOf(Element)
    }
    const root = parts.root as HTMLElement
    await vi.waitFor(() =>
      expect(root.getAnimations().length + (root.style.transition ? 1 : 0)).toBeGreaterThan(0),
    )
    expect(Number(getComputedStyle(root).opacity)).toBeLessThan(1)
  })

// A state the component knows, toggled after it mounts, plays on its part.
const stateCases: {
  name: string
  part: string
  view: (on: boolean, ref: (el: unknown) => void) => ReturnType<typeof h>
}[] = [
  {
    name: 'Checkbox checked',
    part: 'control',
    view: (on, ref) =>
      h(Checkbox as Component, {
        modelValue: on,
        label: 'Agree',
        ref,
        motion: { states: { checked: { control: { scale: '1.1' } } } },
      }),
  },
  {
    name: 'Checkbox indeterminate',
    part: 'control',
    view: (on, ref) =>
      h(Checkbox, {
        indeterminate: on,
        label: 'All',
        ref,
        motion: { states: { indeterminate: { control: { scale: '1.1' } } } },
      }),
  },
  {
    name: 'Checkbox invalid',
    part: 'root',
    view: (on, ref) =>
      h(Checkbox, {
        invalid: on,
        label: 'Agree',
        ref,
        motion: { states: { invalid: { root: { x: [0, -6, 6, 0] } } } },
      }),
  },
  {
    name: 'Radio checked',
    part: 'control',
    view: (on, ref) =>
      h(RadioGroup as Component, { modelValue: on ? 'a' : null }, () =>
        h(Radio, {
          value: 'a',
          label: 'A',
          ref,
          motion: { states: { checked: { control: { scale: '1.1' } } } },
        }),
      ),
  },
  {
    name: 'Switch checked',
    part: 'thumb',
    view: (on, ref) =>
      h(Switch as Component, {
        modelValue: on,
        label: 'Wi-Fi',
        ref,
        motion: { states: { checked: { thumb: { scale: '1.1' } } } },
      }),
  },
  {
    name: 'Chip disabled',
    part: 'root',
    view: (on, ref) =>
      h(Chip, {
        label: 'Vue',
        disabled: on,
        ref,
        motion: { states: { disabled: { root: { opacity: 0.5 } } } },
      }),
  },
  {
    name: 'Rating disabled',
    part: 'root',
    view: (on, ref) =>
      h(Rating, {
        disabled: on,
        'aria-label': 'Rating',
        ref,
        motion: { states: { disabled: { root: { opacity: 0.5 } } } },
      }),
  },
  {
    name: 'Slider disabled',
    part: 'thumb',
    view: (on, ref) =>
      h(Slider, {
        disabled: on,
        'aria-label': 'Volume',
        ref,
        motion: { states: { disabled: { thumb: { scale: '0.8' } } } },
      }),
  },
  {
    name: 'Knob disabled',
    part: 'root',
    view: (on, ref) =>
      h(Knob, {
        disabled: on,
        'aria-label': 'Gain',
        ref,
        motion: { states: { disabled: { root: { opacity: 0.5 } } } },
      }),
  },
  {
    name: 'Dial disabled',
    part: 'face',
    view: (on, ref) =>
      h(Dial, {
        disabled: on,
        'aria-label': 'Pan',
        ref,
        motion: { states: { disabled: { face: { scale: '0.9' } } } },
      }),
  },
]

for (const c of stateCases)
  test(`${c.name} plays its state`, async () => {
    const on = shallowRef(false)
    let exposed: Exposed | undefined
    render({ setup: () => () => c.view(on.value, (el) => el && (exposed = el as Exposed)) })
    await vi.waitFor(() => expect(exposed).toBeTruthy())
    await playerReady()
    const el = () => exposed!.parts[c.part] as HTMLElement
    expect(states(el())).toHaveLength(0)
    on.value = true
    await vi.waitFor(() => expect(states(el()).length).toBeGreaterThan(0))
  })

test('Switch: dragging the thumb plays `dragging`', async () => {
  let exposed: Exposed | undefined
  render({
    setup: () => () =>
      h(Switch, {
        label: 'Wi-Fi',
        ref: (el: unknown) => (exposed = el as Exposed),
        motion: { states: { dragging: { thumb: { scale: '1.2' } } } },
      }),
  })
  await vi.waitFor(() => expect(exposed).toBeTruthy())
  await playerReady()
  const thumb = exposed!.parts.thumb as HTMLElement
  const input = document.querySelector<HTMLInputElement>('.ui-switch-input')!
  const { left, top, height } = input.getBoundingClientRect()
  const at = (x: number) => ({
    clientX: left + x,
    clientY: top + height / 2,
    button: 0,
    bubbles: true,
  })
  input.dispatchEvent(new PointerEvent('pointerdown', at(4)))
  input.dispatchEvent(new PointerEvent('pointermove', at(16)))
  await vi.waitFor(() => expect(states(thumb).length).toBeGreaterThan(0))
  input.dispatchEvent(new PointerEvent('pointerup', at(16)))
})

test('Tag: a press plays `active` on its root', async () => {
  let exposed: Exposed | undefined
  render({
    setup: () => () =>
      h(
        Tag,
        {
          ref: (el: unknown) => (exposed = el as Exposed),
          motion: { states: { active: { root: { scale: '0.96' } } } },
        },
        () => 'New',
      ),
  })
  await vi.waitFor(() => expect(exposed).toBeTruthy())
  await playerReady()
  const root = exposed!.parts.root as HTMLElement
  root.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
  await vi.waitFor(() => expect(states(root).length).toBeGreaterThan(0))
  window.dispatchEvent(new PointerEvent('pointerup'))
})

test('Radio: `false` keeps its built-in transitions off; a motion object leaves them on', async () => {
  render({
    setup: () => () =>
      h(RadioGroup, null, () => [
        h(Radio, { value: 'off', label: 'Off', motion: false }),
        h(Radio, { value: 'on', label: 'On', motion: { initial: { root: { opacity: 0 } } } }),
      ]),
  })
  for (let i = 0; i < 4; i++) await frame()
  const [off, on] = document.querySelectorAll('.ui-radio')
  expect(off!.classList.contains('ui-radio--no-anim')).toBe(true)
  expect(on!.classList.contains('ui-radio--no-anim')).toBe(false)
})

test('Rating: `false` turns off the fill sweep and commit pop; a motion object leaves them on', async () => {
  render({
    setup: () => () => [
      h(Rating, { 'aria-label': 'Off', motion: false }),
      h(Rating, { 'aria-label': 'On', motion: { initial: { root: { opacity: 0 } } } }),
    ],
  })
  await nextTick()
  const [off, on] = document.querySelectorAll('.ui-rating')
  expect(off!.classList.contains('ui-rating--no-motion')).toBe(true)
  expect(on!.classList.contains('ui-rating--no-motion')).toBe(false)
})
