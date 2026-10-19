import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import type { SelectGroupData, SelectItemData } from '../src/components/Combobox/Combobox.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

const cities: (SelectItemData | SelectGroupData)[] = [
  { label: 'Anywhere', value: 'any' },
  {
    label: 'Ghana',
    items: [
      { label: 'Accra', value: 'acc' },
      { label: 'Kumasi', value: 'kum' },
    ],
  },
  {
    label: 'Nigeria',
    items: [
      { label: 'Lagos', value: 'lag' },
      { label: 'Abuja', value: 'abj', disabled: true },
    ],
  },
]

function renderCombobox(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const model = shallowRef<unknown>(props.multiple ? [] : null)
  const screen = render(() =>
    h(
      Combobox as never,
      {
        items: cities,
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => (model.value = value),
        placeholder: 'City',
        ...props,
      },
      slots,
    ),
  )
  return { screen, model }
}
const optionLabels = () =>
  [...document.querySelectorAll('[role="option"] .ui-select-option-label')].map(
    (el) => el.textContent,
  )

test('groups render as labelled groups, and options keep their order', async () => {
  const { screen } = renderCombobox()
  await (await screen).getByRole('combobox').click()
  await expect.element(page.getByRole('group', { name: 'Ghana' })).toBeInTheDocument()
  await expect.element(page.getByRole('group', { name: 'Nigeria' })).toBeInTheDocument()
  expect(optionLabels()).toEqual(['Anywhere', 'Accra', 'Kumasi', 'Lagos', 'Abuja'])
})

test('typing filters inside groups, hides a group with no match, and the slot count follows', async () => {
  const { screen } = renderCombobox(
    {},
    {
      'group-label': ({ group, items }: { group: { label: string }; items: unknown[] }) =>
        `${group.label} (${items.length})`,
    },
  )
  const input = (await screen).getByRole('combobox')
  await input.click()
  await expect.element(page.getByRole('group', { name: 'Ghana (2)' })).toBeInTheDocument()
  await userEvent.type(input, 'ku')
  await vi.waitFor(() => expect(optionLabels()).toEqual(['Kumasi']))
  await expect.element(page.getByRole('group', { name: 'Ghana (1)' })).toBeInTheDocument()
  expect(document.querySelectorAll('[role="group"]')).toHaveLength(1)
})

test('arrow keys move through every group, skipping disabled options, and Enter picks', async () => {
  const { screen, model } = renderCombobox()
  const input = (await screen).getByRole('combobox')
  await input.click()
  await vi.waitFor(() => expect(optionLabels()).toHaveLength(5))
  for (let i = 0; i < 3; i++) await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(model.value).toBe('lag'))
  await expect.element(input).toHaveValue('Lagos')
})

test('allowCustom: the Create row sits after the groups, outside any group, and picks by keyboard', async () => {
  const { screen, model } = renderCombobox({ allowCustom: true })
  const input = (await screen).getByRole('combobox')
  await input.click()
  await userEvent.type(input, 'Tamale')
  await vi.waitFor(() => expect(document.querySelectorAll('[role="option"]')).toHaveLength(1))
  const create = document.querySelector('[role="option"]')!
  expect(create.closest('[role="group"]')).toBeNull()
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(model.value).toBe('Tamale'))
})

test('multiple: chips show the labels of options picked inside groups', async () => {
  const { screen } = renderCombobox({ multiple: true })
  const input = (await screen).getByRole('combobox')
  await input.click()
  await userEvent.click(page.getByRole('option', { name: 'Accra' }))
  await userEvent.click(page.getByRole('option', { name: 'Lagos' }))
  await vi.waitFor(() =>
    expect(
      [...document.querySelectorAll('.ui-chip-label')].map((el) => el.textContent?.trim()),
    ).toEqual(['Accra', 'Lagos']),
  )
})

test('#item gets the group, and ui.group styles each group wrapper', async () => {
  const { screen } = renderCombobox(
    { ui: { group: 'my-group' } },
    {
      item: ({ item, group }: { item: SelectItemData; group?: { label: string } }) =>
        `${item.label} in ${group?.label ?? 'none'}`,
    },
  )
  await (await screen).getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelectorAll('[role="option"]')).toHaveLength(5))
  expect([...document.querySelectorAll('[role="option"]')].map((el) => el.textContent)).toEqual([
    'Anywhere in none',
    'Accra in Ghana',
    'Kumasi in Ghana',
    'Lagos in Nigeria',
    'Abuja in Nigeria',
  ])
  for (const group of document.querySelectorAll('[role="group"]')) {
    expect(group.classList).toContain('my-group')
  }
})

test('a flat list renders exactly as before, with no group wrappers', async () => {
  const { screen } = renderCombobox({ items: [{ label: 'Accra', value: 'acc' }] })
  await (await screen).getByRole('combobox').click()
  await vi.waitFor(() => expect(optionLabels()).toEqual(['Accra']))
  expect(document.querySelector('[role="group"]')).toBeNull()
})

const longGroups = ['A', 'B', 'C', 'D', 'E'].map((g) => ({
  label: `Group ${g}`,
  items: Array.from({ length: 6 }, (_, i) => ({ label: `${g}${i + 1}`, value: `${g}${i + 1}` })),
}))

test('opening scrolls to the picked option deep in a group, and arrow keys keep the highlight in view', async () => {
  const { screen } = renderCombobox({ items: longGroups, modelValue: 'E4', maxPanelHeight: 200 })
  await (await screen).getByRole('combobox').click()
  const activeInView = () => {
    const list = [...document.querySelectorAll<HTMLElement>('[role="listbox"]')].find(
      (el) => el.getClientRects().length,
    )!
    const active = list.querySelector<HTMLElement>('[role="option"][data-active]')!
    const l = list.getBoundingClientRect()
    const a = active.getBoundingClientRect()
    return {
      label: active.textContent?.replace('✓', '').trim(),
      inView: a.top >= l.top - 1 && a.bottom <= l.bottom + 1,
    }
  }
  await vi.waitFor(() => expect(activeInView()).toEqual({ label: 'E4', inView: true }))
  for (let i = 0; i < 8; i++) await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(activeInView()).toEqual({ label: 'D2', inView: true }))
})

test('opening and arrowing through a grouped list scrolls only the list, never the page', async () => {
  render(() =>
    h('div', [
      h('div', { style: 'height: 1500px' }),
      h(Combobox as never, { items: longGroups, modelValue: 'E4', maxPanelHeight: 200 }),
      h('div', { style: 'height: 1500px' }),
    ]),
  )
  const input = document.querySelector<HTMLElement>('[role="combobox"]')!
  input.scrollIntoView({ block: 'center' })
  const before = window.scrollY
  await userEvent.click(input)
  await vi.waitFor(() =>
    expect(document.querySelector('[role="option"][data-active]')?.textContent).toContain('E4'),
  )
  for (let i = 0; i < 8; i++) await userEvent.keyboard('{ArrowUp}')
  expect(window.scrollY).toBe(before)
})
