import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import PaginationFixture from './fixtures/PaginationFixture.vue'

function pageButtons(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.ui-pagination-page-button'))
}
function navButtons(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.ui-pagination-nav-button'))
}

test('clicking a page-number button navigates to that page', async () => {
  const screen = render(PaginationFixture, { props: { total: 50, pageSize: 10 } })
  const buttons = pageButtons(screen.container)
  const page3 = buttons.find((b) => b.textContent?.trim() === '3')!
  await userEvent.click(page3)
  await expect.element(screen.getByTestId('page')).toHaveTextContent('3')
})

test('the sliding indicator tracks the active page button, including after navigation', async () => {
  const screen = render(PaginationFixture, { props: { total: 50, pageSize: 10 } })
  const indicator = screen.container.querySelector<HTMLElement>('.ui-pagination-indicator')!
  const activeButton = () => screen.container.querySelector<HTMLElement>('[aria-current="page"]')!

  await vi.waitFor(() => {
    const ib = indicator.getBoundingClientRect()
    const ab = activeButton().getBoundingClientRect()
    expect(Math.abs(ib.left - ab.left)).toBeLessThan(1)
    expect(Math.abs(ib.width - ab.width)).toBeLessThan(1)
  })

  const page3 = pageButtons(screen.container).find((b) => b.textContent?.trim() === '3')!
  await userEvent.click(page3)
  await vi.waitFor(() => {
    const ib = indicator.getBoundingClientRect()
    const ab = activeButton().getBoundingClientRect()
    expect(Math.abs(ib.left - ab.left)).toBeLessThan(1)
    expect(Math.abs(ib.width - ab.width)).toBeLessThan(1)
  })
})

test('prev/first are disabled on page 1, next/last are disabled on the last page', async () => {
  const screen = render(PaginationFixture, { props: { total: 50, pageSize: 10 } })
  const [first, prev, next, last] = navButtons(screen.container)
  expect(first!.hasAttribute('disabled')).toBe(true)
  expect(prev!.hasAttribute('disabled')).toBe(true)
  expect(next!.hasAttribute('disabled')).toBe(false)
  expect(last!.hasAttribute('disabled')).toBe(false)

  await userEvent.click(last!)
  await expect.element(screen.getByTestId('page')).toHaveTextContent('5')
  await vi.waitFor(() => {
    const [first2, prev2, next2, last2] = navButtons(screen.container)
    expect(first2!.hasAttribute('disabled')).toBe(false)
    expect(prev2!.hasAttribute('disabled')).toBe(false)
    expect(next2!.hasAttribute('disabled')).toBe(true)
    expect(last2!.hasAttribute('disabled')).toBe(true)
  })
})

test('next/prev/first step relative to the current page', async () => {
  const screen = render(PaginationFixture, { props: { total: 50, pageSize: 10 } })
  const [, , next] = navButtons(screen.container)
  await userEvent.click(next!)
  await expect.element(screen.getByTestId('page')).toHaveTextContent('2')
  await userEvent.click(next!)
  await expect.element(screen.getByTestId('page')).toHaveTextContent('3')

  const [first, prev] = navButtons(screen.container)
  await userEvent.click(prev!)
  await expect.element(screen.getByTestId('page')).toHaveTextContent('2')
  await userEvent.click(first!)
  await expect.element(screen.getByTestId('page')).toHaveTextContent('1')
})

test('ellipsis collapsing shows 1 … n-1 n [current] n+1 n+2 … last with a realistic 20-page total', async () => {
  // total 200 / pageSize 10 = 20 pages; siblingCount 2 reproduces the exact
  // "1 … 4 5 [6] 7 8 … 20" example this feature was speced against.
  const screen = render(PaginationFixture, {
    props: { total: 200, pageSize: 10, initialPage: 6, siblingCount: 2 },
  })
  const items = Array.from(
    screen.container.querySelectorAll<HTMLElement>(
      '.ui-pagination-page-button, .ui-pagination-ellipsis',
    ),
  ).map((el) => el.textContent?.trim())
  expect(items).toEqual(['1', '…', '4', '5', '6', '7', '8', '…', '20'])
})

test('a small total that fits within the visible slot count renders a plain 1..N range with no ellipsis', async () => {
  const screen = render(PaginationFixture, { props: { total: 30, pageSize: 10 } })
  const items = pageButtons(screen.container).map((el) => el.textContent?.trim())
  expect(items).toEqual(['1', '2', '3'])
  expect(screen.container.querySelector('.ui-pagination-ellipsis')).toBeNull()
})

test('the active page button carries aria-current="page" and no other button does', async () => {
  const screen = render(PaginationFixture, { props: { total: 50, pageSize: 10, initialPage: 2 } })
  const buttons = pageButtons(screen.container)
  const current = buttons.find((b) => b.getAttribute('aria-current') === 'page')
  expect(current?.textContent?.trim()).toBe('2')
  expect(buttons.filter((b) => b.getAttribute('aria-current') === 'page').length).toBe(1)
})

test('changing the page size via the Select resets to page 1 and emits both update events', async () => {
  const screen = render(PaginationFixture, {
    props: { total: 100, pageSize: 10, initialPage: 4, pageSizeOptions: [10, 25, 50] },
  })
  await expect.element(screen.getByTestId('page')).toHaveTextContent('4')

  const trigger = screen.container.querySelector<HTMLElement>('[role="combobox"]')!
  await userEvent.click(trigger)
  await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).not.toBeNull())

  const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
  const option25 = options.find((o) => o.textContent?.trim() === '25')!
  await userEvent.click(option25)

  await expect.element(screen.getByTestId('page-size')).toHaveTextContent('25')
  await expect.element(screen.getByTestId('page')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('page-size-change-count')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('page-change-count')).toHaveTextContent('1')
})

test('nav landmark carries the Pagination aria-label', async () => {
  const screen = render(PaginationFixture, { props: { total: 50, pageSize: 10 } })
  const nav = screen.container.querySelector('nav.ui-pagination')!
  expect(nav.getAttribute('aria-label')).toBe('Pagination')
})
