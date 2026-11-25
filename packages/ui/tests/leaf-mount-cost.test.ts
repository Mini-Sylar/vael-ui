// What the small components cost per instance once mounted: no re-render, and no watcher, listener
// or observer they don't need yet.
import '../src/style.css'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import type { Component, ComponentPublicInstance } from 'vue'
import Button from '../src/components/Button/Button.vue'
import Chip from '../src/components/Chip/Chip.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Field from '../src/components/Field/Field.vue'
import Input from '../src/components/Input/Input.vue'
import InputNumber from '../src/components/InputNumber/InputNumber.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'
import Progress from '../src/components/Progress/Progress.vue'
import Radio from '../src/components/Radio/Radio.vue'
import RadioGroup from '../src/components/RadioGroup/RadioGroup.vue'
import SelectButton from '../src/components/SelectButton/SelectButton.vue'
import Slider from '../src/components/Slider/Slider.vue'
import Switch from '../src/components/Switch/Switch.vue'
import Tabs from '../src/components/Tabs/Tabs.vue'
import Textarea from '../src/components/Textarea/Textarea.vue'

const settled = () => new Promise((resolve) => setTimeout(resolve, 100))

// Every component instance, and every re-render after the first.
let instances: ComponentPublicInstance[] = []
let updates: string[] = []
let fresh = 0
const counting = {
  beforeMount(this: ComponentPublicInstance) {
    instances.push(this)
  },
  mounted(this: ComponentPublicInstance) {
    if ((this.$el as Element).hasAttribute?.('data-fresh')) fresh++
  },
  beforeUpdate(this: ComponentPublicInstance) {
    updates.push((this.$options as { __name?: string }).__name ?? this.$options.name ?? '')
  },
}
const named = (name: string) =>
  instances.filter((i) => ((i.$options as { __name?: string }).__name ?? i.$options.name) === name)
// The watchers and render effect a component's scope holds.
function effectsOf(instance: ComponentPublicInstance) {
  let count = 0
  const scope = (instance.$ as unknown as { scope: { deps?: { nextDep?: unknown } } }).scope
  for (let link = scope.deps; link; link = link.nextDep as typeof link) count++
  return count
}

let listeners: string[] = []
let observed = 0
const addEventListener = EventTarget.prototype.addEventListener
const observe = ResizeObserver.prototype.observe
beforeEach(() => {
  instances = []
  updates = []
  fresh = 0
  listeners = []
  observed = 0
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest) {
    if (capturing && this === window) listeners.push(`window:${type}`)
    // Not the test root, where the test utils hear every DOM event.
    else if (capturing && this instanceof Element && this.closest('[class*="ui-"]'))
      listeners.push(type)
    return addEventListener.call(this, type, ...(rest as [EventListener]))
  } as typeof addEventListener
  ResizeObserver.prototype.observe = function (this: ResizeObserver, ...args) {
    observed++
    return observe.apply(this, args)
  }
})
afterEach(() => {
  EventTarget.prototype.addEventListener = addEventListener
  ResizeObserver.prototype.observe = observe
})

const many = (count: number, make: () => unknown) => () => Array.from({ length: count }, make)
// Listeners count while it mounts, not the test runner's own.
let capturing = false
function mount(fn: () => unknown, stubs: Record<string, boolean> = {}) {
  capturing = true
  try {
    return render({ render: () => h('div', fn() as never) } as Component, {
      global: { mixins: [counting], stubs },
    })
  } finally {
    capturing = false
  }
}

test("buttons don't re-render once mounted; a slot that reads `el` still gets it", async () => {
  await mount(many(20, () => h(Button, null, () => 'Save')))
  await settled()
  expect(updates).toEqual([])
  let seen: unknown
  await mount(() =>
    h(Button, null, {
      default: ({ el }: { el: HTMLElement | null }) => ((seen = el), 'Save'),
    }),
  )
  await vi.waitFor(() => expect(seen).toBeInstanceOf(HTMLButtonElement))
})

test('a plain button listens for clicks only; hold and a plain tag add what they need', async () => {
  await mount(() => h(Button, null, () => 'Save'))
  expect(listeners).toEqual(['click'])
  listeners = []
  const pressing = [
    'blur',
    'click',
    'contextmenu',
    'keydown',
    'keyup',
    'pointercancel',
    'pointerdown',
    'pointerleave',
    'pointerup',
  ]
  for (const props of [{ as: 'div' }, { hold: true }]) {
    listeners = []
    await mount(() => h(Button, props, () => 'Delete'))
    expect(listeners.sort()).toEqual(pressing)
  }
})

test('a plain tag acting as a button still clicks on Enter and Space, and never starts a hold', async () => {
  const onClick = vi.fn()
  await mount(() => h(Button, { as: 'div', onClick }, () => 'Save'))
  const el = document.querySelector<HTMLElement>('div.ui-button')!
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }))
  expect(onClick).toHaveBeenCalledTimes(2)
  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
  await settled()
  expect(el.hasAttribute('data-hold')).toBe(false)
  expect(named('Button')[0]!.$.exposed!.holding.value).toBe(false)
})

test('a button sets up no watcher for `hold` it was not given', async () => {
  await mount(() => h(ConfigProvider, null, () => h(Button, null, () => 'Save')))
  await settled()
  // Its effects, and the provider's computeds it read while setting up. Was 10.
  expect(effectsOf(named('Button')[0]!)).toBeLessThanOrEqual(9)
})

test("switches and radios don't re-render once mounted; first paint skips transitions", async () => {
  await mount(
    many(10, () => h(Switch, { modelValue: true, label: 'On' })),
    // The radios share a group.
  )
  await mount(() =>
    h(RadioGroup, { modelValue: 'a' }, () =>
      ['a', 'b', 'c'].map((value) => h(Radio, { value, label: value })),
    ),
  )
  expect(fresh).toBe(13)
  await settled()
  expect(updates).toEqual([])
  expect(document.querySelectorAll('[data-fresh]').length).toBe(0)
})

test("a Field doesn't re-render for what its control reports once mounted", async () => {
  await mount(
    many(10, () =>
      h(Field, { label: 'Name', labelPlacement: 'float' }, () =>
        h(Input, { modelValue: 'Ada', size: 'lg' }),
      ),
    ),
  )
  await settled()
  expect(updates).toEqual([])
  const field = document.querySelector('.ui-field')!
  expect(field.getAttribute('data-filled')).toBe('true')
  expect(field.getAttribute('data-frame-size')).toBe('lg')
  // Its cells set up nothing until there is one.
  expect(effectsOf(named('Field')[0]!)).toBeLessThanOrEqual(6)
})

test('an input without clearable, a display or a Field sets up only what it uses', async () => {
  await mount(
    many(5, () => h(Input, { modelValue: 'x' })),
    { transition: false },
  )
  await settled()
  expect(named('BaseTransition')).toHaveLength(0)
  // Was 14: overlay observers, a loading watcher, Field reports with no Field, the start slot.
  expect(effectsOf(named('Input')[0]!)).toBeLessThanOrEqual(7)
  expect(listeners.sort()).toEqual(
    Array.from({ length: 5 }, () => ['blur', 'change', 'focus', 'input', 'mousedown'])
      .flat()
      .sort(),
  )
  expect(observed).toBe(0)
})

test('clearable added later still enters its clear button', async () => {
  const clearable = shallowRef(false)
  await mount(() => h(Input, { modelValue: 'x', clearable: clearable.value }), {
    transition: false,
  })
  clearable.value = true
  await vi.waitFor(() => expect(document.querySelector('.ui-input-clear')).not.toBeNull())
  expect(document.querySelector('.ui-input-clear')!.className).toContain('ui-clear-enter')
})

test('a textarea without autoGrow observes nothing', async () => {
  await mount(many(5, () => h(Textarea, { modelValue: 'x' })))
  await settled()
  expect(observed).toBe(0)
  expect(listeners.filter((type) => type === 'input')).toHaveLength(5)
  expect(effectsOf(named('Textarea')[0]!)).toBeLessThanOrEqual(8)
  await mount(() => h(Textarea, { modelValue: 'x', autoGrow: true }))
  expect(observed).toBe(1)
})

test("sliding indicators don't re-render their component once placed", async () => {
  const items = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ]
  await mount(() => [
    h(Pagination, { page: 3, total: 200 }),
    h(SelectButton as never, { modelValue: 'a', items }),
    h(
      Tabs as never,
      { active: 'a', items: ['a', 'b'] },
      {
        default: ({ itemProps, indicatorProps }: Record<string, (v?: string) => object>) => [
          h('button', itemProps!('a'), 'A'),
          h('button', itemProps!('b'), 'B'),
          h('span', indicatorProps!()),
        ],
      },
    ),
  ])
  await vi.waitFor(() =>
    expect(document.querySelectorAll('[data-indicator-placed]')).toHaveLength(3),
  )
  await settled()
  expect(updates).toEqual([])
})

test('a removable chip in a combobox is pointer-only without re-rendering', async () => {
  await mount(() => h('div', { role: 'combobox' }, [h(Chip, { label: 'Ada', removable: true })]))
  await settled()
  expect(updates).toEqual([])
  const remove = document.querySelector('.ui-chip-remove')!
  expect(remove.getAttribute('tabindex')).toBe('-1')
  expect(remove.getAttribute('aria-hidden')).toBe('true')
})

test("a slider listens on window only while it's dragged", async () => {
  await mount(() => h(Slider, { modelValue: 30, 'aria-label': 'Volume' }))
  await settled()
  expect(listeners.filter((type) => type.startsWith('window:'))).toEqual([])
  expect(effectsOf(named('Slider')[0]!)).toBeLessThanOrEqual(6)
})

test('number fields share their formatter; a bar without a legend builds none', async () => {
  const NumberFormat = Intl.NumberFormat
  let built = 0
  Intl.NumberFormat = new Proxy(NumberFormat, {
    construct(target, args) {
      built++
      return Reflect.construct(target, args)
    },
  })
  try {
    await mount(many(10, () => h(Progress, { value: 40 })))
    expect(built).toBe(0)
    await mount(many(10, () => h(InputNumber, { modelValue: 3, locale: 'en-GB' })))
    await nextTick()
    expect(built).toBeLessThanOrEqual(2)
  } finally {
    Intl.NumberFormat = NumberFormat
  }
})
