import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef } from 'vue'
import Calendar from '../src/components/Calendar/Calendar.vue'
import type { CalendarRange } from '../src/components/Calendar/Calendar.vue'

type Value = Date | CalendarRange | null

async function renderCalendar(props: Record<string, unknown>, initial: Value = null) {
  const model = shallowRef<Value>(initial)
  const Host = defineComponent(
    () => () =>
      h(Calendar, {
        locale: 'en-US',
        motion: false,
        ...props,
        modelValue: model.value,
        'onUpdate:modelValue': (value: Value) => (model.value = value),
      }),
  )
  return { screen: await render(Host), model }
}

const active = () => document.activeElement as HTMLElement | null
const tabStops = (selector: string) =>
  [...document.querySelectorAll<HTMLElement>(selector)].filter((el) => el.tabIndex === 0)

test('month grid: one tab stop, arrow keys move it, and the year pages at the edges', async () => {
  await renderCalendar({ view: 'month' }, new Date(2024, 5, 1))
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-month-grid')).not.toBeNull())
  const stops = tabStops('.ui-calendar-month-cell')
  expect(stops).toHaveLength(1)
  expect(stops[0]!.dataset.month).toBe('5')

  stops[0]!.focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(active()?.dataset.month).toBe('6'))
  expect(tabStops('.ui-calendar-month-cell').map((el) => el.dataset.month)).toEqual(['6'])
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(active()?.dataset.month).toBe('10'))
  await userEvent.keyboard('{ArrowUp}{ArrowUp}')
  await vi.waitFor(() => expect(active()?.dataset.month).toBe('2'))
  await userEvent.keyboard('{End}')
  await vi.waitFor(() => expect(active()?.dataset.month).toBe('3'))
  await userEvent.keyboard('{Home}')
  await vi.waitFor(() => expect(active()?.dataset.month).toBe('0'))
  // Past January: December of the year before.
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(active()?.dataset.month).toBe('11'))
  expect(document.querySelector('.ui-calendar-label')!.textContent).toContain('2023')
  await userEvent.keyboard('{PageDown}')
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-calendar-label')!.textContent).toContain('2024'),
  )
  expect(active()?.dataset.month).toBe('11')
})

test('year grid: one tab stop, arrow keys move it, and the window pages past its edges', async () => {
  await renderCalendar({ view: 'year' }, new Date(2024, 0, 1))
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-year-grid')).not.toBeNull())
  const stops = tabStops('.ui-calendar-year-cell')
  expect(stops.map((el) => el.dataset.year)).toEqual(['2024'])

  stops[0]!.focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(active()?.dataset.year).toBe('2025'))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(active()?.dataset.year).toBe('2029'))
  expect(tabStops('.ui-calendar-year-cell').map((el) => el.dataset.year)).toEqual(['2029'])
  // 2020–2031 is on show; 2033 is on the next page.
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(active()?.dataset.year).toBe('2033'))
  expect(document.querySelector<HTMLElement>('.ui-calendar-year-cell')!.dataset.year).toBe('2032')
  await userEvent.keyboard('{PageUp}')
  await vi.waitFor(() => expect(active()?.dataset.year).toBe('2021'))
})

test.each([false, true])(
  'picking a year moves focus into the month grid, and a month into the day grid (motion %s)',
  async (motion) => {
    await renderCalendar({ motion }, new Date(2024, 5, 15))
    await vi.waitFor(() => expect(document.querySelector('.ui-calendar-grid')).not.toBeNull())
    const label = document.querySelector<HTMLElement>('.ui-calendar-label--button')!
    label.focus()
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => expect(document.querySelector('.ui-calendar-month-grid')).not.toBeNull())
    ;(document.querySelector('.ui-calendar-label--button') as HTMLElement).focus()
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => expect(document.querySelector('.ui-calendar-year-grid')).not.toBeNull())

    const year = document.querySelector<HTMLElement>('[data-year="2026"]')!
    year.focus()
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() =>
      expect(active()?.classList.contains('ui-calendar-month-cell')).toBe(true),
    )
    expect(active()!.dataset.month).toBe('5')

    await userEvent.keyboard('{ArrowRight}{Enter}')
    await vi.waitFor(() => expect(active()?.dataset.date).toBe('2026-07-15'))
    expect(active()!.tabIndex).toBe(0)
  },
)

test('range: every day between the ends is aria-selected', async () => {
  await renderCalendar(
    { selectionMode: 'range' },
    { start: new Date(2024, 5, 10), end: new Date(2024, 5, 13) },
  )
  await vi.waitFor(() => expect(document.querySelector('[data-date="2024-06-10"]')).not.toBeNull())
  const selected = [...document.querySelectorAll<HTMLElement>('[aria-selected="true"]')].map(
    (el) => el.dataset.date,
  )
  expect(selected).toEqual(['2024-06-10', '2024-06-11', '2024-06-12', '2024-06-13'])
})

test('showWeekNumbers adds an ISO week row header to every week', async () => {
  const { screen } = await renderCalendar(
    { showWeekNumbers: true, firstDayOfWeek: 1 },
    new Date(2024, 11, 15),
  )
  await vi.waitFor(() => expect(document.querySelector('[role="rowheader"]')).not.toBeNull())
  const rows = [...document.querySelectorAll<HTMLElement>('.ui-calendar-grid [role="row"]')]
  const headers = rows.map((row) => row.querySelector('[role="rowheader"]'))
  expect(headers.every((el, i) => el && el === rows[i]!.firstElementChild)).toBe(true)
  // December 2024: Nov 25 is week 48, Dec 30 starts week 1 of 2025.
  expect(headers.map((el) => el!.textContent!.trim())).toEqual(['48', '49', '50', '51', '52', '1'])
  expect(headers[5]!.getAttribute('aria-label')).toBe('Week 1')
  // The weekday row gets a matching empty slot, so the columns line up.
  const weekdays = document.querySelector('.ui-calendar-weekdays')!
  expect(weekdays.children).toHaveLength(8)
  const firstDay = document.querySelector<HTMLElement>('[data-date="2024-11-25"]')!
  const header = headers[0]!.getBoundingClientRect()
  expect(header.right).toBeLessThanOrEqual(firstDay.getBoundingClientRect().left + 1)
  // The whole week stays on the header's line.
  const lastDay = document.querySelector<HTMLElement>('[data-date="2024-12-01"]')!
  expect(Math.abs(lastDay.getBoundingClientRect().top - header.top)).toBeLessThan(2)
  screen.unmount()

  // Sunday first: the row's Thursday names the week, so Jan 2021's first row is week 53.
  await renderCalendar({ showWeekNumbers: true, firstDayOfWeek: 0 }, new Date(2021, 0, 15))
  await vi.waitFor(() => expect(document.querySelector('[role="rowheader"]')).not.toBeNull())
  const first = document.querySelector('.ui-calendar-grid [role="rowheader"]')!
  expect(first.textContent!.trim()).toBe('53')
})

test('without showWeekNumbers there is no week column', async () => {
  await renderCalendar({}, new Date(2024, 5, 15))
  await vi.waitFor(() => expect(document.querySelector('.ui-calendar-grid')).not.toBeNull())
  expect(document.querySelector('[role="rowheader"]')).toBeNull()
  expect(document.querySelector('.ui-calendar-weekdays')!.children).toHaveLength(7)
})
