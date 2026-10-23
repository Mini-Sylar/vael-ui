// The Select family's panels on the motion system: the built-in look, your hooks, and `false`.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'

const global = { stubs: { transition: false, 'transition-group': false } }
const items = [
  { label: 'Accra', value: 'acc' },
  { label: 'Kumasi', value: 'kum' },
]
const tree = [{ label: 'Ghana', value: 'gh', children: items }]
const panels = [
  ['Select', Select, { items }, '.ui-select-panel'],
  ['Combobox', Combobox, { items }, '.ui-select-panel'],
  ['DatePicker', DatePicker, {}, '.ui-select-panel'],
  ['TreeSelect', TreeSelect, { items: tree }, '.ui-select-panel'],
  ['CascadeSelect', CascadeSelect, { items: tree }, '.ui-menu-panel'],
] as const

function renderPanel(component: unknown, props: object, motion: unknown) {
  const open = shallowRef(false)
  render(
    () =>
      h(component as never, {
        ...props,
        motion,
        open: open.value,
        'onUpdate:open': (v: boolean) => (open.value = v),
      }),
    { global },
  )
  return open
}

for (const [name, component, props, selector] of panels) {
  const panel = () => document.querySelector<HTMLElement>(selector)

  test(`${name}: the panel opens on the motion system, from a touch smaller`, async () => {
    const open = renderPanel(component, props, undefined)
    open.value = true
    await vi.waitFor(() => expect(panel()?.getAnimations().length).toBeGreaterThan(0))
    expect(panel()!.classList.contains('ui-select-enter-active')).toBe(false)
  })

  test(`${name}: your hooks get the panel, and it waits for your leave`, async () => {
    const left: HTMLElement[] = []
    const open = renderPanel(component, props, {
      leave: ({ panel }: { panel: HTMLElement }) => {
        left.push(panel)
        return panel.animate([{ opacity: 1 }, { opacity: 0 }], 300)
      },
    })
    open.value = true
    await vi.waitFor(() => expect(panel()).not.toBeNull())
    const opened = panel()!
    open.value = false
    await vi.waitFor(() => expect(left).toEqual([opened]))
    expect(opened.isConnected).toBe(true)
    await vi.waitFor(() => expect(opened.isConnected).toBe(false), { timeout: 1000 })
  })

  test(`${name}: your enter runs once the panel is placed`, async () => {
    const seen: string[] = []
    const open = renderPanel(component, props, {
      enter: ({ positioner }: { positioner: HTMLElement }) =>
        void seen.push(getComputedStyle(positioner).visibility),
    })
    open.value = true
    await vi.waitFor(() => expect(seen).toEqual(['visible']))
  })

  test(`${name}: \`false\` opens and closes it at once`, async () => {
    const open = renderPanel(component, props, false)
    open.value = true
    await nextTick()
    await vi.waitFor(() => expect(panel()).not.toBeNull())
    expect(panel()!.getAnimations()).toHaveLength(0)
    open.value = false
    await nextTick()
    await nextTick()
    expect(panel()).toBeNull()
  })
}

// Wrappers hand `motion` to the Menu or Popover they're built on.
const target = Object.assign(document.createElement('button'), { id: 'tour-target' })
const wrappers = [
  [
    'ContextMenu',
    () => import('../src/components/ContextMenu/ContextMenu.vue'),
    { items: [{ label: 'Copy' }] },
    '.ui-menu-panel',
  ],
  [
    'SplitButton',
    () => import('../src/components/SplitButton/SplitButton.vue'),
    { label: 'Save', items: [{ label: 'Save as' }] },
    '.ui-menu-panel',
  ],
  [
    'Tour',
    () => import('../src/components/Tour/Tour.vue'),
    { steps: [{ target: '#tour-target', title: 'Hi' }] },
    '.ui-popover-panel',
  ],
] as const

for (const [name, load, props, selector] of wrappers) {
  test(`${name}: \`motion\` reaches the panel underneath`, async () => {
    document.body.append(target)
    const { default: component } = await load()
    const entered: HTMLElement[] = []
    const open = renderPanel(component, props, {
      enter: ({ panel }: { panel: HTMLElement }) => void entered.push(panel),
    })
    open.value = true
    await vi.waitFor(() => expect(entered).toHaveLength(1))
    expect(entered[0]!.matches(selector)).toBe(true)
  })
}

// Their panels carry the presence marker: your targets inside join the opening.
for (const [name, component, props, row] of [
  ['Select', Select, { items }, '[role="option"]'],
  ['Combobox', Combobox, { items }, '[role="option"]'],
  ['DatePicker', DatePicker, {}, '[role="gridcell"]'],
  ['TreeSelect', TreeSelect, { items: tree }, '[role="treeitem"]'],
] as const) {
  test(`${name}: targets inside the panel come in with it`, async () => {
    const open = renderPanel(component, props, {
      targets: { rows: { select: row, initial: { opacity: 0 }, duration: 400 } },
    })
    open.value = true
    await vi.waitFor(() => expect(document.querySelector(row)).not.toBeNull())
    await vi.waitFor(() =>
      expect(Number(getComputedStyle(document.querySelector(row)!).opacity)).toBeLessThan(0.9),
    )
  })
}
