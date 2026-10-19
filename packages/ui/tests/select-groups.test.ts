import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Select from '../src/components/Select/Select.vue'
import type { SelectGroupData, SelectItemData } from '../src/components/Select/Select.vue'

const global = { stubs: { transition: false, 'transition-group': false } }
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

function renderSelect(props: Record<string, unknown> = {}) {
  const model = shallowRef<unknown>(props.multiple ? [] : null)
  const screen = render(
    () =>
      h(Select as never, {
        items: cities,
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => (model.value = value),
        placeholder: 'City',
        ...props,
      }),
    { global },
  )
  return { screen, model }
}
const optionLabels = () =>
  [...document.querySelectorAll('[role="option"] .ui-select-option-label')].map(
    (el) => el.textContent,
  )

test('groups render as labelled groups, and options keep their order', async () => {
  const { screen } = renderSelect()
  await (await screen).getByRole('combobox').click()
  await expect.element(page.getByRole('group', { name: 'Ghana' })).toBeInTheDocument()
  await expect.element(page.getByRole('group', { name: 'Nigeria' })).toBeInTheDocument()
  expect(optionLabels()).toEqual(['Anywhere', 'Accra', 'Kumasi', 'Lagos', 'Abuja'])
  // Group labels aren't options.
  expect(page.getByRole('option', { name: 'Ghana' }).elements()).toHaveLength(0)
})

test('arrow keys move through every group, skipping labels and disabled options', async () => {
  const { screen, model } = renderSelect()
  const trigger = (await screen).getByRole('combobox')
  await trigger.click()
  for (let i = 0; i < 3; i++) await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(model.value).toBe('lag'))
  await expect.element(trigger).toHaveTextContent('Lagos')
})

test('typing filters inside groups and hides a group with no match', async () => {
  const { screen } = renderSelect({ filter: true })
  await (await screen).getByRole('combobox').click()
  const input = document.querySelector<HTMLInputElement>('.ui-select-filter input')!
  await userEvent.type(input, 'ku')
  await vi.waitFor(() => expect(optionLabels()).toEqual(['Kumasi']))
  expect(page.getByRole('group', { name: 'Nigeria' }).elements()).toHaveLength(0)
  await expect.element(page.getByRole('group', { name: 'Ghana' })).toBeInTheDocument()
})

test('multiple: picks across groups show as chips', async () => {
  const { screen, model } = renderSelect({ multiple: true })
  await (await screen).getByRole('combobox').click()
  await page.getByRole('option', { name: 'Accra' }).click()
  await page.getByRole('option', { name: 'Lagos' }).click()
  await vi.waitFor(() => expect(model.value).toEqual(['acc', 'lag']))
})

test('a flat list renders exactly as before, with no group wrappers', async () => {
  const { screen } = renderSelect({
    items: [
      { label: 'Apple', value: 'a' },
      { label: 'Banana', value: 'b' },
    ],
  })
  await (await screen).getByRole('combobox').click()
  await vi.waitFor(() => expect(optionLabels()).toEqual(['Apple', 'Banana']))
  expect(document.querySelectorAll('[role="group"], .ui-select-group-label')).toHaveLength(0)
})

test('options fit inside the list, with no sideways scroll, grouped or flat', async () => {
  for (const items of [cities, [{ label: 'Kumasi', value: 'kum' }]]) {
    const model = shallowRef<unknown>('kum')
    const screen = await render(
      () =>
        h(Select as never, {
          items,
          modelValue: model.value,
          'onUpdate:modelValue': (v: unknown) => (model.value = v),
        }),
      { global },
    )
    await screen.getByRole('combobox').click()
    const list = document.querySelector<HTMLElement>('.ui-select-body')!
    await vi.waitFor(() => expect(list.querySelector('[role="option"]')).toBeTruthy())
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth)
    const option = list.querySelector('[role="option"]')!.getBoundingClientRect()
    expect(option.right).toBeLessThanOrEqual(list.getBoundingClientRect().right)
    screen.unmount()
  }
})

test('#group-label gets your group object and its options still showing; it names the group', async () => {
  const flagged = [
    {
      label: 'Ghana',
      flag: 'GH',
      items: [
        { label: 'Accra', value: 'acc' },
        { label: 'Kumasi', value: 'kum' },
      ],
    },
    { label: 'Nigeria', flag: 'NG', items: [{ label: 'Lagos', value: 'lag' }] },
  ]
  const screen = render(
    () =>
      h(
        Select as never,
        { items: flagged, modelValue: null, filter: true, placeholder: 'City' },
        {
          'group-label': ({
            group,
            items,
          }: {
            group: { label: string; flag: string }
            items: unknown[]
          }) => `${group.flag} ${group.label} (${items.length})`,
        },
      ),
    { global },
  )
  await (await screen).getByRole('combobox').click()
  await expect.element(page.getByRole('group', { name: 'GH Ghana (2)' })).toBeInTheDocument()
  await expect.element(page.getByRole('group', { name: 'NG Nigeria (1)' })).toBeInTheDocument()
  await userEvent.keyboard('Acc')
  await expect.element(page.getByRole('group', { name: 'GH Ghana (1)' })).toBeInTheDocument()
})

test('without the slot, labels render exactly as before', async () => {
  const { screen } = renderSelect()
  await (await screen).getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-select-group-label')).toBeTruthy())
  expect(
    [...document.querySelectorAll('.ui-select-group-label')].map((el) => el.textContent?.trim()),
  ).toEqual(['Ghana', 'Nigeria'])
})

test('ui.group styles each group wrapper and keeps the built-in spacing class', async () => {
  const { screen } = renderSelect({ ui: { group: 'my-group' } })
  await (await screen).getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelectorAll('[role="group"]')).toHaveLength(2))
  for (const group of document.querySelectorAll('[role="group"]')) {
    expect(group.classList).toContain('my-group')
    expect(group.classList).toContain('ui-select-group')
  }
})

test('#item gets the group its option sits in, and none for a loose option', async () => {
  const screen = render(
    () =>
      h(
        Select as never,
        { items: cities, modelValue: null, placeholder: 'City' },
        {
          item: ({ item, group }: { item: SelectItemData; group?: { label: string } }) =>
            `${item.label} in ${group?.label ?? 'none'}`,
        },
      ),
    { global },
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
})

test('a search keeps each group and option on its own element, so animations can track them', async () => {
  const { screen } = renderSelect({ filter: true })
  await (await screen).getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelectorAll('[role="group"]')).toHaveLength(2))
  const nigeria = page.getByRole('group', { name: 'Nigeria' }).element()
  const lagos = page.getByRole('option', { name: 'Lagos' }).element()
  const input = document.querySelector<HTMLInputElement>('.ui-select-filter input')!
  await userEvent.type(input, 'lag')
  await vi.waitFor(() => expect(optionLabels()).toEqual(['Lagos']))
  expect(page.getByRole('group', { name: 'Nigeria' }).element()).toBe(nigeria)
  expect(page.getByRole('option', { name: 'Lagos' }).element()).toBe(lagos)
})

const longGroups = ['A', 'B', 'C', 'D', 'E'].map((g) => ({
  label: `Group ${g}`,
  items: Array.from({ length: 6 }, (_, i) => ({ label: `${g}${i + 1}`, value: `${g}${i + 1}` })),
}))
function activeInView() {
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

test('opening scrolls to the picked option deep in a group, and arrow keys keep the highlight in view', async () => {
  const { screen } = renderSelect({ items: longGroups, modelValue: 'E4', maxPanelHeight: 200 })
  await (await screen).getByRole('combobox').click()
  await vi.waitFor(() => expect(activeInView()).toEqual({ label: 'E4', inView: true }))
  for (let i = 0; i < 8; i++) await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(activeInView()).toEqual({ label: 'D2', inView: true }))
})

test('opening and arrowing through a grouped list scrolls only the list, never the page', async () => {
  const model = shallowRef<unknown>('E4')
  render(
    () =>
      h('div', [
        h('div', { style: 'height: 1500px' }),
        h(Select as never, {
          items: longGroups,
          modelValue: model.value,
          maxPanelHeight: 200,
          'onUpdate:modelValue': (value: unknown) => (model.value = value),
        }),
        h('div', { style: 'height: 1500px' }),
      ]),
    { global },
  )
  const trigger = document.querySelector<HTMLElement>('[role="combobox"]')!
  trigger.scrollIntoView({ block: 'center' })
  const before = window.scrollY
  await userEvent.click(trigger)
  await vi.waitFor(() => expect(activeInView()).toEqual({ label: 'E4', inView: true }))
  for (let i = 0; i < 8; i++) await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(activeInView()).toEqual({ label: 'D2', inView: true }))
  expect(window.scrollY).toBe(before)
})

test('scroll-padding on the list keeps the highlight clear of sticky group labels', async () => {
  renderSelect({
    items: longGroups,
    modelValue: 'E4',
    maxPanelHeight: 200,
    ui: {
      groupLabel: { style: { position: 'sticky', top: '0', zIndex: '1', background: 'white' } },
      list: { style: { scrollPaddingBlockStart: '2rem' } },
    },
  })
  await userEvent.click(document.querySelector<HTMLElement>('[role="combobox"]')!)
  await vi.waitFor(() => expect(activeInView().label).toBe('E4'))
  for (let i = 0; i < 12; i++) {
    await userEvent.keyboard('{ArrowUp}')
    const active = document.querySelector<HTMLElement>('[role="option"][data-active]')!
    const label = active.closest('[role="group"]')!.querySelector('.ui-select-group-label')!
    expect(active.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      label.getBoundingClientRect().bottom - 1,
    )
  }
})
