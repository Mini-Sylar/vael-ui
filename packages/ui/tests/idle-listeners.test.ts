import '../src/style.css'
import { afterEach, expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { Component } from 'vue'
import DialFixture from './fixtures/DialFixture.vue'
import KnobFixture from './fixtures/KnobFixture.vue'
import ResizableFixture from './fixtures/ResizableFixture.vue'
import SliderFixture from './fixtures/SliderFixture.vue'
import SwipeToRevealFixture from './fixtures/SwipeToRevealFixture.vue'
import { trackListeners } from './utils/windowListeners'

// Window listeners exist only for the length of a drag.

const POINTER = ['pointermove', 'pointerup', 'pointercancel']
// The mouse pointer is always active, so setPointerCapture accepts it.
const pointerId = 1
let tracker: ReturnType<typeof trackListeners> | undefined
afterEach(() => tracker?.restore())

interface Case {
  name: string
  fixture: Component
  target: string
  output: string
  // Start and end points of the drag, from the target's rect.
  path: (rect: DOMRect) => [[number, number], [number, number]]
}

const cases: Case[] = [
  {
    name: 'Slider',
    fixture: SliderFixture,
    target: '[data-testid="single"] .ui-slider-track',
    output: 'single-value',
    path: (r) => [
      [r.left + r.width * 0.2, r.top + r.height / 2],
      [r.left + r.width * 0.8, r.top + r.height / 2],
    ],
  },
  {
    name: 'Knob',
    fixture: KnobFixture,
    target: '[data-testid="basic"] .ui-knob-dial',
    output: 'basic-value',
    path: (r) => [
      [r.left + r.width * 0.15, r.top + r.height * 0.85],
      [r.left + r.width * 0.85, r.top + r.height * 0.15],
    ],
  },
  {
    name: 'Dial',
    fixture: DialFixture,
    target: '[data-testid="unbounded"] .ui-dial-dial',
    output: 'unbounded-value',
    path: (r) => [
      [r.left + r.width / 2, r.top + r.height * 0.1],
      [r.left + r.width * 0.9, r.top + r.height / 2],
    ],
  },
  {
    name: 'Resizable',
    fixture: ResizableFixture,
    target: '[data-testid="single"] .ui-resizable-handle',
    output: 'single-size',
    path: (r) => [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + r.width / 2 + 40, r.top + r.height / 2],
    ],
  },
  {
    name: 'SwipeToReveal',
    fixture: SwipeToRevealFixture,
    target: '.ui-swipe-reveal-content',
    output: 'open-state',
    path: (r) => [
      [r.right - 5, r.top + 10],
      [r.right - 120, r.top + 10],
    ],
  },
]

for (const c of cases) {
  test(`${c.name}: idle adds no window pointer listeners; a drag adds them and removes them on release`, async () => {
    tracker = trackListeners()
    const screen = await render(c.fixture)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(tracker.count(...POINTER)).toBe(0)

    const el = screen.container.querySelector<HTMLElement>(c.target)!
    const output = screen.container.querySelector(`[data-testid="${c.output}"]`)!
    const before = output.textContent
    const [[x0, y0], [x1, y1]] = c.path(el.getBoundingClientRect())
    const init = { pointerId, bubbles: true, button: 0 }
    el.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: x0, clientY: y0 }))
    expect(tracker.count(...POINTER)).toBe(3)
    window.dispatchEvent(
      new PointerEvent('pointermove', { ...init, clientX: (x0 + x1) / 2, clientY: (y0 + y1) / 2 }),
    )
    window.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: x1, clientY: y1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: x1, clientY: y1 }))
    expect(tracker.count(...POINTER)).toBe(0)

    await expect.poll(() => output.textContent).not.toBe(before)
  })
}
