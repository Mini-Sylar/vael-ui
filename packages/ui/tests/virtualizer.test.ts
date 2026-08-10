import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import VirtualizerFixture from './fixtures/VirtualizerFixture.vue'

function fireScroll(container: HTMLElement, top: number) {
  container.scrollTop = top
  container.dispatchEvent(new Event('scroll'))
}

test('renders only the visible window + overscan for a 10k count, not every row', async () => {
  const screen = render(VirtualizerFixture, { props: { count: 10000 } })
  await expect.element(screen.getByTestId('rendered-count')).toBeInTheDocument()

  const rendered = Number(screen.getByTestId('rendered-count').element().textContent)
  // container is 200px tall / 40px rows = 5 visible + 8 overscan each side ≈ 21
  expect(rendered).toBeGreaterThan(0)
  expect(rendered).toBeLessThan(40)
})

test('scrolling updates the rendered window to the new position', async () => {
  const screen = render(VirtualizerFixture, { props: { count: 10000 } })
  await expect.element(screen.getByTestId('rendered-indices')).toBeInTheDocument()

  const before = screen.getByTestId('rendered-indices').element().textContent
  const container = screen.getByTestId('container').element() as HTMLElement
  fireScroll(container, 4000)

  await vi.waitFor(() => {
    const after = screen.getByTestId('rendered-indices').element().textContent
    expect(after).not.toBe(before)
  })
  const indices = screen
    .getByTestId('rendered-indices')
    .element()
    .textContent!.split(',')
    .map(Number)
  // Scrolled to 4000px / 40px-per-row = row 100 should now be in the window.
  expect(indices).toContain(100)
})

test('reach-end fires once near the bottom, then re-arms only once count grows', async () => {
  // An 8-row list at 40px/row = 320px total: the 200px viewport's visible
  // rows (5) + 2 overscan already cover every row up to the last index, so
  // reach-end should fire immediately on mount without any scrolling.
  const screen = render(VirtualizerFixture, { props: { count: 8, rowHeight: 40, overscan: 2 } })
  const container = screen.getByTestId('container').element() as HTMLElement

  await vi.waitFor(() => {
    expect(screen.getByTestId('reach-end-count').element().textContent).toBe('1')
  })

  // Scrolling further while count is unchanged must not refire it.
  fireScroll(container, 100)
  fireScroll(container, 0)
  fireScroll(container, 100)
  expect(screen.getByTestId('reach-end-count').element().textContent).toBe('1')

  // Growing the count re-arms it exactly once.
  await screen.rerender({ count: 10, rowHeight: 40, overscan: 2 })
  await vi.waitFor(() => {
    expect(screen.getByTestId('reach-end-count').element().textContent).toBe('2')
  })
})

test('omitting itemSize estimates 36px then corrects to the measured first row size', async () => {
  const screen = render(VirtualizerFixture, { props: { count: 100, rowHeight: 40 } })
  await vi.waitFor(() => {
    expect(screen.getByTestId('measured-size').element().textContent).toBe('40')
  })
})

test('dynamic mode: row offsets accumulate real per-row heights, not a uniform assumption', async () => {
  // variableHeight(i) = 40 + (i % 3) * 20 -> 40, 60, 80, 40, 60, 80, ...
  const screen = render(VirtualizerFixture, { props: { count: 10, dynamic: true } })
  await expect.element(screen.getByTestId('row-4')).toBeInTheDocument()

  function translateY(testId: string): number {
    const style = screen.getByTestId(testId).element().getAttribute('style') ?? ''
    // A zero Y offset serializes as a single value ("translate: 0px") — the
    // browser drops the redundant second value rather than printing "0px 0px".
    const match = /translate:\s*-?\d+(?:\.\d+)?px(?:\s+(-?\d+(?:\.\d+)?)px)?/.exec(style)
    if (!match) return Number.NaN
    return match[1] !== undefined ? Number(match[1]) : 0
  }

  // Each row's own :ref measurement lands over a few render passes — wait
  // for every row to settle at its real cumulative offset, not just mount.
  await vi.waitFor(() => {
    expect(translateY('row-4')).toBe(220)
  })
  expect(translateY('row-0')).toBe(0)
  expect(translateY('row-1')).toBe(40) // after row 0 (40px)
  expect(translateY('row-2')).toBe(100) // after rows 0+1 (40+60)
  expect(translateY('row-3')).toBe(180) // after rows 0+1+2 (40+60+80)
})

test('dynamic mode still windows a large count instead of rendering every row', async () => {
  const screen = render(VirtualizerFixture, { props: { count: 10000, dynamic: true } })
  await expect.element(screen.getByTestId('rendered-count')).toBeInTheDocument()
  const rendered = Number(screen.getByTestId('rendered-count').element().textContent)
  expect(rendered).toBeGreaterThan(0)
  expect(rendered).toBeLessThan(40)
})

test('dynamic mode: reach-start fires once near the top, re-arms only once count grows', async () => {
  const screen = render(VirtualizerFixture, {
    props: { count: 8, dynamic: true, overscan: 2 },
  })
  const container = screen.getByTestId('container').element() as HTMLElement

  // Mounts scrolled to the top by default, so reach-start fires immediately —
  // same "fires whenever the condition already holds" contract as reach-end.
  await vi.waitFor(() => {
    expect(screen.getByTestId('reach-start-count').element().textContent).toBe('1')
  })

  fireScroll(container, 50)
  fireScroll(container, 0)
  expect(screen.getByTestId('reach-start-count').element().textContent).toBe('1')

  await screen.rerender({ count: 10, dynamic: true, overscan: 2 })
  await vi.waitFor(() => {
    expect(screen.getByTestId('reach-start-count').element().textContent).toBe('2')
  })
})

test('scrollToIndex minimally scrolls a nearest-aligned row into view', async () => {
  const screen = render(VirtualizerFixture, { props: { count: 10000 } })
  await expect.element(screen.getByTestId('container')).toBeInTheDocument()
  const container = screen.getByTestId('container').element() as HTMLElement
  expect(container.scrollTop).toBe(0)

  // Row 2 is already visible in a 200px/40px viewport — 'nearest' must not move it.
  await screen.getByTestId('scroll-to-2').click()
  expect(container.scrollTop).toBe(0)

  // Row 50 is far below the fold — 'nearest' scrolls just enough to reveal it.
  await screen.getByTestId('scroll-to-50').click()
  await vi.waitFor(() => expect(container.scrollTop).toBeGreaterThan(0))
  const rowEnd = 51 * 40
  expect(container.scrollTop).toBe(rowEnd - 200)
})
