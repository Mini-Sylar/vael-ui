import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { h } from 'vue'
import { render } from 'vitest-browser-vue'
import Calendar from '../src/components/Calendar/Calendar.vue'
import CalendarMonthsFixture from './fixtures/CalendarMonthsFixture.vue'

// June 2024 starts on a Saturday, so both June and July pull in neighbouring days.
const JUNE_10_2024 = new Date(2024, 5, 10)

const cell = (iso: string) => document.querySelector<HTMLElement>(`[data-date="${iso}"]`)
const labels = () =>
  [...document.querySelectorAll('.ui-calendar-pane-label')].map((el) => el.textContent?.trim())

test('shows consecutive months, each labelled, with neighbouring days left blank', async () => {
  await render(CalendarMonthsFixture, { props: { start: JUNE_10_2024 } })
  expect(labels()).toEqual(['June 2024', 'July 2024'])
  expect(document.querySelectorAll('[role="grid"]')).toHaveLength(2)
  // Each date appears once: July 1 is a real cell only in July's grid.
  expect(document.querySelectorAll('[data-date="2024-07-01"]')).toHaveLength(1)
  expect(document.querySelectorAll('.ui-calendar-cell--blank').length).toBeGreaterThan(0)
})

test('a range spans the months, with the hover preview carried across', async () => {
  await render(CalendarMonthsFixture, { props: { start: JUNE_10_2024 } })
  await userEvent.hover(cell('2024-07-05')!)
  expect(cell('2024-06-20')!.classList.contains('ui-calendar-cell--in-range')).toBe(true)
  expect(cell('2024-07-03')!.classList.contains('ui-calendar-cell--in-range')).toBe(true)
  await cell('2024-07-05')!.click()
  await expect
    .element(page.getByTestId('model'))
    .toHaveTextContent('Mon Jun 10 2024 - Fri Jul 05 2024')
  // Picking in the second month doesn't move the months.
  expect(labels()).toEqual(['June 2024', 'July 2024'])
})

test('the arrows move all months together', async () => {
  await render(CalendarMonthsFixture, { props: { start: JUNE_10_2024 } })
  await page.getByRole('button', { name: 'Next month' }).click()
  await expect.poll(labels).toEqual(['July 2024', 'August 2024'])
})

test('next stops once the last month shown reaches maxDate', async () => {
  await render(CalendarMonthsFixture, {
    props: { start: JUNE_10_2024, maxDate: new Date(2024, 6, 20) },
  })
  await expect
    .element(page.getByRole('button', { name: 'Next month' }))
    .toHaveAttribute('aria-disabled', 'true')
})

test('arrow keys cross into the next month in place, and page on past the last one', async () => {
  await render(CalendarMonthsFixture, { props: { start: new Date(2024, 5, 30) } })
  await userEvent.click(cell('2024-06-30')!)
  await userEvent.keyboard('{ArrowRight}')
  await expect.poll(() => document.activeElement?.getAttribute('data-date')).toBe('2024-07-01')
  expect(labels()).toEqual(['June 2024', 'July 2024'])
  await userEvent.click(cell('2024-07-31')!)
  await userEvent.keyboard('{ArrowRight}')
  await expect.poll(labels).toEqual(['July 2024', 'August 2024'])
  await expect.poll(() => document.activeElement?.getAttribute('data-date')).toBe('2024-08-01')
})

test('a month picked from a month label lands where that label was', async () => {
  await render(CalendarMonthsFixture, { props: { start: JUNE_10_2024 } })
  await page.getByRole('button', { name: 'July 2024' }).click()
  await page.getByText('Oct', { exact: true }).click()
  await expect.poll(labels).toEqual(['September 2024', 'October 2024'])
})

test('one month renders as before, with the label in the header', async () => {
  await render(CalendarMonthsFixture, { props: { start: JUNE_10_2024, months: 1 } })
  expect(labels()).toEqual([])
  await expect.element(page.getByRole('button', { name: 'June 2024' })).toBeVisible()
  // Neighbouring days still show in a single month.
  expect(cell('2024-05-27')!.classList.contains('ui-calendar-cell--outside')).toBe(true)
})

test('#label replaces the heading content and keeps it clickable, for every month shown', async () => {
  const label = ({ label, level }: { label: string; level: string }) =>
    h('span', { class: 'custom-label', 'data-level': level }, `${label} ⌄`)
  await render(() =>
    h(Calendar as never, { months: 2, modelValue: JUNE_10_2024, locale: 'en-US' }, { label }),
  )
  const labels = [...document.querySelectorAll('.custom-label')].map((el) => el.textContent)
  expect(labels).toEqual(['June 2024 ⌄', 'July 2024 ⌄'])
  await userEvent.click(document.querySelector('.custom-label')!)
  await expect.poll(() => document.querySelector('.custom-label')?.textContent).toBe('2024 ⌄')
  expect(document.querySelector<HTMLElement>('.custom-label')!.dataset.level).toBe('month')
})

test('an endpoint flattens only the corners facing the band', async () => {
  await render(CalendarMonthsFixture, { props: { start: JUNE_10_2024 } })
  const start = cell('2024-06-10')!
  const joins = () =>
    ['join-start', 'join-end'].filter((side) =>
      start.classList.contains(`ui-calendar-cell--${side}`),
    )
  // Alone, before the pointer previews anything: fully rounded.
  expect(joins()).toEqual([])
  await userEvent.hover(cell('2024-06-14')!)
  await expect.poll(joins).toEqual(['join-end'])
  await userEvent.hover(cell('2024-06-05')!)
  await expect.poll(joins).toEqual(['join-start'])
  await userEvent.hover(cell('2024-06-20')!)
  await userEvent.click(cell('2024-06-20')!)
  await expect.poll(joins).toEqual(['join-end'])
  expect(cell('2024-06-20')!.classList.contains('ui-calendar-cell--join-start')).toBe(true)
})
