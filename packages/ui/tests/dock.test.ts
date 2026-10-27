import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import type { RenderResult } from 'vitest-browser-vue'
import DockFixture from './fixtures/DockFixture.vue'
import Dock from '../src/components/Dock/Dock.vue'
import TooltipHost from '../src/components/TooltipHost/TooltipHost.vue'
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
  const transform = getComputedStyle(el).transform
  if (transform === 'none') return 1
  // Extract scale from "translateX(...) scale(...)" format
  const match = transform.match(/scale\(([\d.]+)(?:\s|,|$)/)
  if (match) return parseFloat(match[1])
  // Fallback: try to parse from matrix transform
  const matrixMatch = transform.match(
    /matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/,
  )
  if (matrixMatch) {
    // scale is sqrt(a² + b²) for matrix(a, b, c, d, e, f)
    const a = parseFloat(matrixMatch[1])
    const b = parseFloat(matrixMatch[2])
    return Math.sqrt(a * a + b * b)
  }
  return 1
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

// Right to left, item 0 sits at the far end: spread in screen order, never index order.
test('dockItemOffsets: right to left, the re-layout keeps the real gap in screen order', () => {
  const options = { baseSize: 48, maxSize: 76, range: 150 }
  const centers = [240, 180, 120, 60, 0]
  const gap = 12
  const sizes = dockItemSizes(120, centers, options)
  const offsets = dockItemOffsets(sizes, centers, gap)
  // Item i+1 is to the left of item i on screen.
  for (let i = 0; i < sizes.length - 1; i++) {
    const leftEdgeOfI = centers[i]! + offsets[i]! - sizes[i]! / 2
    const rightEdgeOfNext = centers[i + 1]! + offsets[i + 1]! + sizes[i + 1]! / 2
    expect(leftEdgeOfI - rightEdgeOfNext).toBeCloseTo(gap, 5)
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
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)
  expect(buttons).toHaveLength(5)
  // The badge joins the name as a plain word, not a parenthetical, so text-to-name checks match.
  expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
    'Finder',
    'Mail, 3',
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
  const horizontal = await render(DockFixture, { props: { orientation: 'horizontal' } })
  const horizontalButton = itemButtons(horizontal)[0]!
  expect(tooltipTargets.get(horizontalButton)?.side).toBe('top')

  const vertical = await render(DockFixture, { props: { orientation: 'vertical' } })
  const verticalButton = itemButtons(vertical)[0]!
  expect(tooltipTargets.get(verticalButton)?.side).toBe('right')
})

test('tooltipSide prop overrides the orientation-based default', async () => {
  const screen = await render(DockFixture, {
    props: { orientation: 'vertical', tooltipSide: 'left' },
  })
  const button = itemButtons(screen)[0]!
  expect(tooltipTargets.get(button)?.side).toBe('left')
})

test('exactly one item is tabindex="0" at a time, starting on the first item', async () => {
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)
  expect(buttons.map((b) => b.tabIndex)).toEqual([0, -1, -1, -1, -1])
})

test('ArrowRight/ArrowLeft roll the tabindex across items, skipping the disabled one, and wrap', async () => {
  const screen = await render(DockFixture, {})
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
  const screen = await render(DockFixture, { props: { orientation: 'vertical' } })
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
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)
  buttons[1].focus()

  await userEvent.keyboard('{End}')
  expect(document.activeElement).toBe(buttons[3]) // last ENABLED item, not the disabled Trash

  await userEvent.keyboard('{Home}')
  expect(document.activeElement).toBe(buttons[0])
})

test("Enter/Space activates the focused item via the real <button> — fires @select and the item's own onSelect", async () => {
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)
  buttons[1].focus() // "Mail" — carries its own onSelect

  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('mail')
  await expect.element(screen.getByTestId('select-count')).toHaveTextContent('1')

  await userEvent.keyboard(' ')
  await expect.element(screen.getByTestId('select-count')).toHaveTextContent('2')
})

test('click selection fires @select with the clicked item', async () => {
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)

  await userEvent.click(buttons[2]) // "Messages"
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('messages')
})

test('a disabled item is a real disabled <button> — never focusable via Tab order and never fires @select', async () => {
  const screen = await render(DockFixture, {})
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
  const screen = await render(DockFixture, {})
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
  const screen = await render(DockFixture, { props: { magnify: false } })
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
  for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame)
  expect(scaleOf(buttons[0])).toBeCloseTo(1, 5)

  // Still fully interactive — magnify=false isn't disabled=true.
  await userEvent.click(buttons[1])
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('mail')
})

test("magnify=false leaves the items' styles to you: moving and leaving never clear your transform", async () => {
  const screen = await render(DockFixture, { props: { magnify: false } })
  const buttons = itemButtons(screen)
  const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
  // Your own animation, as with itemEls().
  for (const button of buttons) button.style.transform = 'translateX(4px) scale(1.5)'
  const rect = buttons[2].getBoundingClientRect()
  for (const type of ['pointermove', 'pointermove', 'pointerleave']) {
    root.dispatchEvent(
      new PointerEvent(type, {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        pointerType: 'mouse',
        bubbles: true,
      }),
    )
    for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame)
    for (const button of buttons) expect(button.style.transform).toBe('translateX(4px) scale(1.5)')
  }
})

function contains(outer: DOMRect, inner: DOMRect) {
  return (
    inner.left >= outer.left - 0.5 &&
    inner.right <= outer.right + 0.5 &&
    inner.top >= outer.top - 0.5 &&
    inner.bottom <= outer.bottom + 0.5
  )
}

function hoverItem(root: HTMLElement, item: HTMLElement) {
  const rect = item.getBoundingClientRect()
  root.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
    }),
  )
}

test('grow: items change real size and the dock grows to hold them', async () => {
  const screen = await render(DockFixture, { props: { grow: true } })
  const buttons = itemButtons(screen)
  const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
  const rest = buttons[0].offsetWidth
  const restRoot = root.getBoundingClientRect()
  await expect
    .poll(() => {
      hoverItem(root, buttons[0])
      return buttons[0].offsetWidth
    })
    .toBeGreaterThan(rest + 20)
  expect(buttons[0].style.transform).toBe('')
  expect(buttons[0].offsetHeight).toBe(buttons[0].offsetWidth)
  const grown = root.getBoundingClientRect()
  expect(grown.height).toBeGreaterThan(restRoot.height + 20)
  for (const button of buttons) expect(contains(grown, button.getBoundingClientRect())).toBe(true)

  // A resting pointer converges instead of feeding back into the layout it grew.
  const samples: number[] = []
  for (let i = 0; i < 20; i++) {
    hoverItem(root, buttons[0])
    await new Promise((resolve) => requestAnimationFrame(resolve))
    samples.push(buttons[0].offsetWidth)
  }
  expect(Math.abs(samples.at(-1)! - samples.at(-2)!)).toBeLessThanOrEqual(1)

  root.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
  await expect.poll(() => buttons[0].style.inlineSize).toBe('')
  expect(root.getBoundingClientRect().height).toBeCloseTo(restRoot.height, 0)
})

test('without grow, items scale with transforms and the bar widens around where it rests', async () => {
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)
  const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
  const rest = buttons[0].offsetWidth
  const restRoot = root.getBoundingClientRect()
  const last = buttons[buttons.length - 1]
  const lastRest = last.getBoundingClientRect()
  const overLast = () =>
    root.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: lastRest.left + lastRest.width / 2,
        clientY: lastRest.top + lastRest.height / 2,
        bubbles: true,
      }),
    )
  await expect.poll(() => (overLast(), scaleOf(last))).toBeGreaterThan(1.3)
  // Settled: the end item stays on the bar instead of hanging off its end.
  await expect
    .poll(
      () => (overLast(), root.getBoundingClientRect().right - last.getBoundingClientRect().right),
    )
    .toBeGreaterThan(0)
  expect(last.offsetWidth).toBe(rest)
  const widened = root.getBoundingClientRect()
  expect(widened.width).toBeGreaterThan(restRoot.width + 10)
  // Around its resting center, so nothing beside it moves.
  expect((widened.left + widened.right) / 2).toBeCloseTo((restRoot.left + restRoot.right) / 2, 0)
  root.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
  await expect.poll(() => root.getBoundingClientRect().width).toBeCloseTo(restRoot.width, 0)
  expect(root.style.getPropertyValue('--ui-dock-spread')).toBe('')
})

test('a narrow container shrinks the items instead of letting the dock overflow', async () => {
  const items = Array.from({ length: 9 }, (_, i) => ({ label: `App ${i}` }))
  const screen = await render({
    render: () =>
      h('div', { style: 'inline-size: 300px' }, [h(Dock, { items, 'aria-label': 'Apps' })]),
  })
  const wrapper = screen.container.firstElementChild as HTMLElement
  const bounds = wrapper.getBoundingClientRect()
  const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
  expect(root.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right + 0.5)
  for (const button of itemButtons(screen)) {
    const rect = button.getBoundingClientRect()
    expect(rect.width).toBeLessThan(48)
    expect(rect.height).toBeCloseTo(rect.width, 0)
  }
})

test('the tooltip opens past the room an item can magnify into, and stays put while it grows', async () => {
  const screen = await render({
    components: { Dock, TooltipHost },
    setup: () => ({ items: [{ label: 'Finder' }, { label: 'Mail' }, { label: 'Notes' }] }),
    template: `<div style="padding: 140px 80px"><TooltipHost :open-delay="0" /><Dock :items="items" :base-size="48" :max-size="76" /></div>`,
  })
  const item = screen.container.querySelectorAll<HTMLElement>('.ui-dock-item')[1]!
  const rest = item.getBoundingClientRect()
  await userEvent.hover(item)
  await vi.waitFor(() => expect(item.getBoundingClientRect().height).toBeGreaterThan(74))
  const clearOfMagnified = rest.top - (76 - 48) - 8
  await vi.waitFor(() => {
    const panel = document.querySelector<HTMLElement>('.ui-tooltip-panel')!
    expect(panel).not.toBeNull()
    expect(Math.abs(panel.getBoundingClientRect().bottom - clearOfMagnified)).toBeLessThan(1.5)
  })
  const magnified = item.getBoundingClientRect()
  const panel = document.querySelector<HTMLElement>('.ui-tooltip-panel')!.getBoundingClientRect()
  expect(panel.bottom).toBeLessThanOrEqual(magnified.top - 7)
})

test('the tooltip travelling to the next item follows it as the magnification spreads, with no late jump', async () => {
  const screen = await render({
    components: { Dock, TooltipHost },
    setup: () => ({
      items: [{ label: 'Finder' }, { label: 'Mail' }, { label: 'Notes' }, { label: 'Music' }],
    }),
    template: `<div style="padding: 160px 80px"><TooltipHost :open-delay="0" /><Dock :items="items" /></div>`,
  })
  const items = screen.container.querySelectorAll<HTMLElement>('.ui-dock-item')
  await userEvent.hover(items[1]!)
  await vi.waitFor(() => expect(document.querySelector('.ui-tooltip-panel')).not.toBeNull())
  for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r))
  const panel = document.querySelector<HTMLElement>('.ui-tooltip-panel')!
  await userEvent.hover(items[2]!)
  let last = panel.getBoundingClientRect().left
  let biggestBackStep = 0
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => requestAnimationFrame(r))
    const left = panel.getBoundingClientRect().left
    // Heading right toward the new item; any step back left is the correction, and it must glide.
    if (left < last) biggestBackStep = Math.max(biggestBackStep, last - left)
    last = left
  }
  expect(biggestBackStep).toBeLessThan(4)
  const item = items[2]!.getBoundingClientRect()
  const rect = panel.getBoundingClientRect()
  expect(Math.abs(rect.left + rect.width / 2 - (item.left + item.width / 2))).toBeLessThan(1.5)
})

test('a finger sliding along the dock magnifies while it is down and settles when it lifts', async () => {
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)
  const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
  const firstRect = buttons[0].getBoundingClientRect()
  const secondRect = buttons[1].getBoundingClientRect()
  const touch = (type: string, rect: DOMRect, buttons: number, dx = 0) =>
    root.dispatchEvent(
      new PointerEvent(type, {
        clientX: rect.left + rect.width / 2 + dx,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
        pointerType: 'touch',
        buttons,
      }),
    )
  // A tap: down and a move within the slide threshold does not magnify.
  touch('pointerdown', firstRect, 1)
  touch('pointermove', firstRect, 1, 3)
  await new Promise((r) => requestAnimationFrame(r))
  expect(scaleOf(buttons[0])).toBe(1)
  touch('pointerup', firstRect, 0)
  // A slide: down on the first item, moving past the threshold onto the second, magnifies it.
  touch('pointerdown', firstRect, 1)
  await expect
    .poll(() => {
      touch('pointermove', secondRect, 1)
      return scaleOf(buttons[1])
    })
    .toBeGreaterThan(1)
  // Lifted: settles back to rest.
  touch('pointerup', secondRect, 0)
  await expect.poll(() => scaleOf(buttons[1]), { timeout: 2000 }).toBe(1)
})

test('a tap on an item bounces it instead of magnifying, and the bounce clears when it ends', async () => {
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)
  const rect = buttons[1].getBoundingClientRect()
  const touch = (type: string, buttons_: number) =>
    buttons[1].dispatchEvent(
      new PointerEvent(type, {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
        pointerType: 'touch',
        buttons: buttons_,
      }),
    )
  touch('pointerdown', 1)
  touch('pointerup', 0)
  await vi.waitFor(() => expect(buttons[1].hasAttribute('data-bounce')).toBe(true))
  // The bounce is the CSS animation; no magnification was written to the item.
  expect(buttons[1].style.transform).toBe('')
  await vi.waitFor(() => expect(buttons[1].hasAttribute('data-bounce')).toBe(false), {
    timeout: 2000,
  })
})

// Mirrored, the magnified items must still spread apart, not pile onto each other.
for (const grow of [false, true])
  test(`right to left${grow ? ', growing' : ''}: hovering spreads the items without any overlapping`, async () => {
    document.documentElement.dir = 'rtl'
    try {
      const screen = await render(DockFixture, { props: { grow } })
      const buttons = itemButtons(screen)
      const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
      // Off the middle: hovering the exact middle is symmetric, so a reversed spread looks right.
      const middle = buttons[1]!
      const rest = middle.offsetWidth
      await expect
        .poll(() => {
          hoverItem(root, middle)
          return middle.getBoundingClientRect().width
        })
        .toBeGreaterThan(rest + 10)
      // A resting pointer converges instead of feeding back into the layout it grew.
      const widths: number[] = []
      for (let i = 0; i < 30; i++) {
        hoverItem(root, middle)
        await new Promise((resolve) => requestAnimationFrame(resolve))
        widths.push(middle.getBoundingClientRect().width)
      }
      expect(Math.abs(widths.at(-1)! - widths.at(-2)!)).toBeLessThanOrEqual(1)
      // The hovered item is the biggest, and on screen no item reaches into the next one.
      const boxes = buttons.map((b) => b.getBoundingClientRect()).sort((a, b) => a.left - b.left)
      for (let i = 0; i < boxes.length - 1; i++)
        expect(boxes[i + 1]!.left - boxes[i]!.right).toBeGreaterThan(-0.5)
      const widest = Math.max(...buttons.map((b) => b.getBoundingClientRect().width))
      expect(middle.getBoundingClientRect().width).toBeCloseTo(widest, 0)
    } finally {
      document.documentElement.dir = ''
    }
  })

test('magnification chases the pointer on motion.spring, overshoot included; without one it never overshoots', async () => {
  const items = [1, 2, 3, 4, 5].map((n) => ({ label: `App ${n}`, value: `${n}` }))
  const peakOf = async (motion?: object) => {
    const screen = await render(() => h(Dock as never, { items, motion }))
    await expect.poll(() => screen.container.querySelectorAll('.ui-dock-item').length).toBe(5)
    const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
    const first = itemButtons(screen)[0]!
    const box = first.getBoundingClientRect()
    const move = () =>
      root.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: box.left + box.width / 2,
          clientY: box.top + box.height / 2,
          pointerType: 'mouse',
          bubbles: true,
        }),
      )
    await expect.poll(() => (move(), first.style.transform)).not.toBe('')
    expect(getComputedStyle(first).transitionDuration).toBe('0s')
    let peak = 1
    for (let i = 0; i < 60; i++) {
      peak = Math.max(
        peak,
        parseFloat(first.style.transform.match(/scale\(([\d.]+)\)/)?.[1] ?? '1'),
      )
      await new Promise(requestAnimationFrame)
    }
    const settled = parseFloat(first.style.transform.match(/scale\(([\d.]+)\)/)?.[1] ?? '1')
    screen.unmount()
    return { peak, settled }
  }
  const eased = await peakOf()
  expect(eased.peak).toBeLessThanOrEqual(eased.settled + 1e-3)
  const sprung = await peakOf({ spring: { damping: 0.4, response: 0.3 } })
  expect(sprung.settled).toBeCloseTo(eased.settled, 2)
  expect(sprung.peak).toBeGreaterThan(sprung.settled + 0.05)
})

test('a mouse click keeps the magnification; a finger lifting settles it', async () => {
  const screen = await render(DockFixture, {})
  const buttons = itemButtons(screen)
  const root = screen.container.querySelector<HTMLElement>('.ui-dock')!
  await expect.poll(() => (hoverItem(root, buttons[0]), scaleOf(buttons[0]))).toBeGreaterThan(1.3)
  root.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true }))
  for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame)
  expect(scaleOf(buttons[0])).toBeGreaterThan(1.3)
  root.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }))
  await expect.poll(() => scaleOf(buttons[0])).toBeCloseTo(1, 1)
})
