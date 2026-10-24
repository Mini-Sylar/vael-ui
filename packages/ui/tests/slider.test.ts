import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import SliderFixture from './fixtures/SliderFixture.vue'
import Slider from '../src/components/Slider/Slider.vue'
import Field from '../src/components/Field/Field.vue'
import { contrast } from './utils/contrast'

function trackRect(screen: RenderResult<unknown>, testId: string): DOMRect {
  const el = screen.container.querySelector(`[data-testid="${testId}"] .ui-slider-track`)
  if (!el) throw new Error('track not found')
  return el.getBoundingClientRect()
}

function thumbEl(screen: RenderResult<unknown>, testId: string, index = 0): HTMLElement {
  const els = screen.container.querySelectorAll<HTMLElement>(
    `[data-testid="${testId}"] .ui-slider-thumb`,
  )
  const el = els[index]
  if (!el) throw new Error('thumb not found')
  return el
}

const pointerId = 1
function pointerdown(el: Element, clientX: number, clientY = 0) {
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX, clientY, pointerId, bubbles: true }))
}
function pointermove(clientX: number, clientY = 0) {
  window.dispatchEvent(
    new PointerEvent('pointermove', { clientX, clientY, pointerId, bubbles: true }),
  )
}
function pointerup(clientX: number, clientY = 0) {
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientX, clientY, pointerId, bubbles: true }),
  )
}

test('drag on the thumb sets stepped values', async () => {
  const screen = await render(SliderFixture, {})
  const rect = trackRect(screen, 'single')
  const thumb = thumbEl(screen, 'single')

  pointerdown(thumb, rect.left)
  pointermove(rect.left + rect.width)
  pointerup(rect.left + rect.width)

  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('100')
})

test('track click jumps the nearest thumb to the pointer', async () => {
  const screen = await render(SliderFixture, {})
  const rect = trackRect(screen, 'single')
  const track = screen.container.querySelector('[data-testid="single"] .ui-slider-track')!

  pointerdown(track, rect.left + rect.width * 0.5)
  pointerup(rect.left + rect.width * 0.5)

  await vi.waitFor(() => {
    const value = Number(screen.getByTestId('single-value').element().textContent)
    expect(value).toBeGreaterThanOrEqual(45)
    expect(value).toBeLessThanOrEqual(55)
  })
})

test('range thumbs cannot cross — dragging past the other thumb clamps at it', async () => {
  const screen = await render(SliderFixture, {})
  const rect = trackRect(screen, 'range')
  const thumb0 = thumbEl(screen, 'range', 0)

  pointerdown(thumb0, rect.left + rect.width * 0.2)
  pointermove(rect.left + rect.width)
  pointerup(rect.left + rect.width)

  await vi.waitFor(() => {
    const [v0, v1] = JSON.parse(screen.getByTestId('range-value').element().textContent!) as [
      number,
      number,
    ]
    expect(v0).toBeLessThanOrEqual(v1)
    expect(v0).toBe(60)
  })
})

test('keyboard: arrows step, PageUp/Down jump by 10x, Home/End jump to bounds', async () => {
  const screen = await render(SliderFixture, {})
  const thumb = thumbEl(screen, 'single')
  thumb.focus()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('25')

  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('20')

  await userEvent.keyboard('{PageUp}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('70')

  await userEvent.keyboard('{Home}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('0')

  await userEvent.keyboard('{End}')
  await expect.element(screen.getByTestId('single-value')).toHaveTextContent('100')
})

test('vertical orientation maps the block axis — top of the track is max', async () => {
  const screen = await render(SliderFixture, {})
  const rect = trackRect(screen, 'vertical')
  const thumb = thumbEl(screen, 'vertical')

  pointerdown(thumb, rect.left + rect.width / 2, rect.top)
  pointerup(rect.left + rect.width / 2, rect.top)

  await vi.waitFor(() => expect(thumb.getAttribute('aria-valuenow')).toBe('100'))
})

test('data-dragging is set for the duration of a drag and cleared on release', async () => {
  const screen = await render(SliderFixture, {})
  const rect = trackRect(screen, 'single')
  const thumb = thumbEl(screen, 'single')
  const root = screen.container.querySelector('[data-testid="single"]')!

  pointerdown(thumb, rect.left)
  await vi.waitFor(() => expect(root.hasAttribute('data-dragging')).toBe(true))

  pointermove(rect.left + 10)
  pointerup(rect.left + 10)
  await vi.waitFor(() => expect(root.hasAttribute('data-dragging')).toBe(false))
})

test('disabled slider ignores pointer and keyboard interaction', async () => {
  const screen = await render(SliderFixture, {})
  const rect = trackRect(screen, 'disabled')
  const thumb = thumbEl(screen, 'disabled')
  expect(thumb.getAttribute('tabindex')).toBe('-1')

  pointerdown(thumb, rect.left + rect.width)
  pointerup(rect.left + rect.width)

  expect(thumb.getAttribute('aria-valuenow')).toBe('10')
})

test('form participation: hidden input carries the value under name', async () => {
  const screen = await render(SliderFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('amount')).toBe('50')
})

test('valueText renders as aria-valuetext', async () => {
  const screen = await render(SliderFixture, {})
  const thumb = thumbEl(screen, 'valuetext')
  expect(thumb.getAttribute('aria-valuetext')).toBe('$40')
})

test('the unfilled track stays visible against the surface in both themes', async () => {
  const screen = await render(SliderFixture)
  const track = screen.container.querySelector<HTMLElement>(
    '[data-testid="single"] .ui-slider-track',
  )!
  try {
    for (const theme of ['light', 'dark']) {
      document.documentElement.dataset.theme = theme
      const surface = getComputedStyle(document.documentElement).getPropertyValue('--ui-surface')
      // Pre-fix, the dark track (--ui-muted) sat at ~1.1:1 on the surface.
      expect(contrast(getComputedStyle(track).backgroundColor, surface)).toBeGreaterThan(1.4)
    }
    expect(contrast(getComputedStyle(track).backgroundColor, '#1f1f23')).toBeGreaterThan(2)
  } finally {
    delete document.documentElement.dataset.theme
  }
})

test('#thumb and #track slots receive the value and its percent', async () => {
  const screen = await render(SliderFixture, {})

  await expect.element(screen.getByTestId('thumb-content-0')).toHaveTextContent('50|25')
  await expect.element(screen.getByTestId('track-content')).toHaveTextContent('25')
  const thumb = thumbEl(screen, 'slots')
  expect(thumb.getAttribute('role')).toBe('slider')
  expect(thumb.contains(screen.getByTestId('thumb-content-0').element())).toBe(true)
})

test('aria-label, aria-labelledby and aria-describedby name the thumb, not the wrapper', async () => {
  const screen = await render({
    components: { Slider, Field },
    template: `<div>
      <span id="vol-label">Volume</span><span id="vol-hint">Max 11</span>
      <Slider data-testid="labelled" aria-label="Brightness" aria-describedby="vol-hint" />
      <Slider aria-labelledby="vol-label" />
      <Field label="Balance"><Slider /></Field>
    </div>`,
  })
  const thumb = screen.getByRole('slider', { name: 'Brightness' })
  await expect.element(thumb).toBeInTheDocument()
  expect(thumb.element().getAttribute('aria-describedby')).toBe('vol-hint')
  const root = screen.container.querySelector('[data-testid="labelled"]')!
  expect(root.hasAttribute('aria-label')).toBe(false)
  expect(root.hasAttribute('aria-describedby')).toBe(false)
  await expect.element(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument()
  await expect.element(screen.getByRole('slider', { name: 'Balance' })).toBeInTheDocument()
})

test('each range thumb gets its own name from the slider label', async () => {
  const screen = await render({
    components: { Slider, Field },
    data: () => ({ a: [10, 20], b: [10, 20], c: [10, 20] }),
    template: `<div>
      <Slider v-model="a" aria-label="Price" />
      <Field label="Year"><Slider v-model="b" /></Field>
      <Slider v-model="c" />
    </div>`,
  })
  for (const name of ['Price Minimum', 'Price Maximum', 'Year Minimum', 'Year Maximum']) {
    await expect.element(screen.getByRole('slider', { name, exact: true })).toBeInTheDocument()
  }
  await expect
    .element(screen.getByRole('slider', { name: 'Minimum', exact: true }))
    .toBeInTheDocument()
  await expect
    .element(screen.getByRole('slider', { name: 'Maximum', exact: true }))
    .toBeInTheDocument()
})

test('fits its container on a page with no box-sizing reset', async () => {
  const { h } = await import('vue')
  const screen = await render(() =>
    h('div', { style: 'width: 240px', 'data-testid': 'box' }, [
      h(Slider as never, { modelValue: 50 }),
    ]),
  )
  const box = screen.getByTestId('box').element().getBoundingClientRect()
  const slider = screen.container.querySelector('.ui-slider')!.getBoundingClientRect()
  expect(slider.right).toBeLessThanOrEqual(box.right + 0.5)
})

test('a jump glides: a value from outside, a key, a press on the track; a drag follows at once', async () => {
  const { ref, nextTick } = await import('vue')
  const value = ref(0)
  const screen = await render({
    components: { Slider },
    setup: () => ({ value }),
    template: `<Slider v-model="value" aria-label="Volume" style="inline-size: 200px" />`,
  })
  const root = screen.container.querySelector<HTMLElement>('.ui-slider')!
  const shown = () => Number(getComputedStyle(root).getPropertyValue('--ui-slider-p0'))
  const partway = async () => {
    await nextTick()
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    const now = shown()
    return now > 0.02 && now < 0.98
  }
  // Styled once at its first value, as on any page, so there's somewhere to glide from.
  expect(shown()).toBe(0)
  value.value = 100
  expect(await partway()).toBe(true)
  await vi.waitFor(() => expect(shown()).toBe(1))
  root.querySelector<HTMLElement>('.ui-slider-thumb')!.focus()
  await userEvent.keyboard('{Home}')
  expect(await partway()).toBe(true)
  await vi.waitFor(() => expect(shown()).toBe(0))
  const track = root.querySelector<HTMLElement>('.ui-slider-track')!
  const rect = track.getBoundingClientRect()
  pointerdown(track, rect.left + rect.width * 0.9)
  expect(await partway()).toBe(true)
  // Then dragged: with the pointer, at once.
  pointermove(rect.left + rect.width * 0.3)
  await nextTick()
  await new Promise(requestAnimationFrame)
  expect(shown()).toBeCloseTo(0.3, 1)
  pointerup(rect.left + rect.width * 0.3)
})
