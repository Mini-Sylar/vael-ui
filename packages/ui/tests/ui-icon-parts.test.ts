import '../src/style.css'
import { beforeEach, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Select from '../src/components/Select/Select.vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import Input from '../src/components/Input/Input.vue'
import Accordion from '../src/components/Accordion/Accordion.vue'
import AccordionItem from '../src/components/AccordionItem/AccordionItem.vue'
import SplitButton from '../src/components/SplitButton/SplitButton.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'
import Menu from '../src/components/Menu/Menu.vue'
import MenuList from '../src/components/MenuList/MenuList.vue'
import CommandPalette from '../src/components/CommandPalette/CommandPalette.vue'
import Breadcrumb from '../src/components/Breadcrumb/Breadcrumb.vue'
import BreadcrumbSeparator from '../src/components/BreadcrumbSeparator/BreadcrumbSeparator.vue'
import DataTable from '../src/components/DataTable/DataTable.vue'
import Tree from '../src/components/Tree/Tree.vue'
import SpeedDial from '../src/components/SpeedDial/SpeedDial.vue'
import PullToRefresh from '../src/components/PullToRefresh/PullToRefresh.vue'
import PasswordInput from '../src/components/PasswordInput/PasswordInput.vue'

beforeEach(() => {
  // Teleported panels can outlive a test torn down mid-transition.
  for (const el of document.querySelectorAll(
    '.ui-select-positioner, .ui-menu-positioner, .ui-dialog-overlay',
  ))
    el.remove()
})

const Icon = { render: () => h('svg', { viewBox: '0 0 16 16', width: 14, height: 14 }) }
const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
]
const tree = [
  {
    label: 'Fruit',
    value: 'fruit',
    children: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ],
  },
]

// Each element keeps its default class and gains the probe class from `ui`.
async function expectPart(selector: string, probe: string) {
  await vi.waitFor(() => {
    const el = document.querySelector(selector)
    expect(el, selector).not.toBeNull()
    expect(el!.classList).toContain(probe)
  })
}

test('Select: chevron, clear and filterIcon are ui parts', async () => {
  await render(Select, {
    props: {
      items: options,
      modelValue: 'apple',
      clearable: true,
      filter: true,
      open: true,
      ui: { chevron: 'probe-chevron', clear: 'probe-clear', filterIcon: 'probe-filterIcon' },
    },
  })
  await expectPart('.ui-select-chevron', 'probe-chevron')
  await expectPart('.ui-select-clear', 'probe-clear')
  await expectPart('.ui-select-search-icon', 'probe-filterIcon')
})

test('TreeSelect: chevron and clear are ui parts', async () => {
  await render(TreeSelect, {
    props: {
      items: tree,
      modelValue: 'apple',
      clearable: true,
      ui: { chevron: 'probe-chevron', clear: 'probe-clear' },
    },
  })
  await expectPart('.ui-tree-select-trigger .ui-select-chevron', 'probe-chevron')
  await expectPart('.ui-tree-select-trigger .ui-select-clear', 'probe-clear')
})

test('CascadeSelect: chevron, clear and filterIcon are ui parts', async () => {
  await render(CascadeSelect, {
    props: {
      items: tree,
      modelValue: 'apple',
      clearable: true,
      filter: true,
      open: true,
      ui: { chevron: 'probe-chevron', clear: 'probe-clear', filterIcon: 'probe-filterIcon' },
    },
  })
  await expectPart('.ui-cascade-select-chevron', 'probe-chevron')
  await expectPart('.ui-cascade-select-clear', 'probe-clear')
  await expectPart('.ui-cascade-select-search-icon', 'probe-filterIcon')
})

test('Combobox: chevron, clear and createIcon are ui parts', async () => {
  const screen = await render(Combobox, {
    props: {
      items: options,
      modelValue: 'apple',
      clearable: true,
      allowCustom: true,
      ui: { chevron: 'probe-chevron', clear: 'probe-clear', createIcon: 'probe-createIcon' },
    },
  })
  await expectPart('.ui-combobox-chevron', 'probe-chevron')
  await expectPart('.ui-combobox-clear', 'probe-clear')
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  await userEvent.clear(input)
  await userEvent.type(input, 'Cherry')
  await expectPart('.ui-combobox-create-icon', 'probe-createIcon')
})

test('Input: clear is a ui part', async () => {
  await render(Input, {
    props: { modelValue: 'text', clearable: true, ui: { clear: 'probe-clear' } },
  })
  await expectPart('.ui-input-clear', 'probe-clear')
})

test('AccordionItem: chevron is a ui part', async () => {
  await render(Accordion, {
    slots: {
      default: () =>
        h(
          AccordionItem,
          { value: 'a', title: 'First', ui: { chevron: 'probe-chevron' } },
          () => 'Body',
        ),
    },
  })
  await expectPart('.ui-accordion-chevron', 'probe-chevron')
})

test('SplitButton: chevron is a ui part', async () => {
  await render(SplitButton, {
    props: { items: [{ label: 'Duplicate' }], ui: { chevron: 'probe-chevron' } },
    slots: { default: () => 'Save' },
  })
  await expectPart('.ui-split-button-chevron', 'probe-chevron')
})

test('DatePicker: icon is a ui part', async () => {
  await render(DatePicker, { props: { ui: { icon: 'probe-icon' } } })
  await expectPart('.ui-date-picker-icon', 'probe-icon')
})

test('Menu: icon and chevron are ui parts', async () => {
  await render(Menu, {
    props: {
      open: true,
      items: [{ label: 'Share', icon: Icon, items: [{ label: 'Email' }] }],
      ui: { icon: 'probe-icon', chevron: 'probe-chevron' },
    },
    slots: { trigger: () => h('button', { type: 'button' }, 'Open') },
  })
  await expectPart('.ui-menu-item-icon', 'probe-icon')
  await expectPart('.ui-menu-item-chevron', 'probe-chevron')
})

test('MenuList: icon is a ui part', async () => {
  await render(MenuList, {
    props: { items: [{ label: 'Home', icon: Icon }], ui: { icon: 'probe-icon' } },
  })
  await expectPart('.ui-menu-list-item-icon', 'probe-icon')
})

test('CommandPalette: icon is a ui part', async () => {
  await render(CommandPalette, {
    props: {
      open: true,
      items: [{ id: 'new', label: 'New file', icon: Icon }],
      ui: { icon: 'probe-icon' },
    },
  })
  await expectPart('.ui-command-palette-item-icon', 'probe-icon')
})

test('Breadcrumb: icon is a ui part', async () => {
  await render(Breadcrumb, {
    props: {
      items: [{ label: 'Home', icon: Icon }, { label: 'Docs' }],
      ui: { icon: 'probe-icon' },
    },
  })
  await expectPart('.ui-breadcrumb-item-icon', 'probe-icon')
})

test('BreadcrumbSeparator: icon is a ui part', async () => {
  await render(BreadcrumbSeparator, { props: { ui: { icon: 'probe-icon' } } })
  await expectPart('.ui-breadcrumb-separator-icon', 'probe-icon')
})

test('DataTable: sortChevron and expandChevron are ui parts', async () => {
  await render(
    {
      components: { DataTable },
      data: () => ({
        rows: [{ id: 'a', name: 'Alice' }],
        ui: { sortChevron: 'probe-sortChevron', expandChevron: 'probe-expandChevron' },
      }),
      template: `
        <DataTable :data="rows" row-key="id" :ui="ui">
          <template #columns="{ Column }">
            <component :is="Column" field="name" label="Name" sortable />
          </template>
          <template #expansion="{ row }">{{ row.name }}</template>
        </DataTable>`,
    },
    { global: { stubs: { 'transition-group': false } } },
  )
  await expectPart('.ui-datatable-sort-chevron', 'probe-sortChevron')
  await expectPart('.ui-datatable-expand-chevron', 'probe-expandChevron')
})

test('Tree: filterIcon is a ui part', async () => {
  await render(Tree, { props: { items: tree, ui: { filterIcon: 'probe-filterIcon' } } })
  await expectPart('.ui-tree-search-icon', 'probe-filterIcon')
})

test('SpeedDial: icon is a ui part', async () => {
  await render(SpeedDial, { props: { items: [{ label: 'Home' }], ui: { icon: 'probe-icon' } } })
  await expectPart('.ui-speed-dial-trigger-icon', 'probe-icon')
})

test('PullToRefresh: arrow is a ui part', async () => {
  await render(PullToRefresh, {
    props: { onRefresh: () => Promise.resolve(), ui: { arrow: 'probe-arrow' } },
    slots: { default: () => h('div', 'content') },
  })
  await expectPart('.ui-pull-to-refresh-arrow', 'probe-arrow')
})

test('PasswordInput: hintIcon is a ui part', async () => {
  await render(PasswordInput, {
    props: {
      hintPlacement: 'inline',
      rules: [{ label: 'At least 3 characters', test: (v: string) => v.length >= 3 }],
      ui: { hintIcon: 'probe-hintIcon' },
    },
  })
  await expectPart('.ui-password-input-hint-icon', 'probe-hintIcon')
})

const startEnd = {
  start: () => h('span', { 'data-testid': 'start' }, 'S'),
  end: () => h('span', { 'data-testid': 'end' }, 'E'),
}

// Start comes before the control and end after it, both outside it and before the chevron.
function expectStartEnd(container: Element, prefix: string, control: string, chevron: string) {
  const start = container.querySelector(`.${prefix}-start`)!
  const end = container.querySelector(`.${prefix}-end`)!
  const controlEl = container.querySelector(control)!
  const chevronEl = container.querySelector(chevron)!
  expect(start.classList).toContain('probe-start')
  expect(end.classList).toContain('probe-end')
  expect(start.querySelector('[data-testid="start"]')).not.toBeNull()
  expect(end.querySelector('[data-testid="end"]')).not.toBeNull()
  expect(controlEl.contains(start)).toBe(false)
  expect(controlEl.contains(end)).toBe(false)
  expect(start.compareDocumentPosition(controlEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(controlEl.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(end.compareDocumentPosition(chevronEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
}

test('Select: #start and #end render as ui parts outside the combobox', async () => {
  const screen = await render(Select, {
    props: { items: options, ui: { start: 'probe-start', end: 'probe-end' } },
    slots: startEnd,
  })
  expectStartEnd(screen.container, 'ui-select', '[role="combobox"]', '.ui-select-chevron')
  const bare = await render(Select, { props: { items: options } })
  expect(bare.container.querySelector('.ui-select-start, .ui-select-end')).toBeNull()
})

test('TreeSelect: #start and #end render as ui parts outside the combobox', async () => {
  const screen = await render(TreeSelect, {
    props: { items: tree, ui: { start: 'probe-start', end: 'probe-end' } },
    slots: startEnd,
  })
  expectStartEnd(screen.container, 'ui-tree-select', '[role="combobox"]', '.ui-select-chevron')
  const bare = await render(TreeSelect, { props: { items: tree } })
  expect(bare.container.querySelector('.ui-tree-select-start, .ui-tree-select-end')).toBeNull()
})

test('CascadeSelect: #start and #end render as ui parts outside the menu button', async () => {
  const screen = await render(CascadeSelect, {
    props: { items: tree, ui: { start: 'probe-start', end: 'probe-end' } },
    slots: {
      start: () => h('button', { type: 'button', 'data-testid': 'start' }, 'S'),
      end: startEnd.end,
    },
  })
  expectStartEnd(
    screen.container,
    'ui-cascade-select',
    '.ui-cascade-select-control',
    '.ui-cascade-select-chevron',
  )
  // A button in #start doesn't take the popup state from the menu button.
  const control = screen.container.querySelector('.ui-cascade-select-control')!
  expect(control.getAttribute('aria-haspopup')).toBe('menu')
  expect(
    screen.container.querySelector('[data-testid="start"]')!.hasAttribute('aria-haspopup'),
  ).toBe(false)
  const bare = await render(CascadeSelect, { props: { items: tree } })
  expect(
    bare.container.querySelector('.ui-cascade-select-start, .ui-cascade-select-end'),
  ).toBeNull()
})
