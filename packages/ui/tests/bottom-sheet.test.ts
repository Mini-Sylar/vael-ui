import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import BottomSheetFixture from './fixtures/BottomSheetFixture.vue'

function panel(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.ui-bottom-sheet-panel')
  if (!el) throw new Error('panel not in DOM')
  return el
}

function handle(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.ui-bottom-sheet-handle-zone')
  if (!el) throw new Error('handle not in DOM')
  return el
}

function content(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.ui-bottom-sheet-content')
  if (!el) throw new Error('content not in DOM')
  return el
}

// The panel's own block-size is now fixed at one viewport tall (Vaul's
// technique — see useSheetDrag.ts) and repositioned via translateY, so
// .getBoundingClientRect().height never changes between snap states. The
// signal is how much of it sits above the viewport's bottom edge.
function visibleHeight(): number {
  return window.innerHeight - panel().getBoundingClientRect().top
}

/** Realistic timing, matching toaster.test.ts's own drag() helper — a
 *  synchronous down/move/up burst distorts anything reading elapsed time,
 *  and here it also decides which velocity tier useSheetDrag.ts's release
 *  logic lands in (fast flick vs. deliberate settle-to-nearest). */
async function drag(el: Element, startY: number, endY: number, ms: number) {
  const pointerId = 1
  el.dispatchEvent(new PointerEvent('pointerdown', { clientY: startY, pointerId, bubbles: true }))
  await new Promise((r) => setTimeout(r, ms))
  el.dispatchEvent(new PointerEvent('pointermove', { clientY: endY, pointerId, bubbles: true }))
  el.dispatchEvent(new PointerEvent('pointerup', { clientY: endY, pointerId, bubbles: true }))
}

test('opens at the initial (smallest) snap point; Escape runs the built-in exit to closed', async () => {
  const screen = await render(BottomSheetFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-bottom-sheet-panel')).not.toBeNull())
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1), {
    timeout: 1000,
  })
  // Fixed at one full viewport, not the tallest snap fraction — the bug
  // this test would have caught: capping block-size at the tallest snap's
  // own px value makes every offsetFor() land short (see useSheetDrag.ts).
  expect(panel().getBoundingClientRect().height).toBeCloseTo(window.innerHeight, -1)

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(
    () => expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed'),
    { timeout: 1200 },
  )
})

test('a fast upward flick jumps straight to the largest snap point', async () => {
  const screen = await render(BottomSheetFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  const startY = window.innerHeight - 40
  // ~360px in 60ms: ~6px/ms, well past FAST_VELOCITY (2px/ms).
  await drag(handle(), startY, startY - window.innerHeight * 0.4, 60)

  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.92, -1), {
    timeout: 1200,
  })
})

test('a slow, deliberate drag settles at whichever snap point is nearest by distance', async () => {
  const screen = await render(BottomSheetFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  const startY = window.innerHeight - 40
  // Dragged distance lands close to the 'large' (92%) offset, but slowly
  // (~0.05px/ms) — below VELOCITY_THRESHOLD, so this is decided by distance
  // to the nearest snap point, not velocity-tier stepping.
  await drag(handle(), startY, startY - window.innerHeight * 0.3, 900)

  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.92, -1), {
    timeout: 1200,
  })
})

test('a fast downward flick dismisses regardless of distance', async () => {
  const screen = await render(BottomSheetFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  const startY = window.innerHeight - 40
  // A short but fast downward flick — small distance, high velocity.
  await drag(handle(), startY, startY + 60, 20)

  await vi.waitFor(
    () => expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed'),
    { timeout: 1200 },
  )
})

test('dismissible=false keeps the sheet at its smallest snap point instead of closing', async () => {
  const screen = await render(BottomSheetFixture, { props: { dismissible: false } })
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  const startY = window.innerHeight - 40
  await drag(handle(), startY, startY + 60, 20)

  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1), {
    timeout: 1200,
  })
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('a drag on the content while not scrolled to the top is left as an ordinary scroll', async () => {
  const screen = await render(BottomSheetFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  content().scrollTop = 100
  const restingHeight = visibleHeight()
  await drag(content(), 300, 500, 100)

  expect(Math.abs(visibleHeight() - restingHeight)).toBeLessThan(10)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('custom beforeClose overrides the built-in exit for every close path, including a drag-triggered dismiss', async () => {
  const captured: Array<() => void> = []
  const screen = await render(BottomSheetFixture, {
    props: { beforeClose: (done: () => void) => captured.push(done) },
  })
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  const startY = window.innerHeight - 40
  await drag(handle(), startY, startY + 60, 20)

  // The built-in slide-to-off-screen must NOT run — captured, not resolved.
  await vi.waitFor(() => expect(captured.length).toBe(1), { timeout: 1200 })
  await expect.element(screen.getByTestId('closing-state')).toHaveTextContent('closing')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  captured[0]()
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('a horizontally-dominant drag on content at the top is left for a nested gesture, not hijacked into a dismiss', async () => {
  const screen = await render(BottomSheetFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  content().scrollTop = 0
  const restingHeight = visibleHeight()

  // Mostly sideways with a few px of downward drift — the shape of a real
  // swipe-to-reveal gesture that used to satisfy "moved down at all" and steal
  // the pointer for a sheet dismiss.
  const c = content()
  const pointerId = 7
  c.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: 60, clientY: 320, pointerId, bubbles: true }),
  )
  await new Promise((r) => setTimeout(r, 30))
  c.dispatchEvent(
    new PointerEvent('pointermove', { clientX: 130, clientY: 326, pointerId, bubbles: true }),
  )
  c.dispatchEvent(
    new PointerEvent('pointermove', { clientX: 200, clientY: 330, pointerId, bubbles: true }),
  )
  c.dispatchEvent(
    new PointerEvent('pointerup', { clientX: 200, clientY: 330, pointerId, bubbles: true }),
  )

  expect(Math.abs(visibleHeight() - restingHeight)).toBeLessThan(10)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
})

test('a vertically-dominant downward drag on content at the top still promotes to a sheet dismiss', async () => {
  const screen = await render(BottomSheetFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  content().scrollTop = 0

  // Straight down, quick: the first move promotes the content drag to a sheet
  // drag, the rest carry it into a flick-dismiss.
  const c = content()
  const pointerId = 8
  c.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: 100, clientY: 200, pointerId, bubbles: true }),
  )
  await new Promise((r) => setTimeout(r, 20))
  c.dispatchEvent(
    new PointerEvent('pointermove', { clientX: 102, clientY: 216, pointerId, bubbles: true }),
  )
  c.dispatchEvent(
    new PointerEvent('pointermove', { clientX: 103, clientY: 320, pointerId, bubbles: true }),
  )
  c.dispatchEvent(
    new PointerEvent('pointerup', { clientX: 103, clientY: 320, pointerId, bubbles: true }),
  )

  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('a beforeClose that moves the panel off screen itself closes the sheet right away', async () => {
  const screen = await render(BottomSheetFixture, {
    props: {
      beforeClose: (done: () => void) => {
        // A custom exit that has already landed: the panel is below the viewport.
        panel().style.transition = 'none'
        panel().style.transform = 'translateY(100%)'
        done()
      },
    },
  })
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  await userEvent.keyboard('{Escape}')
  // Two frames, far short of the built-in slide's 520ms.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  expect(screen.getByTestId('open-state').element().textContent).toBe('closed')
  expect(document.querySelector('[data-state="closing"]')).toBeNull()

  // Reopening still rises to the initial snap point.
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))
})

test('a beforeClose that only confirms, calling done() with the sheet still up, keeps the slide-out', async () => {
  const screen = await render(BottomSheetFixture, {
    props: { beforeClose: (done: () => void) => done() },
  })
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  await userEvent.keyboard('{Escape}')
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  expect(document.querySelector('[data-state="closing"]')).not.toBeNull()
  await vi.waitFor(() =>
    expect(screen.getByTestId('open-state').element().textContent).toBe('closed'),
  )
})

test('releaseVelocity reports the flick speed for a drag dismiss and 0 for any other close', async () => {
  const screen = await render(BottomSheetFixture, {
    props: { beforeClose: (done: () => void) => done() },
  })
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))

  // A slow start that ends in a flick: the release speed comes from the end, not the average.
  const startY = window.innerHeight - 40
  const pointerId = 1
  const el = handle()
  el.dispatchEvent(new PointerEvent('pointerdown', { clientY: startY, pointerId, bubbles: true }))
  await new Promise((r) => setTimeout(r, 200))
  el.dispatchEvent(
    new PointerEvent('pointermove', { clientY: startY + 5, pointerId, bubbles: true }),
  )
  await new Promise((r) => setTimeout(r, 40))
  el.dispatchEvent(
    new PointerEvent('pointermove', { clientY: startY + 85, pointerId, bubbles: true }),
  )
  el.dispatchEvent(
    new PointerEvent('pointerup', { clientY: startY + 85, pointerId, bubbles: true }),
  )

  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  // 80px over ~40ms is ~2px/ms; the whole-drag average would be under 0.4px/ms.
  const flick = Number(screen.getByTestId('release-velocity').element().textContent)
  expect(flick).toBeGreaterThan(1)

  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(visibleHeight()).toBeCloseTo(window.innerHeight * 0.6, -1))
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('release-velocity')).toHaveTextContent('0')
})

test('container: the sheet fills the container and snaps to fractions of its height', async () => {
  const { h, shallowRef } = await import('vue')
  const { default: BottomSheet } = await import('../src/components/BottomSheet/BottomSheet.vue')
  const box = shallowRef<HTMLElement | null>(null)
  const open = shallowRef(false)
  await render({
    render: () => [
      h('div', {
        ref: (el: unknown) => (box.value = el as HTMLElement | null),
        style: 'position: relative; height: 400px; margin-top: 120px; overflow: hidden',
      }),
      box.value &&
        h(BottomSheet, {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          container: box.value,
          title: 'Contained',
        }),
    ],
  })
  await vi.waitFor(() => expect(box.value).not.toBeNull())
  open.value = true
  const sheet = () => box.value!.querySelector<HTMLElement>('.ui-dialog-panel')!
  await vi.waitFor(() => expect(sheet()).not.toBeNull())
  const boxRect = box.value!.getBoundingClientRect()
  expect(sheet().getBoundingClientRect().height).toBeCloseTo(400, 0)
  // The default first snap point shows 60% of the container, not of the viewport.
  await vi.waitFor(() =>
    expect(boxRect.bottom - sheet().getBoundingClientRect().top).toBeCloseTo(240, -1),
  )
})
