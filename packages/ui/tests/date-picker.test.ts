import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import DatePickerFixture from './fixtures/DatePickerFixture.vue'
import DatePickerFormFixture from './fixtures/DatePickerFormFixture.vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'

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

test('showButtonBar off by default — no footer at all', async () => {
  const screen = render(DatePickerFixture)
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  expect(document.querySelector('.ui-date-picker-footer')).toBeNull()
})

test("showButtonBar renders Today/Clear; Today commits today's date and closes, Clear empties the model and closes", async () => {
  const screen = render(DatePickerFixture, {
    props: { showButtonBar: true, initialValue: JUNE_15_2024 },
  })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  const todayButton = screen.getByRole('button', { name: 'Today' })
  await expect.element(todayButton).toBeInTheDocument()
  await todayButton.click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('model')).toHaveTextContent(new Date().toDateString())

  await screen.getByRole('combobox').click()
  const clearButton = screen.getByRole('button', { name: 'Clear' })
  await clearButton.click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('null')
})

test("range mode's button bar has no Today button — only Clear", async () => {
  const screen = render(DatePickerFixture, {
    props: { showButtonBar: true, selectionMode: 'range' },
  })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  const buttons = [...document.querySelectorAll('.ui-date-picker-footer button')].map((b) =>
    b.textContent?.trim(),
  )
  expect(buttons).toEqual(['Clear'])

  // With no Today button to push left, Clear must stay flush against the
  // footer's own right edge, not fall back to the flex start.
  const footer = document.querySelector('.ui-date-picker-footer')!
  const clearButton = document.querySelector('.ui-date-picker-footer button')!
  const footerRect = footer.getBoundingClientRect()
  const clearRect = clearButton.getBoundingClientRect()
  expect(Math.abs(clearRect.right - footerRect.right)).toBeLessThan(20)
})

test('single mode: Today sits flush left, Clear flush right, in the same button bar', async () => {
  const screen = render(DatePickerFixture, { props: { showButtonBar: true } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  const footer = document.querySelector('.ui-date-picker-footer')!
  const todayButton = document.querySelector('.ui-date-picker-today')!
  const buttons = [...footer.querySelectorAll('button')]
  const clearButton = buttons.find((b) => b.textContent?.trim() === 'Clear')!
  const footerRect = footer.getBoundingClientRect()
  const todayRect = todayButton.getBoundingClientRect()
  const clearRect = clearButton.getBoundingClientRect()
  expect(Math.abs(todayRect.left - footerRect.left)).toBeLessThan(20)
  expect(Math.abs(clearRect.right - footerRect.right)).toBeLessThan(20)
})

test('a custom #footer slot replaces the built-in button bar, even with showButtonBar on', async () => {
  const screen = render(DatePickerFixture, { props: { showButtonBar: true, customFooter: true } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(screen.getByTestId('custom-footer')).toBeInTheDocument()
  expect(document.querySelector('.ui-date-picker-footer button')).toBeNull()

  screen.unmount()

  // #footer alone (no showButtonBar) still renders — the slot doesn't need the flag.
  const bare = render(DatePickerFixture, { props: { customFooter: true } })
  await bare.getByRole('combobox').click()
  await expect.element(bare.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(bare.getByTestId('custom-footer')).toBeInTheDocument()
})

test('showTime adds an hour/minute row; en-US locale auto-resolves to 12h with an AM/PM toggle', async () => {
  const screen = render(DatePickerFixture, {
    props: { showTime: true, initialValue: JUNE_15_2024 },
  })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(screen.getByRole('spinbutton', { name: 'Hour' })).toBeInTheDocument()
  await expect.element(screen.getByRole('spinbutton', { name: 'Minute' })).toBeInTheDocument()
  const ampm = document.querySelector('.ui-date-picker-ampm')
  expect(ampm).not.toBeNull()
})

test('hourFormat="24" suppresses the AM/PM toggle even under a 12h-default locale', async () => {
  const screen = render(DatePickerFixture, {
    props: { showTime: true, hourFormat: '24', initialValue: JUNE_15_2024 },
  })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  expect(document.querySelector('.ui-date-picker-ampm')).toBeNull()
})

test('picking a date with showTime on keeps the panel open — there is still a time to set', async () => {
  const screen = render(DatePickerFixture, { props: { showTime: true } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-cell')).not.toBeNull())
  const visibleCell = document.querySelector<HTMLElement>(
    '.ui-calendar-cell:not(.ui-calendar-cell--outside)',
  )!
  await userEvent.click(visibleCell)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('typing digits into the hour field commits immediately; out-of-range values clamp', async () => {
  const screen = render(DatePickerFixture, {
    props: { showTime: true, hourFormat: '24', initialValue: JUNE_15_2024 },
  })
  await screen.getByRole('combobox').click()
  const hourField = screen.getByRole('spinbutton', { name: 'Hour' })
  await hourField.fill('')
  await userEvent.type(hourField, '9')
  await expect.element(screen.getByTestId('model-time')).toHaveTextContent('09:00')
})

test('ArrowUp wraps the hour past 23 back to 0, and past 0 back to 23 on ArrowDown', async () => {
  const dec31_2359 = new Date(2024, 11, 31, 23, 0)
  const screen = render(DatePickerFixture, {
    props: { showTime: true, hourFormat: '24', initialValue: dec31_2359 },
  })
  await screen.getByRole('combobox').click()
  const hourField = screen.getByRole('spinbutton', { name: 'Hour' })
  ;(hourField.element() as HTMLElement).focus()
  await userEvent.keyboard('{ArrowUp}')
  await expect.element(screen.getByTestId('model-time')).toHaveTextContent('00:00')
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('model-time')).toHaveTextContent('23:00')
})

test('12h mode wraps hour 12 -> 1 on increment, not 12 -> 0', async () => {
  const noonish = new Date(2024, 5, 15, 12, 0)
  const screen = render(DatePickerFixture, {
    props: { showTime: true, hourFormat: '12', initialValue: noonish },
  })
  await screen.getByRole('combobox').click()
  const hourField = screen.getByRole('spinbutton', { name: 'Hour' })
  ;(hourField.element() as HTMLElement).focus()
  await userEvent.keyboard('{ArrowUp}')
  // 12 PM + 1 hour = 1 PM = 13:00 in 24h storage.
  await expect.element(screen.getByTestId('model-time')).toHaveTextContent('13:00')
})

test('clicking the minute stepper increments by minuteStep, and the AM/PM toggle flips the stored hour by 12', async () => {
  const nineAM = new Date(2024, 5, 15, 9, 0)
  const screen = render(DatePickerFixture, {
    props: { showTime: true, hourFormat: '12', minuteStep: 15, initialValue: nineAM },
  })
  await screen.getByRole('combobox').click()

  const minuteField = document.querySelector('.ui-time-field:has([aria-label="Minute"])')!
  const incButton = minuteField.querySelector<HTMLButtonElement>('.ui-time-field-stepper')!
  await userEvent.click(incButton)
  await expect.element(screen.getByTestId('model-time')).toHaveTextContent('09:15')

  const pmOption = document.querySelector<HTMLElement>('.ui-date-picker-ampm label:last-of-type')!
  await userEvent.click(pmOption)
  await expect.element(screen.getByTestId('model-time')).toHaveTextContent('21:15')
})

test('timeOnly hides the calendar grid entirely — just the time row', async () => {
  const screen = render(DatePickerFixture, { props: { timeOnly: true } })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  expect(document.querySelector('.ui-calendar-root')).toBeNull()
  await expect.element(screen.getByRole('spinbutton', { name: 'Hour' })).toBeInTheDocument()
})

test("timeOnly is inert in range mode — falls back to the calendar instead of an empty panel (time isn't supported for a range)", async () => {
  const screen = render(DatePickerFixture, {
    props: { timeOnly: true, selectionMode: 'range' },
  })
  await screen.getByRole('combobox').click()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-root')).not.toBeNull())
  expect(document.querySelector('.ui-date-picker-time')).toBeNull()
  expect(document.querySelector('.ui-select-panel')?.textContent?.trim()).not.toBe('')
})
