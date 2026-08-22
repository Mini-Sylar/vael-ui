import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import SortableFixture from './fixtures/SortableFixture.vue'

function handles(screen: RenderResult<unknown>): HTMLButtonElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-sortable-handle'))
}
function order(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[data-testid="order"]')!.textContent!
}
function liveRegion(screen: RenderResult<unknown>): HTMLElement {
  return screen.container.querySelector<HTMLElement>('[aria-live="assertive"]')!
}

test('renders one row per item, each with a real button handle in the tab order', async () => {
  const screen = render(SortableFixture)
  const grips = handles(screen)
  expect(grips.length).toBe(3)
  // A real <button> is focusable without an explicit tabindex.
  expect(grips[0]!.tagName).toBe('BUTTON')
  expect(grips[0]!.getAttribute('aria-roledescription')).toBe('sortable item')
})

test('the live region and instructions are mounted up front, not created on demand', async () => {
  const screen = render(SortableFixture)
  const live = liveRegion(screen)
  expect(live).not.toBeNull()
  expect(live.textContent).toBe('')
  const describedBy = handles(screen)[0]!.getAttribute('aria-describedby')!
  const instructions = screen.container.querySelector(`#${CSS.escape(describedBy)}`)!
  expect(instructions.textContent).toContain('Space')
})

test('keyboard: Space grabs, ArrowDown moves, Space drops — and the array reorders', async () => {
  const screen = render(SortableFixture)
  expect(order(screen)).toBe('a,b,c')

  handles(screen)[0]!.focus()
  await userEvent.keyboard(' ')
  expect(liveRegion(screen).textContent).toContain('Grabbed Alpha')

  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard(' ')
  expect(order(screen)).toBe('b,a,c')
})

test('keyboard: two ArrowDowns move an item two slots', async () => {
  const screen = render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}{ArrowDown} ')
  expect(order(screen)).toBe('b,c,a')
})

test('keyboard: ArrowUp moves an item toward the top', async () => {
  const screen = render(SortableFixture)
  handles(screen)[2]!.focus()
  await userEvent.keyboard(' {ArrowUp} ')
  expect(order(screen)).toBe('a,c,b')
})

test('keyboard: Escape cancels and leaves the original order untouched', async () => {
  const screen = render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}')
  await userEvent.keyboard('{Escape}')
  expect(order(screen)).toBe('a,b,c')
  expect(liveRegion(screen).textContent).toContain('cancelled')
})

test('keyboard: moving cannot walk past either end of the list', async () => {
  const screen = render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowUp}{ArrowUp}{ArrowUp} ')
  expect(order(screen)).toBe('a,b,c')

  handles(screen)[2]!.focus()
  await userEvent.keyboard(' {ArrowDown}{ArrowDown}{ArrowDown} ')
  expect(order(screen)).toBe('a,b,c')
})

test('the grabbed row is marked for styling, and unmarked once dropped', async () => {
  const screen = render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' ')
  expect(screen.container.querySelector('[data-grabbed]')).not.toBeNull()
  await userEvent.keyboard(' ')
  expect(screen.container.querySelector('[data-grabbed]')).toBeNull()
})

test('announcements report the new position rather than repeating the grab', async () => {
  const screen = render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}')
  const text = liveRegion(screen).textContent!
  expect(text).toContain('Alpha')
  expect(text).toContain('2')
})

test('disabled ignores keyboard grabs entirely', async () => {
  const screen = render(SortableFixture, { props: { disabled: true } })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  expect(order(screen)).toBe('a,b,c')
})

test('keyboard: the grabbed row itself visibly moves, not just the rows around it', async () => {
  // Regression: the engine used to shift only the OTHER rows on a keyboard
  // move, so the item you grabbed was the one thing on screen that never
  // appeared to move — the list read as reshuffling underneath it.
  const screen = render(SortableFixture)
  const rowFor = (value: string) =>
    screen.container.querySelector<HTMLElement>(`[data-sortable-item][data-value="${value}"]`)!

  handles(screen)[0]!.focus()
  await userEvent.keyboard(' ')
  expect(rowFor('a').style.translate).toBe('')

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => {
    // Grabbed row travels down; the row it displaces travels up.
    expect(rowFor('a').style.translate).not.toBe('')
    expect(rowFor('b').style.translate).not.toBe('')
  })
  // `translate` is "<x> <y>" — take the y component, not a digit-strip of
  // the whole string, which silently fuses "0 -40px" into "0-40".
  const yOf = (el: HTMLElement) => Number.parseFloat(el.style.translate.split(' ')[1] ?? '0')
  const grabbed = yOf(rowFor('a'))
  const displaced = yOf(rowFor('b'))
  expect(grabbed).toBeGreaterThan(0)
  expect(displaced).toBeLessThan(0)
})

test('keyboard: dropping clears every inline transform it applied', async () => {
  const screen = render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() => {
    const leftover = Array.from(
      screen.container.querySelectorAll<HTMLElement>('[data-sortable-item]'),
    ).filter((el) => el.style.translate !== '')
    expect(leftover).toHaveLength(0)
  })
})

test('axis="x": ArrowRight/ArrowLeft reorder along the horizontal axis', async () => {
  const screen = render(SortableFixture, { props: { axis: 'x' } })
  expect(order(screen)).toBe('a,b,c')
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight} ')
  expect(order(screen)).toBe('b,a,c')

  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight} ')
  expect(order(screen)).toBe('a,b,c')
})

test('axis="x": the vertical arrows do nothing, so page scroll keys stay free', async () => {
  const screen = render(SortableFixture, { props: { axis: 'x' } })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}{ArrowDown} ')
  expect(order(screen)).toBe('a,b,c')
})

test('axis="x": the grabbed item translates horizontally, not vertically', async () => {
  const screen = render(SortableFixture, { props: { axis: 'x' } })
  const rowFor = (value: string) =>
    screen.container.querySelector<HTMLElement>(`[data-sortable-item][data-value="${value}"]`)!
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight}')
  await vi.waitFor(() => expect(rowFor('a').style.translate).not.toBe(''))
  const [x, y] = rowFor('a').style.translate.split(' ')
  expect(Number.parseFloat(x!)).toBeGreaterThan(0)
  expect(y === undefined || Number.parseFloat(y) === 0).toBe(true)
})
