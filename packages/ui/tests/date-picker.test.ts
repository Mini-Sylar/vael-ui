import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import DatePickerFixture from './fixtures/DatePickerFixture.vue'
import DatePickerFormFixture from './fixtures/DatePickerFormFixture.vue'
import DatePicker from '../src/components/DatePicker.vue'

beforeEach(() => {
  // Teleported positioners can outlive a fixture torn down mid-transition —
  // same cleanup as select.test.ts.
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

test('a plain class passed to DatePicker reaches the rendered trigger', async () => {
  const screen = render(DatePicker, { attrs: { class: 'my-date-picker' } })
  const trigger = screen.getByRole('combobox')
  expect(trigger.element().closest('.my-date-picker')).not.toBeNull()
})

const JUNE_15_2024 = new Date(2024, 5, 15)

function cellByIso(iso: string): HTMLElement | undefined {
  return document.querySelector<HTMLElement>(`[data-date="${iso}"]`) ?? undefined
}

test('opens on trigger click and shows the calendar panel', async () => {
  const screen = render(DatePickerFixture)
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-root')).not.toBeNull())
})

test('single mode: picking a date commits it and auto-closes', async () => {
  const screen = render(DatePickerFixture, { props: { initialValue: JUNE_15_2024 } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(cellByIso('2024-06-20')).toBeDefined())
  await userEvent.click(cellByIso('2024-06-20')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('Jun 20 2024')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('the trigger input displays the formatted selection', async () => {
  const screen = render(DatePickerFixture, { props: { initialValue: JUNE_15_2024 } })
  const input = screen.getByRole('combobox')
  await expect.element(input).toHaveValue(expect.stringContaining('2024'))
})

test('min/max bounds block selection of out-of-range days', async () => {
  const screen = render(DatePickerFixture, {
    props: {
      initialValue: JUNE_15_2024,
      minDate: new Date(2024, 5, 10),
      maxDate: new Date(2024, 5, 20),
    },
  })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(cellByIso('2024-06-05')).toBeDefined())
  const early = cellByIso('2024-06-05')!
  expect(early.getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(early, { force: true })
  await expect.element(screen.getByTestId('model')).toHaveTextContent('Jun 15 2024')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('the disabled prop disables the trigger and blocks opening', async () => {
  const screen = render(DatePickerFixture, { props: { disabled: true } })
  const trigger = screen.getByRole('combobox')
  await expect.element(trigger).toBeDisabled()
  await trigger.click({ force: true })
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('a plain <form> post renders hidden input(s) mirroring the selection', async () => {
  const screen = render(DatePickerFormFixture)
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-root')).not.toBeNull())
  const today = new Date()
  await userEvent.click(
    cellByIso(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)!,
  )
  const hidden = document.querySelector<HTMLInputElement>('input[type="hidden"][name="departure"]')
  expect(hidden).not.toBeNull()
  expect(hidden!.value).toMatch(/^\d{4}-\d{2}-01$/)
})

test('range mode: two clicks commit a start/end pair, and the panel stays open after the first', async () => {
  const screen = render(DatePickerFixture, {
    props: { selectionMode: 'range', initialValue: undefined },
  })
  await screen.getByRole('combobox').click()
  // No initialValue here — the panel opens on today's real month, so drive
  // selection against whatever cells are actually rendered for the visible
  // month instead of a hardcoded date.
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-cell')).not.toBeNull())
  const visibleCell = document.querySelector<HTMLElement>(
    '.ui-calendar-cell:not(.ui-calendar-cell--outside)',
  )!
  const startIso = visibleCell.dataset.date!
  await userEvent.click(visibleCell)
  // First endpoint alone must NOT close the panel — there's a second date
  // still to pick.
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  const [y, m, d] = startIso.split('-').map(Number)
  const endCell = cellByIso(
    `${y}-${String(m).padStart(2, '0')}-${String(Math.min((d ?? 1) + 3, 27)).padStart(2, '0')}`,
  )!
  await userEvent.click(endCell)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('model')).not.toHaveTextContent('null / null')
})

test('view="month": clicking a month cell commits it directly, no day grid involved', async () => {
  const screen = render(DatePickerFixture, { props: { view: 'month' } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-month-grid')).not.toBeNull())
  expect(document.querySelector('.ui-calendar-grid')).toBeNull()
  const firstMonth = document.querySelector<HTMLElement>(
    '.ui-calendar-month-cell:not(.ui-calendar-month-cell--disabled)',
  )!
  await userEvent.click(firstMonth)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('model')).not.toHaveTextContent('null')
})

test('view="year": clicking a year cell commits it directly', async () => {
  const screen = render(DatePickerFixture, { props: { view: 'year' } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-year-grid')).not.toBeNull())
  const firstYear = document.querySelector<HTMLElement>(
    '.ui-calendar-year-cell:not(.ui-calendar-year-cell--disabled)',
  )!
  await userEvent.click(firstYear)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('model')).not.toHaveTextContent('null')
})

test('view="date": clicking the header label drills up to month, then year, then a pick descends back down', async () => {
  const screen = render(DatePickerFixture, { props: { initialValue: JUNE_15_2024 } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-grid')).not.toBeNull())

  const labelButton = document.querySelector<HTMLElement>('.ui-calendar-label--button')!
  await userEvent.click(labelButton)
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-month-grid')).not.toBeNull())

  await userEvent.click(document.querySelector<HTMLElement>('.ui-calendar-label--button')!)
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-year-grid')).not.toBeNull())

  const yearCell = document.querySelector<HTMLElement>(
    '.ui-calendar-year-cell:not(.ui-calendar-year-cell--disabled)',
  )!
  await userEvent.click(yearCell)
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-month-grid')).not.toBeNull())

  const monthCell = document.querySelector<HTMLElement>(
    '.ui-calendar-month-cell:not(.ui-calendar-month-cell--disabled)',
  )!
  await userEvent.click(monthCell)
  // Back down to the day grid — view is 'date', so a month pick descends
  // rather than committing.
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-grid')).not.toBeNull())
  // Picking a month while view is 'date' must NOT close the panel or commit
  // a value — it's pure navigation.
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})
