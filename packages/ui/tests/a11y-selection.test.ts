import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import CascadeSelect from '../src/components/CascadeSelect/CascadeSelect.vue'
import Tree from '../src/components/Tree/Tree.vue'
import TreeSelect from '../src/components/TreeSelect/TreeSelect.vue'
import Field from '../src/components/Field/Field.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-select-positioner, .ui-menu-positioner'))
    el.remove()
})

const items = [
  { label: 'Apple', value: 'a' },
  { label: 'Banana', value: 'b' },
  { label: 'Cherry', value: 'c' },
]
const cities = [
  {
    label: 'Ghana',
    value: 'gh',
    children: [
      { label: 'Accra', value: 'accra' },
      { label: 'Kumasi', value: 'kumasi' },
    ],
  },
]
const nodes = [
  {
    label: 'Fruits',
    value: 'fruits',
    children: [
      { label: 'Apple', value: 'apple' },
      { label: 'Pear', value: 'pear' },
    ],
  },
  { label: 'Bread', value: 'bread' },
]

// Tab stops inside an element: what a keyboard user would land on.
function tabbable(root: Element) {
  return Array.from(root.querySelectorAll<HTMLElement>('button, input, [tabindex]')).filter(
    (el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled,
  )
}

test('Tree: aria-label and aria-labelledby name the role="tree" element, not its wrapper', async () => {
  const screen = await render({
    components: { Tree },
    data: () => ({ nodes }),
    template: `<Tree :items="nodes" aria-label="Pantry" class="mine" />
      <span id="files-label">Files</span><Tree :items="nodes" aria-labelledby="files-label" />`,
  })
  const [pantry, files] = screen.container.querySelectorAll('[role="tree"]')
  expect(pantry!.getAttribute('aria-label')).toBe('Pantry')
  expect(files!.getAttribute('aria-labelledby')).toBe('files-label')
  const root = pantry!.closest('.ui-tree-root')!
  expect(root.hasAttribute('aria-label')).toBe(false)
  expect(root.classList.contains('mine')).toBe(true)
})

test("TreeSelect: the tree is named by the Field's label, or by the trigger's aria-label", async () => {
  const screen = await render({
    components: { TreeSelect, Field },
    data: () => ({ nodes }),
    template: `<Field label="Category"><TreeSelect :items="nodes" :filterable="false" /></Field>
      <TreeSelect :items="nodes" :filterable="false" aria-label="Aisle" />`,
  })
  const [inField, labelled] = screen.container.querySelectorAll<HTMLElement>('[role="combobox"]')
  await userEvent.click(inField!)
  await expect.element(screen.getByRole('tree', { name: 'Category' })).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  await userEvent.click(labelled!)
  await expect.element(screen.getByRole('tree', { name: 'Aisle' })).toBeInTheDocument()
})

test('CascadeSelect: the trigger is a menu button, not a combobox over a menu', async () => {
  const screen = await render({
    components: { CascadeSelect, Field },
    data: () => ({ cities, model: 'accra' }),
    template: `<Field label="City"><CascadeSelect v-model="model" :items="cities" /></Field>`,
  })
  expect(screen.container.querySelector('[role="combobox"]')).toBeNull()
  // The label leads and the value follows, as a menu button reads.
  const trigger = screen.getByRole('button', { name: 'City Accra' })
  await expect.element(trigger).toHaveAttribute('aria-haspopup', 'menu')
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true')
  const menu = document.querySelector('[role="menu"]')!
  await expect.element(trigger).toHaveAttribute('aria-controls', menu.id)
})

test('Select with filter: the search box is the combobox while the panel is open', async () => {
  const screen = await render({
    components: { Select },
    data: () => ({ items, model: null }),
    template: `<Select v-model="model" :items="items" filter aria-label="Fruit" />`,
  })
  const trigger = screen.getByRole('combobox', { name: 'Fruit' })
  await trigger.click()
  const search = document.querySelector<HTMLInputElement>('.ui-select-filter input')!
  await vi.waitFor(() => expect(document.activeElement).toBe(search))
  const listbox = document.querySelector('[role="listbox"]')!
  expect(search.getAttribute('role')).toBe('combobox')
  expect(search.getAttribute('aria-expanded')).toBe('true')
  expect(search.getAttribute('aria-controls')).toBe(listbox.id)
  expect(search.getAttribute('aria-autocomplete')).toBe('list')
  await userEvent.keyboard('{ArrowDown}')
  const active = document.querySelector('[role="option"][data-active]')!
  await vi.waitFor(() => expect(search.getAttribute('aria-activedescendant')).toBe(active.id))
  // Focus is in the search box, so the trigger doesn't point at an option too.
  expect(trigger.element().hasAttribute('aria-activedescendant')).toBe(false)
})

test.each([
  ['Select', '[role="combobox"]'],
  ['CascadeSelect', '.ui-cascade-select-control'],
  ['TreeSelect', '[role="combobox"]'],
] as const)('%s: the clear button returns focus to the trigger', async (name, selector) => {
  const screen = await render({
    components: { Select, CascadeSelect, TreeSelect },
    data: () => ({
      items,
      cities,
      nodes,
      model: { Select: 'a', CascadeSelect: 'accra', TreeSelect: 'bread' },
    }),
    template: `<Select v-if="'${name}' === 'Select'" v-model="model.Select" :items="items" clearable aria-label="Fruit" />
      <CascadeSelect v-if="'${name}' === 'CascadeSelect'" v-model="model.CascadeSelect" :items="cities" clearable aria-label="City" />
      <TreeSelect v-if="'${name}' === 'TreeSelect'" v-model="model.TreeSelect" :items="nodes" clearable aria-label="Food" />`,
  })
  const trigger = screen.container.querySelector<HTMLElement>(selector)!
  trigger.focus()
  // The clear button is the next tab stop, outside the trigger.
  await userEvent.tab()
  const clear = document.activeElement as HTMLElement
  expect(clear.tagName).toBe('BUTTON')
  expect(trigger.contains(clear)).toBe(false)
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() =>
    expect(screen.container.querySelector(`button[class$="-clear"]`)).toBeNull(),
  )
  expect(document.activeElement).toBe(trigger)
})

test('Combobox: removing the last chip puts focus back in the input', async () => {
  const screen = await render({
    components: { Combobox },
    data: () => ({ items, model: ['a'] }),
    template: `<Combobox v-model="model" :items="items" multiple :open-on-focus="false" aria-label="Fruit" />`,
  })
  const remove = screen.getByRole('button', { name: 'Remove Apple' })
  ;(remove.element() as HTMLElement).focus()
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(screen.container.querySelector('.ui-chip')).toBeNull())
  expect(document.activeElement).toBe(screen.getByRole('combobox').element())
})

test('Select: removing the last chip while it holds focus puts focus back on the trigger', async () => {
  const screen = await render({
    components: { Select },
    data: () => ({ items, model: ['a'] }),
    template: `<Select v-model="model" :items="items" multiple aria-label="Fruit" />`,
  })
  const remove = screen.container.querySelector<HTMLElement>('.ui-chip-remove')!
  remove.focus()
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(screen.container.querySelector('.ui-chip')).toBeNull())
  expect(document.activeElement).toBe(screen.getByRole('combobox').element())
})

test.each([
  ['Select', 'combobox'],
  ['CascadeSelect', 'button'],
] as const)(
  '%s: nothing inside the trigger is interactive; Backspace and Delete remove the last chip',
  async (name, role) => {
    const screen = await render({
      components: { Select, CascadeSelect },
      data: () => ({
        items,
        cities,
        model: name === 'Select' ? ['a', 'b', 'c'] : ['accra', 'kumasi'],
      }),
      template: `<Select v-if="'${name}' === 'Select'" v-model="model" :items="items" multiple clearable aria-label="Pick" />
        <CascadeSelect v-else v-model="model" :items="cities" multiple clearable aria-label="Pick" />
        <output data-testid="model">{{ JSON.stringify(model) }}</output>`,
    })
    // CascadeSelect reads its value after the label.
    const trigger = screen.getByRole(role, { name: /^Pick/ }).element() as HTMLElement
    const removes = trigger.querySelectorAll<HTMLElement>('.ui-chip-remove')
    expect(removes.length).toBeGreaterThan(1)
    await vi.waitFor(() => expect(tabbable(trigger)).toEqual([]))
    for (const remove of removes) expect(remove.getAttribute('aria-hidden')).toBe('true')
    // The clear button sits beside the trigger and stays a tab stop.
    const clear = trigger.parentElement!.querySelector<HTMLElement>('button[class$="-clear"]')!
    expect(trigger.contains(clear)).toBe(false)
    expect(clear.tabIndex).toBe(0)

    trigger.focus()
    await userEvent.keyboard('{Backspace}')
    const after = name === 'Select' ? '["a","b"]' : '["accra"]'
    await expect.element(screen.getByTestId('model')).toHaveTextContent(after)
    await userEvent.keyboard('{Delete}')
    const last = name === 'Select' ? '["a"]' : '[]'
    await expect.element(screen.getByTestId('model')).toHaveTextContent(last)
    expect(document.activeElement).toBe(trigger)
  },
)

test('Tree checkbox mode: the row is the one tab stop and Space checks it', async () => {
  const screen = await render({
    components: { Tree },
    data: () => ({ nodes, model: [] }),
    template: `<Tree v-model="model" :items="nodes" selection-mode="checkbox" :filterable="false" aria-label="Pantry" />
      <output data-testid="model">{{ JSON.stringify(model) }}</output>`,
  })
  const tree = screen.getByRole('tree').element()
  const inputs = tree.querySelectorAll<HTMLInputElement>('.ui-checkbox-input')
  expect(inputs.length).toBe(2)
  for (const input of inputs) expect(input.tabIndex).toBe(-1)
  const stops = tabbable(tree)
  expect(stops).toHaveLength(1)
  expect(stops[0]!.getAttribute('role')).toBe('treeitem')

  stops[0]!.focus()
  await userEvent.keyboard('{End}')
  await userEvent.keyboard(' ')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["bread"]')
  expect(tree.querySelector('[data-tree-value="bread"]')!.getAttribute('aria-checked')).toBe('true')
})

test('Tree: the tab stop starts on the selected row', async () => {
  const screen = await render({
    components: { Tree },
    data: () => ({ nodes, model: 'bread' }),
    template: `<Tree v-model="model" :items="nodes" :filterable="false" aria-label="Pantry" />`,
  })
  const row = screen.container.querySelector<HTMLElement>('[data-tree-value="bread"]')!
  await vi.waitFor(() => expect(row.tabIndex).toBe(0))
  expect(tabbable(screen.getByRole('tree').element())).toEqual([row])
})

test('TreeSelect opens focused on the selected row, opening the folders above it', async () => {
  const screen = await render({
    components: { TreeSelect },
    data: () => ({ nodes, model: 'pear' }),
    template: `<TreeSelect v-model="model" :items="nodes" :filterable="false" aria-label="Food" />`,
  })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-tree-value')).toBe('pear'),
  )
  expect(document.querySelector('[data-tree-value="fruits"]')!.getAttribute('aria-expanded')).toBe(
    'true',
  )
})

test('TreeSelect reads its "N selected" summary from the treeSelect.selectedCount message', async () => {
  const screen = await render({
    components: { TreeSelect, ConfigProvider },
    data: () => ({ nodes, model: ['apple', 'bread'] }),
    template: `<ConfigProvider :messages="{ treeSelect: { selectedCount: '{count} gekozen' } }">
      <TreeSelect v-model="model" :items="nodes" selection-mode="multiple" aria-label="Food" />
    </ConfigProvider>`,
  })
  await expect.element(screen.getByRole('combobox')).toHaveTextContent('2 gekozen')
})

test.each(['Select', 'Combobox'] as const)(
  'virtualized %s options carry aria-setsize and aria-posinset',
  async (name) => {
    const many = Array.from({ length: 300 }, (_, i) => ({ label: `Item ${i + 1}`, value: i }))
    const screen = await render({
      components: { Select, Combobox },
      data: () => ({ many }),
      template:
        name === 'Select'
          ? `<Select :items="many" aria-label="Many" />`
          : `<Combobox :items="many" aria-label="Many" />`,
    })
    await screen.getByRole('combobox').click()
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(0),
    )
    const options = document.querySelectorAll<HTMLElement>('[role="option"]')
    // Only part of the list renders, so each option says where it sits in the whole.
    expect(options.length).toBeLessThan(300)
    for (const option of options) {
      expect(option.getAttribute('aria-setsize')).toBe('300')
      expect(option.getAttribute('aria-posinset')).toBe(
        String(Number(option.dataset.virtualIndex) + 1),
      )
    }
  },
)
