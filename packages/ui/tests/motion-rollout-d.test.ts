// RFC rollout: Dock, PullToRefresh, Sortable, Stepper, SwipeToReveal, Tree, MenuList, Pagination,
// SelectButton, Toolbar and Tabs take a `motion` with their parts' appearance and states.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Dock from '../src/components/Dock/Dock.vue'
import MenuList from '../src/components/MenuList/MenuList.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'
import PullToRefresh from '../src/components/PullToRefresh/PullToRefresh.vue'
import SelectButton from '../src/components/SelectButton/SelectButton.vue'
import Sortable from '../src/components/Sortable/Sortable.vue'
import Stepper from '../src/components/Stepper/Stepper.vue'
import SwipeToReveal from '../src/components/SwipeToReveal/SwipeToReveal.vue'
import Tabs from '../src/components/Tabs/Tabs.vue'
import Toolbar from '../src/components/Toolbar/Toolbar.vue'
import Tree from '../src/components/Tree/Tree.vue'

const frame = () => new Promise(requestAnimationFrame)
const states = (el: Element | null | undefined) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-state')
const animating = (el: HTMLElement) =>
  el.getAnimations().length > 0 || Number(getComputedStyle(el).opacity) < 1

type Exposed = { parts: Record<string, HTMLElement | HTMLElement[] | null> }
type Slots = Record<string, (...args: never[]) => unknown>

afterEach(() => {
  document.body.innerHTML = ''
})

function mount(component: unknown, props: Record<string, unknown>, slots?: Slots) {
  const instance = shallowRef<Exposed>()
  render({
    setup: () => () => h(component as never, { ...props, ref: instance }, slots as never),
  })
  return instance
}

const first = (part: HTMLElement | HTMLElement[] | null | undefined) =>
  Array.isArray(part) ? part[0] : part

const tabsSlot = {
  default: ({
    items,
    itemProps,
    indicatorProps,
  }: {
    items: string[]
    itemProps: (item: string) => Record<string, unknown>
    indicatorProps: () => Record<string, unknown>
  }) => [h('span', indicatorProps()), ...items.map((item) => h('button', itemProps(item), item))],
}

const cases: {
  name: string
  component: unknown
  props: Record<string, unknown>
  slots?: Slots
  main: string
  parts: string[]
}[] = [
  {
    name: 'Dock',
    component: Dock,
    props: { items: [{ label: 'One' }, { label: 'Two' }] },
    main: 'root',
    parts: ['root', 'item'],
  },
  {
    name: 'PullToRefresh',
    component: PullToRefresh,
    props: { onRefresh: () => {}, style: 'height: 200px' },
    slots: { default: () => h('p', 'Content') },
    main: 'root',
    parts: ['root', 'indicator'],
  },
  {
    name: 'Sortable',
    component: Sortable,
    props: {
      items: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    },
    main: 'root',
    parts: ['root', 'item'],
  },
  {
    name: 'Stepper',
    component: Stepper,
    props: { items: [{ label: 'One' }, { label: 'Two' }] },
    main: 'root',
    parts: ['root', 'step', 'circle', 'connector', 'content'],
  },
  {
    name: 'SwipeToReveal',
    component: SwipeToReveal,
    props: {},
    slots: {
      default: () => h('p', 'Row'),
      'trailing-actions': () => h('button', 'Delete'),
    },
    main: 'root',
    parts: ['root', 'content', 'actions'],
  },
  {
    name: 'Tree',
    component: Tree,
    props: {
      items: [{ value: 'a', label: 'A', children: [{ value: 'b', label: 'B' }] }],
    },
    main: 'list',
    parts: ['list', 'node', 'chevron', 'label'],
  },
  {
    name: 'MenuList',
    component: MenuList,
    props: {
      items: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      active: 'a',
    },
    main: 'root',
    parts: ['root', 'item', 'indicator'],
  },
  {
    name: 'Pagination',
    component: Pagination,
    props: { total: 50 },
    main: 'root',
    parts: ['root', 'button', 'indicator'],
  },
  {
    name: 'SelectButton',
    component: SelectButton,
    props: {
      items: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      modelValue: 'a',
    },
    main: 'root',
    parts: ['root', 'option', 'indicator'],
  },
  {
    name: 'Toolbar',
    component: Toolbar,
    props: {},
    slots: { default: () => [h('button', 'Bold'), h('button', 'Italic')] },
    main: 'root',
    parts: ['root', 'item', 'indicator'],
  },
  {
    name: 'Tabs',
    component: Tabs,
    props: { items: ['one', 'two'], active: 'one' },
    slots: tabsSlot as never,
    main: 'list',
    parts: ['list', 'item', 'indicator'],
  },
]

test.each(cases)(
  '$name: every part is exposed and plays its `initial` on mount',
  async ({ component, props, slots, main, parts }) => {
    const initial = Object.fromEntries(parts.map((part) => [part, { opacity: 0 }]))
    const instance = mount(component, { ...props, motion: { initial } }, slots)
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
    const instance = mount(component, { ...props, motion: false }, slots)
    await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
    for (let i = 0; i < 4; i++) await frame()
    expect(getComputedStyle(first(instance.value!.parts[main])!).opacity).toBe('1')
  },
)

test('PullToRefresh: `refreshing` plays on the indicator', async () => {
  const instance = shallowRef<Exposed & { refresh: () => void }>()
  render({
    setup: () => () =>
      h(
        PullToRefresh,
        {
          ref: instance,
          style: 'height: 200px',
          onRefresh: () => new Promise<void>(() => {}),
          motion: { states: { refreshing: { indicator: { scale: '1.1' } } } },
        },
        { default: () => h('p', 'Content') },
      ),
  })
  await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
  for (let i = 0; i < 3; i++) await frame()
  instance.value!.refresh()
  const indicator = first(instance.value!.parts.indicator)
  await vi.waitFor(() => expect(states(indicator).length).toBeGreaterThan(0))
})

test('Sortable: `dragging` plays on the root when a row is grabbed', async () => {
  const instance = mount(Sortable, {
    items: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
    motion: { states: { dragging: { root: { scale: '1.02' } } } },
  })
  await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
  for (let i = 0; i < 3; i++) await frame()
  const handle = document.querySelector<HTMLElement>('.ui-sortable-handle')!
  handle.focus()
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  const root = first(instance.value!.parts.root)
  await vi.waitFor(() => expect(states(root).length).toBeGreaterThan(0))
})

test('SwipeToReveal: `open` plays on the root', async () => {
  const open = shallowRef(false)
  const instance = shallowRef<Exposed>()
  render({
    setup: () => () =>
      h(
        SwipeToReveal,
        {
          ref: instance,
          open: open.value,
          motion: { states: { open: { root: { scale: '1.02' } } } },
        },
        { default: () => h('p', 'Row'), 'trailing-actions': () => h('button', 'Delete') },
      ),
  })
  await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
  for (let i = 0; i < 3; i++) await frame()
  open.value = true
  const root = first(instance.value!.parts.root)
  await vi.waitFor(() => expect(states(root).length).toBeGreaterThan(0))
})

test('SelectButton: `disabled` plays on the root', async () => {
  const disabled = shallowRef(false)
  const instance = shallowRef<Exposed>()
  render({
    setup: () => () =>
      h(SelectButton as never, {
        ref: instance,
        items: [{ value: 'a', label: 'A' }],
        disabled: disabled.value,
        motion: { states: { disabled: { root: { scale: '0.98' } } } },
      }),
  })
  await vi.waitFor(() => expect(instance.value?.parts).toBeTruthy())
  for (let i = 0; i < 3; i++) await frame()
  disabled.value = true
  await nextTick()
  const root = first(instance.value!.parts.root)
  await vi.waitFor(() => expect(states(root).length).toBeGreaterThan(0))
})

// The ones that had `motion?: boolean`: unset still counts as on, `false` still turns them off.
test('Tree and Sortable: unset is on, `false` marks the root `data-motion="off"`', async () => {
  const tree = { items: [{ value: 'a', label: 'A' }] }
  const sortable = { items: [{ value: 'a', label: 'A' }] }
  render(() => [
    h('div', { class: 'on' }, [h(Tree as never, tree), h(Sortable as never, sortable)]),
    h('div', { class: 'off' }, [
      h(Tree as never, { ...tree, motion: false }),
      h(Sortable as never, { ...sortable, motion: false }),
    ]),
  ])
  await vi.waitFor(() => expect(document.querySelector('.off .ui-sortable')).not.toBeNull())
  expect(document.querySelector('.on .ui-tree-root')!.getAttribute('data-motion')).toBeNull()
  expect(document.querySelector('.on .ui-sortable')!.getAttribute('data-motion')).toBeNull()
  expect(document.querySelector('.off .ui-tree-root')!.getAttribute('data-motion')).toBe('off')
  expect(document.querySelector('.off .ui-sortable')!.getAttribute('data-motion')).toBe('off')
})

test('Pagination and PullToRefresh: unset is on, `false` turns their transitions off', async () => {
  render(() => [
    h('div', { class: 'on' }, [
      h(Pagination, { total: 50 }),
      h(PullToRefresh, { onRefresh: () => {} }, () => 'x'),
    ]),
    h('div', { class: 'off' }, [
      h(Pagination, { total: 50, motion: false }),
      h(PullToRefresh, { onRefresh: () => {}, motion: false }, () => 'x'),
    ]),
  ])
  await vi.waitFor(() => expect(document.querySelector('.off .ui-pagination')).not.toBeNull())
  expect(document.querySelector('.on .ui-pagination')!.classList).not.toContain(
    'ui-pagination--no-motion',
  )
  expect(document.querySelector('.off .ui-pagination')!.classList).toContain(
    'ui-pagination--no-motion',
  )
  const bubble = (side: string) =>
    document.querySelector<HTMLElement>(`.${side} .ui-pull-to-refresh-bubble`)!.style.transition
  expect(bubble('on')).toBe('')
  expect(bubble('off')).toBe('none')
})
