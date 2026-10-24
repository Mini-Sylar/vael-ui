// Right to left, the arrow keys follow what's on screen: where a component mirrors, ArrowLeft moves
// toward the end of the line. Sliders, stars, submenus and speed dials are drawn to match.
import '../src/style.css'
import { expect, onTestFinished, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { h } from 'vue'
import type { Component } from 'vue'
import CalendarFixture from './fixtures/CalendarFixture.vue'
import DockFixture from './fixtures/DockFixture.vue'
import MenuSubmenuFixture from './fixtures/MenuSubmenuFixture.vue'
import ResizableFixture from './fixtures/ResizableFixture.vue'
import SliderFixture from './fixtures/SliderFixture.vue'
import TabsFixture from './fixtures/TabsFixture.vue'
import ToolbarFixture from './fixtures/ToolbarFixture.vue'
import TourFixture from './fixtures/TourFixture.vue'
import TreeFixture from './fixtures/TreeFixture.vue'
import Rating from '../src/components/Rating/Rating.vue'
import SpeedDial from '../src/components/SpeedDial/SpeedDial.vue'

const rtl = (fixture: Component, props: Record<string, unknown> = {}) =>
  render({ render: () => h('div', { dir: 'rtl' }, [h(fixture as never, props)]) })
const text = (testId: string) => document.querySelector(`[data-testid="${testId}"]`)!.textContent
const focusedLabel = () => document.activeElement?.textContent?.trim()
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(2)

test('Slider: it runs from the right, the keys and the pointer follow', async () => {
  await rtl(SliderFixture)
  const slider = document.querySelector('[data-testid="single"]')!
  const track = slider.querySelector('.ui-slider-track')!.getBoundingClientRect()
  const thumb = slider.querySelector<HTMLElement>('.ui-slider-thumb')!
  // 20 of 100: a fifth in from the right edge, the fill between them.
  near(thumb.getBoundingClientRect().left + thumb.offsetWidth / 2, track.right - track.width * 0.2)
  const fill = slider.querySelector('.ui-slider-fill')!.getBoundingClientRect()
  near(fill.right, track.right)
  near(fill.width, track.width * 0.2)
  thumb.focus()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(text('single-value')).toBe('25'))
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  await vi.waitFor(() => expect(text('single-value')).toBe('15'))
  // A press near the right edge is near the start.
  thumb.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: track.right - 2, pointerId: 1, bubbles: true }),
  )
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: track.right - 2, pointerId: 1 }))
  await vi.waitFor(() => expect(text('single-value')).toBe('0'))
})

test('Tabs: ArrowLeft selects the next tab', async () => {
  await rtl(TabsFixture)
  await page.getByTestId('tab-two').click()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(text('active')).toBe('three'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(text('active')).toBe('two'))
})

test('Toolbar: ArrowLeft moves to the next control', async () => {
  await rtl(ToolbarFixture)
  ;(document.querySelector('[data-testid="bold"]') as HTMLElement).focus()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Italic'))
})

test('Tree: ArrowLeft opens a folder, ArrowRight closes it', async () => {
  await rtl(TreeFixture)
  const row = () =>
    [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')].find((el) =>
      el.textContent?.includes('Fruits'),
    )!
  await vi.waitFor(() => expect(row()).toBeDefined())
  row().focus()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(row().getAttribute('aria-expanded')).toBe('true'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(row().getAttribute('aria-expanded')).toBe('false'))
})

test('Rating: the stars count from the right, by key and by pointer', async () => {
  let value = 2
  await render({
    render: () =>
      h('div', { dir: 'rtl' }, [
        h(Rating as never, {
          max: 5,
          modelValue: value,
          'onUpdate:modelValue': (v: number) => (value = v),
        }),
      ]),
  })
  const root = document.querySelector<HTMLElement>('.ui-rating')!
  ;(root.querySelector<HTMLElement>('[role="slider"], [tabindex="0"]') ?? root).focus()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(value).toBe(3))
  // The first star is the rightmost.
  const stars = [...root.querySelectorAll('.ui-rating-item')].map((el) =>
    el.getBoundingClientRect(),
  )
  expect(stars[0]!.left).toBeGreaterThan(stars[4]!.left)
  // A click on the rightmost star gives one.
  await userEvent.click(root, { position: { x: root.offsetWidth - 4, y: root.offsetHeight / 2 } })
  await vi.waitFor(() => expect(value).toBe(1))
})

test('Dock: ArrowLeft moves to the next item', async () => {
  await rtl(DockFixture)
  ;(document.querySelector('.ui-dock-item') as HTMLElement).focus()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Mail, 3'))
})

test('Calendar: ArrowLeft moves to the next day', async () => {
  await rtl(CalendarFixture, { initialValue: new Date(2024, 5, 15) })
  document.querySelector<HTMLElement>('[data-date="2024-06-15"]')!.focus()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() =>
    expect(document.activeElement?.getAttribute('data-date')).toBe('2024-06-16'),
  )
})

test('Menu: a submenu opens to the left on ArrowLeft and closes on ArrowRight', async () => {
  // Its panels are teleported to the body: the page is right to left, as an app sets it.
  document.documentElement.dir = 'rtl'
  onTestFinished(() => document.documentElement.removeAttribute('dir'))
  await render(MenuSubmenuFixture)
  await page.getByTestId('trigger').click()
  await vi.waitFor(() => expect(focusedLabel()).toBe('Cut'))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Share'))
  const row = document.activeElement!.getBoundingClientRect()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Copy Link'))
  // Beside the row, on its left.
  expect(document.activeElement!.getBoundingClientRect().right).toBeLessThanOrEqual(row.left + 8)
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedLabel()).toBe('Share'))
})

test('SpeedDial: left is left and up is centered, right to left too', async () => {
  for (const direction of ['left', 'up'] as const) {
    const screen = await render(
      {
        render: () =>
          h('div', { dir: 'rtl', style: 'padding: 200px' }, [
            h(SpeedDial as never, {
              items: [{ label: 'Home' }, { label: 'Settings' }],
              direction,
              open: true,
              motion: false,
            }),
          ]),
      },
      { global: { stubs: { 'transition-group': false } } },
    )
    const trigger = screen.container
      .querySelector('.ui-speed-dial-trigger')!
      .getBoundingClientRect()
    const actions = screen.container
      .querySelector('.ui-speed-dial-actions')!
      .getBoundingClientRect()
    if (direction === 'left') expect(actions.right).toBeLessThanOrEqual(trigger.left)
    else near(actions.left + actions.width / 2, trigger.left + trigger.width / 2)
    // Nearest the trigger first.
    const [first, second] = [...screen.container.querySelectorAll('[role="menuitem"]')].map((el) =>
      el.getBoundingClientRect(),
    )
    if (direction === 'left') expect(first!.left).toBeGreaterThan(second!.left)
    screen.unmount()
  }
})

test('Resizable: its trailing edge is on the left; dragging or pressing toward it grows it', async () => {
  await rtl(ResizableFixture)
  const handle = document.querySelector<HTMLElement>('[data-testid="single"] .ui-resizable-handle')!
  handle.focus()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(Number(text('single-size'))).toBeGreaterThan(150))
  const grown = Number(text('single-size'))
  handle.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: 300, pointerId: 1, bubbles: true }),
  )
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: 260, pointerId: 1 }))
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: 260, pointerId: 1 }))
  await vi.waitFor(() => expect(Number(text('single-size'))).toBe(grown + 40))
})

test('Tour: ArrowLeft goes to the next step, right to left', async () => {
  document.documentElement.dir = 'rtl'
  onTestFinished(() => document.documentElement.removeAttribute('dir'))
  await render(TourFixture)
  await page.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(text('step-index')).toBe('1'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(text('step-index')).toBe('0'))
})
