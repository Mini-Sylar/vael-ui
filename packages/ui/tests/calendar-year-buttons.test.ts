import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Calendar from '../src/components/Calendar/Calendar.vue'

const JUNE_15_2024 = new Date(2024, 5, 15)
const label = (root: Element) => root.querySelector('.ui-calendar-label-text')!.textContent!.trim()
const nav = (root: Element, name: string) =>
  root.querySelector<HTMLButtonElement>(`.ui-calendar-nav[aria-label="${name}"]`)

test('off by default: only the month arrows', async () => {
  const screen = await render(Calendar, { props: { modelValue: JUNE_15_2024, locale: 'en-US' } })
  expect(screen.container.querySelectorAll('.ui-calendar-nav')).toHaveLength(2)
  expect(nav(screen.container, 'Previous year')).toBeNull()
})

test('« and » jump a whole year and keep the month', async () => {
  const screen = await render(Calendar, {
    props: { modelValue: JUNE_15_2024, locale: 'en-US', showYearButtons: true, motionCss: false },
  })
  const root = screen.container
  expect(root.querySelectorAll('.ui-calendar-nav')).toHaveLength(4)
  expect(label(root)).toBe('June 2024')
  nav(root, 'Previous year')!.click()
  await expect.poll(() => label(root)).toBe('June 2023')
  nav(root, 'Next year')!.click()
  nav(root, 'Next year')!.click()
  await expect.poll(() => label(root)).toBe('June 2025')
})

test('a jump past minDate stops at its month, and « is disabled there', async () => {
  const screen = await render(Calendar, {
    props: {
      modelValue: JUNE_15_2024,
      minDate: new Date(2023, 10, 20),
      locale: 'en-US',
      showYearButtons: true,
      motionCss: false,
    },
  })
  const root = screen.container
  nav(root, 'Previous year')!.click()
  await expect.poll(() => label(root)).toBe('November 2023')
  expect(nav(root, 'Previous year')!.getAttribute('aria-disabled')).toBe('true')
})

test('the year buttons hide in the month grid, where the arrows already step by year', async () => {
  const screen = await render(Calendar, {
    props: { modelValue: JUNE_15_2024, locale: 'en-US', showYearButtons: true, motionCss: false },
  })
  const root = screen.container
  root.querySelector<HTMLButtonElement>('.ui-calendar-label--button')!.click()
  await expect.poll(() => root.querySelectorAll('.ui-calendar-nav').length).toBe(2)
})

test('two months: each pair sits at its own edge', async () => {
  const screen = await render(Calendar, {
    props: { modelValue: JUNE_15_2024, locale: 'en-US', showYearButtons: true, months: 2 },
  })
  const root = screen.container
  const [prevYear, prev, next, nextYear] = Array.from(
    root.querySelectorAll('.ui-calendar-nav'),
  ).map((b) => b.getBoundingClientRect())
  const header = root.querySelector('.ui-calendar-header')!.getBoundingClientRect()
  expect(prev!.left - prevYear!.right).toBeLessThan(8)
  expect(nextYear!.left - next!.right).toBeLessThan(8)
  expect(next!.left - prev!.right).toBeGreaterThan(header.width / 2)
})

test('two months: the arrows clear a long month name', async () => {
  // Side by side, as on a desktop: stacked months never meet the arrows.
  await page.viewport(1000, 700)
  const screen = await render(Calendar, {
    props: {
      modelValue: new Date(2026, 10, 15),
      locale: 'pt-BR',
      showYearButtons: true,
      months: 2,
    },
  })
  const root = screen.container
  const labels = root.querySelectorAll('.ui-calendar-pane-label')
  const navs = Array.from(root.querySelectorAll('.ui-calendar-nav')).map((b) =>
    b.getBoundingClientRect(),
  )
  expect(labels[0]!.getBoundingClientRect().left).toBeGreaterThanOrEqual(navs[1]!.right)
  expect(labels[1]!.getBoundingClientRect().right).toBeLessThanOrEqual(navs[2]!.left)
})

test('one month: moving to a longer month name never widens the calendar mid-transition', async () => {
  await page.viewport(1000, 700)
  const screen = await render(Calendar, {
    props: { modelValue: new Date(2026, 9, 15), locale: 'en-US', showYearButtons: true },
  })
  const root = screen.container.firstElementChild as HTMLElement
  const widths = new Set<number>()
  const sample = async () => {
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      widths.add(Math.round(root.getBoundingClientRect().width))
    }
  }
  const navs = root.querySelectorAll<HTMLElement>('.ui-calendar-nav')
  const watching = sample()
  await userEvent.click(navs[2]!) // October → November, a longer name
  await watching
  expect([...widths]).toHaveLength(1)
})

test("two months: a month picked from the second month's header lands second", async () => {
  const screen = await render(Calendar, {
    props: { modelValue: new Date(2026, 5, 15), locale: 'en-US', months: 2, motionCss: false },
  })
  const root = screen.container
  const paneLabels = () =>
    Array.from(root.querySelectorAll('.ui-calendar-pane-label'), (el) => el.textContent!.trim())
  expect(paneLabels()).toEqual(['June 2026', 'July 2026'])
  root.querySelectorAll<HTMLButtonElement>('.ui-calendar-pane-label')[1]!.click()
  await expect.poll(() => root.querySelector('[data-month="2"]')).toBeTruthy()
  root.querySelector<HTMLElement>('[data-month="2"]')!.click() // March
  await expect.poll(() => paneLabels()).toEqual(['February 2026', 'March 2026'])

  root.querySelectorAll<HTMLButtonElement>('.ui-calendar-pane-label')[0]!.click()
  await expect.poll(() => root.querySelector('[data-month="8"]')).toBeTruthy()
  root.querySelector<HTMLElement>('[data-month="8"]')!.click() // September, from the first header
  await expect.poll(() => paneLabels()).toEqual(['September 2026', 'October 2026'])
})
