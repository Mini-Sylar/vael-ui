import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import DockFixture from './fixtures/DockFixture.vue'
import {
  dockFalloff,
  dockItemOffsets,
  dockItemSize,
  dockItemSizes,
} from '../src/composables/useDock'
import { tooltipTargets } from '../src/directives/vTooltip'

function itemButtons(screen: RenderResult<unknown>): HTMLButtonElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-dock-item'))
}

function scaleOf(el: HTMLElement): number {
  const value = getComputedStyle(el).scale
  return value === 'none' ? 1 : parseFloat(value.split(' ')[0])
}

// ---------------------------------------------------------------------------
// useDock.ts — pure falloff math, driven with known distances rather than
// through a full pointermove DOM simulation (fragile — see resizable.test.ts
// for the same composable-vs-component split convention).
// ---------------------------------------------------------------------------

test('dockFalloff: 1 at zero distance, 0 at (and past) range, ~0.5 at the midpoint', () => {
  expect(dockFalloff(0, 100)).toBe(1)
  expect(dockFalloff(100, 100)).toBe(0)
  expect(dockFalloff(150, 100)).toBe(0) // clamped past range
  expect(dockFalloff(-100, 100)).toBe(0) // symmetric — sign doesn't matter
  expect(dockFalloff(50, 100)).toBeCloseTo(0.5, 5)
})

test('dockFalloff: monotonically decreasing as distance grows from 0 to range', () => {
  const range = 120
  const samples = [0, 20, 40, 60, 80, 100, 120].map((d) => dockFalloff(d, range))
  for (let i = 1; i < samples.length; i++) {
    expect(samples[i]).toBeLessThanOrEqual(samples[i - 1])
  }
})

test('dockItemSize: interpolates between baseSize and maxSize by the falloff factor', () => {
  const options = { baseSize: 40, maxSize: 80, range: 100 }
  expect(dockItemSize(0, options)).toBe(80) // directly under the pointer
  expect(dockItemSize(100, options)).toBe(40) // at the range boundary
  expect(dockItemSize(1000, options)).toBe(40) // far past range, clamped
})

test('dockItemSizes: neighbors respond too, not just the item nearest the pointer', () => {
  const options = { baseSize: 48, maxSize: 76, range: 150 }
  // Five icons 60px apart, pointer sits exactly on the middle one (index 2).
  const centers = [0, 60, 120, 180, 240]
  const sizes = dockItemSizes(120, centers, options)

  expect(sizes[2]).toBe(76) // hovered item hits max
  // Immediate neighbors (60px away) are magnified above resting size...
  expect(sizes[1]).toBeGreaterThan(options.baseSize)
  expect(sizes[3]).toBeGreaterThan(options.baseSize)
  // ...but strictly less than the hovered item's — the falloff itself falls off.
  expect(sizes[1]).toBeLessThan(sizes[2])
  expect(sizes[3]).toBeLessThan(sizes[2])
  // The far edges (120px away, still inside range) are visibly smaller than
  // the immediate neighbors — proving the taper is gradual, not a plateau.
  expect(sizes[0]).toBeGreaterThanOrEqual(options.baseSize)
  expect(sizes[0]).toBeLessThan(sizes[1])
  expect(sizes[4]).toBeLessThan(sizes[3])
  // Symmetric around the hovered center.
  expect(sizes[0]).toBeCloseTo(sizes[4], 5)
  expect(sizes[1]).toBeCloseTo(sizes[3], 5)
})

// Regression coverage for the "items overlay each other when hovering" bug:
// `scale` alone never changes an item's flex slot, so magnified neighbors
// used to visually collide. `dockItemOffsets` computes a virtual re-layout
// with the magnified sizes; these assertions prove that re-layout actually
// eliminates overlap, not just that it returns *some* numbers.
test('dockItemOffsets: virtual re-layout preserves the real gap between every adjacent pair, at any magnification', () => {
  const options = { baseSize: 48, maxSize: 76, range: 150 }
  const centers = [0, 60, 120, 180, 240] // resting centers, 60px apart (48px item + 12px gap)
  const gap = 12
  const sizes = dockItemSizes(120, centers, options) // pointer on the middle item

  const offsets = dockItemOffsets(sizes, centers, gap)
  expect(offsets).toHaveLength(5)

  // The item at the true edge-to-edge gap between i and i+1, after applying
  // both the magnified size AND the computed offset, must equal the real
  // CSS gap — not less (that would mean overlap), and not more (that would
  // mean the fix over-corrected and left a visible hole).
  for (let i = 0; i < sizes.length - 1; i++) {
    const rightEdge = centers[i]! + offsets[i]! + sizes[i]! / 2
    const leftEdge = centers[i + 1]! + offsets[i + 1]! - sizes[i + 1]! / 2
    expect(leftEdge - rightEdge).toBeCloseTo(gap, 5)
  }
})

test('dockItemOffsets: no magnification (all items at baseSize) yields zero offset everywhere', () => {
  const centers = [0, 60, 120, 180]
  const sizes = centers.map(() => 48)
  const offsets = dockItemOffsets(sizes, centers, 12)
  for (const offset of offsets) expect(offset).toBeCloseTo(0, 5)
})

test('dockItemOffsets: symmetric magnification produces symmetric offsets around the hovered item', () => {
  const options = { baseSize: 48, maxSize: 76, range: 150 }
  const centers = [0, 60, 120, 180, 240]
  const sizes = dockItemSizes(120, centers, options)
  const offsets = dockItemOffsets(sizes, centers, 12)
  expect(offsets[2]).toBeCloseTo(0, 5) // the hovered item itself doesn't need to move
  expect(offsets[0]).toBeCloseTo(-offsets[4]!, 5)
  expect(offsets[1]).toBeCloseTo(-offsets[3]!, 5)
  expect(offsets[0]!).toBeLessThan(0) // pushed toward the start
  expect(offsets[4]!).toBeGreaterThan(0) // pushed toward the end
})

// ---------------------------------------------------------------------------
// Dock.vue — rendering, keyboard nav, and selection.
// ---------------------------------------------------------------------------

test('renders every item, including an icon and a badge', async () => {
  const screen = render(DockFixture, {})
  const buttons = itemButtons(screen)
  expect(buttons).toHaveLength(5)
  expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
    'Finder',
    'Mail (3)',
    'Messages',
    'Notes',
    'Trash',
  ])
  await expect
    .element(screen.container.querySelector<HTMLElement>('[data-testid="star-icon"]')!)
    .toBeInTheDocument()
})

// Regression coverage for a real bug: a vertical dock's tooltip used to
// default to the same 'top' side as horizontal, landing directly on top of
// (and visually hiding) whichever item sat immediately above the hovered
// one. Read via the directive's own stored options rather than a full
// pointer-hover + TooltipHost render — direct and immune to the singleton
// TooltipHost being driven by an unrelated hover elsewhere on a real page.
test('tooltip side defaults per orientation: top for horizontal, right for vertical', async () => {
  const horizontal = render(DockFixture, { props: { orientation: 'horizontal' } })
  const horizontalButton = itemButtons(horizontal)[0]!
  expect(tooltipTargets.get(horizontalButton)?.side).toBe('top')

  const vertical = render(DockFixture, { props: { orientation: 'vertical' } })
  const verticalButton = itemButtons(vertical)[0]!
  expect(tooltipTargets.get(verticalButton)?.side).toBe('right')
})

test('tooltipSide prop overrides the orientation-based default', async () => {
  const screen = render(DockFixture, { props: { orientation: 'vertical', tooltipSide: 'left' } })
  const button = itemButtons(screen)[0]!
  expect(tooltipTargets.get(button)?.side).toBe('left')
})

test('exactly one item is tabindex="0" at a time, starting on the first item', async () => {
  const screen = render(DockFixture, {})
  const buttons = itemButtons(screen)
  expect(buttons.map((b) => b.tabIndex)).toEqual([0, -1, -1, -1, -1])
})

test('ArrowRight/ArrowLeft roll the tabindex across items, skipping the disabled one, and wrap', async () => {
  const screen = render(DockFixture, {})
  const buttons = itemButtons(screen)
  buttons[0].focus()

  await userEvent.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(buttons[1])
  expect(buttons.map((b) => b.tabIndex)).toEqual([-1, 0, -1, -1, -1])

  await userEvent.keyboard('{ArrowRight}')
  await userEvent.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(buttons[3]) // index 3 ("Notes") — index 4 ("Trash") is disabled

  // One more ArrowRight wraps past the disabled last item straight back to the first.
  await userEvent.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(buttons[0])

  await userEvent.keyboard('{ArrowLeft}')
  expect(document.activeElement).toBe(buttons[3]) // wraps backward, skipping disabled again
})

test('orientation="vertical" swaps roving navigation to ArrowDown/ArrowUp; ArrowRight is inert', async () => {
  const screen = render(DockFixture, { props: { orientation: 'vertical' } })
  const buttons = itemButtons(screen)
  buttons[0].focus()

  await userEvent.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(buttons[0]) // horizontal key does nothing

  await userEvent.keyboard('{ArrowDown}')
  expect(document.activeElement).toBe(buttons[1])

  await userEvent.keyboard('{ArrowUp}')
  expect(document.activeElement).toBe(buttons[0])
})

test('Home/End jump to the first/last enabled item', async () => {
  const screen = render(DockFixture, {})
  const buttons = itemButtons(screen)
  buttons[1].focus()

  await userEvent.keyboard('{End}')
  expect(document.activeElement).toBe(buttons[3]) // last ENABLED item, not the disabled Trash

  await userEvent.keyboard('{Home}')
  expect(document.activeElement).toBe(buttons[0])
})

test("Enter/Space activates the focused item via the real <button> — fires @select and the item's own onSelect", async () => {
  const screen = render(DockFixture, {})
  const buttons = itemButtons(screen)
  buttons[1].focus() // "Mail" — carries its own onSelect

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('mail')
  await expect.element(screen.getByTestId('select-count')).toHaveTextContent('1')

  await userEvent.keyboard(' ')
  await expect.element(screen.getByTestId('select-count')).toHaveTextContent('2')
})

test('click selection fires @select with the clicked item', async () => {
  const screen = render(DockFixture, {})
  const buttons = itemButtons(screen)

  await userEvent.click(buttons[2]) // "Messages"
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('messages')
})

test('a disabled item is a real disabled <button> — never focusable via Tab order and never fires @select', async () => {
  const screen = render(DockFixture, {})
  const trash = itemButtons(screen)[4]
  expect(trash.disabled).toBe(true)
  expect(trash.tabIndex).toBe(-1)

  trash.click() // native click on a disabled button is a no-op
  await expect.element(screen.getByTestId('select-count')).toHaveTextContent('0')
})

// ---------------------------------------------------------------------------
// Live pointer magnification — a light integration sanity check (>, not an
// exact value) that the wiring between useDock.ts and the rendered DOM
// actually works, on top of the pure-math coverage above.
// ---------------------------------------------------------------------------

test('moving the pointer across the dock magnifies the nearest item more than a distant one', async () => {
  const screen = render(DockFixture, {})
  const buttons = itemButtons(screen)
  const root = screen.container.querySelector<HTMLElement>('.ui-dock')!

  const firstRect = buttons[0].getBoundingClientRect()
  const lastRect = buttons[buttons.length - 1].getBoundingClientRect()

  function moveOverFirst() {
    root.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: firstRect.left + firstRect.width / 2,
        clientY: firstRect.top + firstRect.height / 2,
        bubbles: true,
      }),
    )
    return scaleOf(buttons[0])
  }

  // useDock.ts measures resting positions asynchronously on mount (a
  // ResizeObserver callback, not synchronous with render()) — poll the
  // dispatch itself, not just the assertion, so the test doesn't race that.
  await expect.poll(moveOverFirst).toBeGreaterThan(1)
  // The farthest item stays essentially at rest — the falloff actually falls off.
  expect(scaleOf(buttons[buttons.length - 1])).toBeCloseTo(1, 1)
  expect(scaleOf(buttons[buttons.length - 1])).toBeLessThan(scaleOf(buttons[0]))

  root.dispatchEvent(new PointerEvent('pointerleave', { clientX: lastRect.left, bubbles: true }))
  await expect.poll(() => scaleOf(buttons[0])).toBeCloseTo(1, 1)
})

test('magnify=false disables the size effect entirely, without disabling the dock', async () => {
  const screen = render(DockFixture, { props: { magnify: false } })
  const buttons = itemButtons(screen)
  const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
  const firstRect = buttons[0].getBoundingClientRect()

  root.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: firstRect.left + firstRect.width / 2,
      clientY: firstRect.top + firstRect.height / 2,
      bubbles: true,
    }),
  )
  // Give any (incorrect) async magnification a real chance to land before
  // asserting its absence — a poll that immediately passes proves nothing.
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(scaleOf(buttons[0])).toBeCloseTo(1, 5)

  // Still fully interactive — magnify=false isn't disabled=true.
  await userEvent.click(buttons[1])
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('mail')
})
