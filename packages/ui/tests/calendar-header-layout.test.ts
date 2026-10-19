import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Calendar from '../src/components/Calendar/Calendar.vue'

// Real transitions: the test stub wraps labels in an element apps never have.
const global = { stubs: { transition: false, 'transition-group': false } }
const SEPT_2026 = new Date(2026, 8, 15)
const rect = (el: Element) => el.getBoundingClientRect()

test('in a narrow column the calendar, padding included, stays inside it', async () => {
  await page.viewport(1000, 800)
  const screen = await render(
    () =>
      h('div', { style: 'width: 264px' }, [
        h(Calendar, { modelValue: SEPT_2026, locale: 'en-US', months: 2, showYearButtons: true }),
      ]),
    { global },
  )
  const column = rect(screen.container.firstElementChild!)
  const calendar = screen.container.querySelector('.ui-calendar-root')!
  expect(rect(calendar).right).toBeLessThanOrEqual(column.right + 0.5)
  for (const nav of calendar.querySelectorAll('.ui-calendar-nav'))
    expect(rect(nav).right).toBeLessThanOrEqual(column.right + 0.5)
})

test('right to left, previous sits on the right and every arrow points outward', async () => {
  const screen = await render(
    () => h('div', { dir: 'rtl' }, [h(Calendar, { modelValue: SEPT_2026, showYearButtons: true })]),
    { global },
  )
  const nav = (label: string) =>
    screen.container.querySelector<HTMLElement>(`.ui-calendar-nav[aria-label="${label}"]`)!
  expect(rect(nav('Previous month')).left).toBeGreaterThan(rect(nav('Next month')).left)
  for (const button of screen.container.querySelectorAll('.ui-calendar-nav svg'))
    expect(getComputedStyle(button).scale).toBe('-1 1')
})

test('two months: a long custom label ends before the arrows', async () => {
  await page.viewport(1100, 700)
  const label = ({ label }: { label: string }) => h('span', `${label} (fiscal year, period 3)`)
  const screen = await render(
    () => h(Calendar as never, { modelValue: SEPT_2026, locale: 'es-ES', months: 2 }, { label }),
    { global },
  )
  const [prev, next] = Array.from(screen.container.querySelectorAll('.ui-calendar-nav'), rect)
  const [first, last] = Array.from(
    screen.container.querySelectorAll('.ui-calendar-pane-label'),
    rect,
  )
  expect(first!.left).toBeGreaterThanOrEqual(prev!.right)
  expect(last!.right).toBeLessThanOrEqual(next!.left)
})

test('the month name never hops while it changes, even to a shorter one', async () => {
  await page.viewport(1100, 700)
  for (const props of [
    {},
    { showYearButtons: true },
    { months: 2 },
    { months: 2, showYearButtons: true },
  ]) {
    const screen = await render(
      () => h(Calendar, { modelValue: SEPT_2026, locale: 'en-US', ...props }),
      { global },
    )
    const root = screen.container
    const months = (props as { months?: number }).months ?? 1
    // September → October: the outgoing name is the longer one.
    const textTops = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          months === 1 ? '.ui-calendar-label-text' : '.ui-calendar-pane-label',
        ),
        (el) => {
          const range = document.createRange()
          range.selectNodeContents(el)
          const { top, left, width } = range.getBoundingClientRect()
          return {
            top: Math.round(top),
            centre: Math.round(left + width / 2),
            lines: range.getClientRects().length,
          }
        },
      )
    const resting = textTops()[0]!
    const next = root.querySelectorAll<HTMLElement>('.ui-calendar-nav')
    const watching = (async () => {
      for (let i = 0; i < 12; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
        for (const text of textTops()) {
          expect(text.top).toBe(resting.top)
          expect(text.lines).toBe(1)
        }
      }
    })()
    await userEvent.click(next[next.length - (props.showYearButtons ? 2 : 1)]!)
    await watching
    screen.unmount()
  }
})
