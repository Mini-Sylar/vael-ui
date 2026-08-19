import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CalendarFixture from './fixtures/CalendarFixture.vue'

// June 2024 is a fixed, hand-verifiable month: June 1 falls on a Saturday, so
// the grid's leading week pulls in May 26-31 — a good known-boundary case.
const JUNE_15_2024 = new Date(2024, 5, 15)

function cellByIso(iso: string): HTMLElement | undefined {
  return document.querySelector<HTMLElement>(`[data-date="${iso}"]`) ?? undefined
}

test('renders the correct month grid for a known month, including real leading days from the prior month', async () => {
  // Pinned explicitly: this test is about leading/trailing-day rendering, not about
  // which day the week starts on, so it shouldn't depend on the ambient default.
  const screen = render(CalendarFixture, {
    props: { initialValue: JUNE_15_2024, firstDayOfWeek: 0 },
  })
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-calendar-label')!)
    .toHaveTextContent('June 2024')
  expect(cellByIso('2024-06-01')).toBeDefined()
  expect(cellByIso('2024-06-30')).toBeDefined()
  // June 1 2024 is a Saturday — the grid pads with May's real tail days.
  const leading = cellByIso('2024-05-26')
  expect(leading).toBeDefined()
  expect(leading!.classList.contains('ui-calendar-cell--outside')).toBe(true)
})

test('first-day-of-week falls back to Monday, not Sunday, when Intl.Locale.weekInfo is unsupported', async () => {
  // Simulates an engine without Intl.Locale.weekInfo — even for a locale (en-US) that
  // would resolve Sunday-first with real weekInfo support, the fallback must not just
  // parrot that back; it's specifically testing the code path taken when weekInfo is
  // absent, which used to silently default to Sunday regardless of locale.
  const OriginalLocale = Intl.Locale
  class LocaleWithoutWeekInfo extends OriginalLocale {}
  Object.defineProperty(LocaleWithoutWeekInfo.prototype, 'weekInfo', {
    get: () => undefined,
    configurable: true,
  })
  // @ts-expect-error -- test-only stub of a built-in for a single assertion
  Intl.Locale = LocaleWithoutWeekInfo

  try {
    const screen = render(CalendarFixture, {
      props: { initialValue: JUNE_15_2024, locale: 'en-US' },
    })
    const firstWeekday = screen.container.querySelector<HTMLElement>('.ui-calendar-weekday')!
    await expect.element(firstWeekday).toHaveTextContent('Mon')
  } finally {
    // @ts-expect-error -- restoring the test-only stub above
    Intl.Locale = OriginalLocale
  }
})

test('next/previous month navigation updates the header and the rendered grid', async () => {
  const screen = render(CalendarFixture, { props: { initialValue: JUNE_15_2024 } })
  const [prevButton, nextButton] = Array.from(
    screen.container.querySelectorAll<HTMLElement>('.ui-calendar-nav'),
  )

  await userEvent.click(nextButton!)
  await vi.waitFor(() => {
    expect(screen.container.querySelector('.ui-calendar-label')).toHaveTextContent('July 2024')
  })
  expect(cellByIso('2024-07-15')).toBeDefined()

  await userEvent.click(prevButton!)
  await vi.waitFor(() => {
    expect(screen.container.querySelector('.ui-calendar-label')).toHaveTextContent('June 2024')
  })
})

test('clicking a date selects it', async () => {
  const screen = render(CalendarFixture, { props: { initialValue: JUNE_15_2024 } })
  await userEvent.click(cellByIso('2024-06-20')!)
  await expect.element(screen.getByTestId('model')).toHaveTextContent('Jun 20 2024')
})

test('min/max bounds disable out-of-range days and block their selection', async () => {
  const screen = render(CalendarFixture, {
    props: {
      initialValue: JUNE_15_2024,
      minDate: new Date(2024, 5, 10),
      maxDate: new Date(2024, 5, 20),
    },
  })
  // aria-disabled counts as "not enabled" for Playwright's own actionability
  // check (same as a native `disabled` attribute) — force dispatches the
  // click anyway so this asserts the component's OWN guard rejects it,
  // matching the established pattern in tree-select.test.ts's disabled-leaf
  // checkbox test. The fixture seeds `model` with `initialValue` (Jun 15,
  // not null), so a correctly-rejected click leaves it AT that seeded value,
  // not reset to null.
  const early = cellByIso('2024-06-05')!
  expect(early.getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(early, { force: true })
  await expect.element(screen.getByTestId('model')).toHaveTextContent('Jun 15 2024')

  const late = cellByIso('2024-06-25')!
  expect(late.getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(late, { force: true })
  await expect.element(screen.getByTestId('model')).toHaveTextContent('Jun 15 2024')

  expect(cellByIso('2024-06-15')!.getAttribute('aria-disabled')).toBeNull()
})

test('disabledDates blocks a specific date, given as either a list or a predicate', async () => {
  const listScreen = render(CalendarFixture, {
    props: { initialValue: JUNE_15_2024, disabledDates: [new Date(2024, 5, 12)] },
  })
  const listCell = cellByIso('2024-06-12')!
  expect(listCell.getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(listCell, { force: true })
  await expect.element(listScreen.getByTestId('model')).toHaveTextContent('Jun 15 2024')
  listScreen.unmount()

  const predicateScreen = render(CalendarFixture, {
    props: { initialValue: JUNE_15_2024, disabledDates: (date: Date) => date.getDay() === 0 },
  })
  const sundayCell = cellByIso('2024-06-16')!
  expect(sundayCell.getAttribute('aria-disabled')).toBe('true')
  await userEvent.click(sundayCell, { force: true })
  await expect.element(predicateScreen.getByTestId('model')).toHaveTextContent('Jun 15 2024')
})

test('keyboard navigation: Left/Right/Up/Down move focus by day, Enter selects the focused day', async () => {
  const screen = render(CalendarFixture, { props: { initialValue: JUNE_15_2024 } })
  const start = cellByIso('2024-06-15')!
  expect(start.tabIndex).toBe(0)
  start.focus()
  expect(document.activeElement).toBe(start)

  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-date')).toBe('2024-06-16'),
  )

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-date')).toBe('2024-06-23'),
  )

  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-date')).toBe('2024-06-22'),
  )

  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-date')).toBe('2024-06-15'),
  )

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('Jun 15 2024')
})

test('PageDown/PageUp move the focused day — and the displayed month — by one month', async () => {
  const screen = render(CalendarFixture, { props: { initialValue: JUNE_15_2024 } })
  cellByIso('2024-06-15')!.focus()

  await userEvent.keyboard('{PageDown}')
  await vi.waitFor(() => {
    expect(screen.container.querySelector('.ui-calendar-label')).toHaveTextContent('July 2024')
  })
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-date')).toBe('2024-07-15'),
  )

  await userEvent.keyboard('{PageUp}')
  await vi.waitFor(() => {
    expect(screen.container.querySelector('.ui-calendar-label')).toHaveTextContent('June 2024')
  })
})
