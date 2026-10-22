// Real layout matters here (spotlight clip-path, positioning), so load the CSS
import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Tour from '../src/components/Tour/Tour.vue'
import type { TourStep, TourStepChangeDetails } from '../src/components/Tour/Tour.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import TourFixture from './fixtures/TourFixture.vue'
import TourTeleportFixture from './fixtures/TourTeleportFixture.vue'
import TourInteractiveFixture from './fixtures/TourInteractiveFixture.vue'

test('opens on the first step, target stays interactive by default, page scroll-locks', async () => {
  const screen = await render(TourFixture)
  await screen.getByTestId('trigger').click()

  await expect.element(screen.getByTestId('state')).toHaveTextContent('open')
  await expect.element(page.getByText('Step A')).toBeVisible()
  expect(document.getElementById('target-a')!.inert).toBe(false)
  expect(document.body.style.overflow).toBe('hidden')
})

test('next/prev navigate steps and re-target the spotlight', async () => {
  const screen = await render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(screen.getByTestId('step-index')).toHaveTextContent('1')
  await expect.element(page.getByText('Step B')).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await expect.element(screen.getByTestId('step-index')).toHaveTextContent('0')
  await expect.element(page.getByText('Step A')).toBeVisible()
})

test('disableInteraction makes the target inert too, unlike the default', async () => {
  // `inert` inherits from an ancestor, so check effective inertness (closest([inert])),
  // not the element's own attribute — Tour may mark a shared container inert rather than
  // the target itself, depending on what else is (or isn't) protected at that moment.
  const screen = await render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()
  expect(document.getElementById('target-a')!.closest('[inert]')).toBeNull()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Step B')).toBeVisible()
  await vi.waitFor(() =>
    expect(document.getElementById('target-b')!.closest('[inert]')).not.toBeNull(),
  )
})

test('onBeforeEnter runs before the target is resolved — the "open a drawer first" case', async () => {
  const screen = await render(TourFixture)
  await screen.getByTestId('trigger').click()
  expect(document.getElementById('target-d')).toBeNull() // not mounted yet

  await page.getByRole('button', { name: 'Next' }).click() // -> B
  await page.getByRole('button', { name: 'Next' }).click() // -> C
  await page.getByRole('button', { name: 'Next' }).click() // -> D, behind onBeforeEnter
  await expect.element(page.getByText('Step D')).toBeVisible()
  expect(document.getElementById('target-d')).not.toBeNull() // onBeforeEnter mounted it in time
})

test('onBeforeEnter resolves and positions correctly regardless of which teleported component the target lives behind', async () => {
  // Each of these steps' target only exists once its own onBeforeEnter opens a DIFFERENT
  // teleported component (Dialog, then Drawer, then Popover, then BottomSheet, then
  // CommandPalette) — all five teleport to body independently of Tour's own
  // Popover/TourSpotlight teleports. Checking that focus (via Tour's own focus-management)
  // lands inside Tour's panel each time is the strictest available proof that useDOMTarget
  // re-resolved AND floating-ui actually positioned against the new target — a stale/null
  // reference would leave positionerStyle stuck at `visibility: hidden`, and a hidden
  // element can never receive focus (see this file's git history for exactly that bug,
  // caught by this same check).
  const screen = await render(TourTeleportFixture)
  await screen.getByTestId('trigger').click()

  const expectTourPanelFocused = (text: string) =>
    vi.waitFor(() => {
      const panels = document.querySelectorAll('.ui-popover-panel')
      const tourPanel = Array.from(panels).find((p) => p.textContent?.includes(text))
      expect(tourPanel?.contains(document.activeElement)).toBe(true)
    })

  await expect.element(page.getByText('Behind a Dialog')).toBeVisible()
  await expectTourPanelFocused('Behind a Dialog')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Behind a Drawer')).toBeVisible()
  await expectTourPanelFocused('Behind a Drawer')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Behind a Popover')).toBeVisible()
  await expectTourPanelFocused('Behind a Popover')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Behind a BottomSheet')).toBeVisible()
  await expectTourPanelFocused('Behind a BottomSheet')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Behind a CommandPalette')).toBeVisible()
  await expectTourPanelFocused('Behind a CommandPalette')
})

test('advancing past the last step finishes and closes; skip closes early', async () => {
  const screen = await render(TourFixture)
  await screen.getByTestId('trigger').click()
  await page.getByRole('button', { name: 'Next' }).click() // -> B
  await page.getByRole('button', { name: 'Next' }).click() // -> C
  await page.getByRole('button', { name: 'Next' }).click() // -> D (last)
  await expect.element(page.getByText('Step D')).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()
  await expect.element(screen.getByTestId('finished')).toHaveTextContent('finished')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  expect(document.body.style.overflow).toBe('')

  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible() // reopening resets to first step
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect.element(screen.getByTestId('skipped')).toHaveTextContent('skipped')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
})

test('ArrowRight/ArrowLeft step forward and back', async () => {
  const screen = await render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(screen.getByTestId('step-index')).toHaveTextContent('1')
  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(screen.getByTestId('step-index')).toHaveTextContent('0')
})

test('progress text reflects total step count across groups', async () => {
  const screen = await render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step 1 of 4')).toBeVisible()

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(page.getByText('Step 2 of 4')).toBeVisible()
})

test('Escape closes the tour and releases the scroll lock', async () => {
  const screen = await render(TourFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Step A')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
  await vi.waitFor(() => expect(document.body.style.overflow).toBe(''))
})

// Tour is generic, so InstanceType can't name it; these are the exposed members the tests read.
type TourHandle = {
  spotlightEl: HTMLElement | null
  positionerEl: HTMLElement | null
  panelEl: HTMLElement | null
}

// Two targets far apart, so a glide between them is long enough to catch mid-flight.
function renderMotionTour(props: Record<string, unknown> = {}, provider?: Record<string, unknown>) {
  const tour = shallowRef<TourHandle | null>(null)
  const steps: TourStep[] = [
    { target: '#motion-a', title: 'Motion A' },
    { target: '#motion-b', title: 'Motion B', side: 'top' },
  ]
  const tree = () => [
    h('button', { id: 'motion-a', style: 'margin: 16px' }, 'A'),
    h('div', { id: 'motion-b', style: 'margin: 220px 0 0 200px; width: 160px; height: 80px' }, 'B'),
    h(Tour as never, {
      ref: (instance: unknown) => (tour.value = instance as TourHandle | null),
      open: true,
      steps,
      ...props,
    }),
  ]
  return render(() => (provider ? h(ConfigProvider, provider, tree) : tree())).then(async () => {
    await expect.element(page.getByText('Motion A')).toBeVisible()
    return tour
  })
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const cutoutOf = (el: HTMLElement) => el.style.getPropertyValue('--ui-tour-cutout')

// The cutout the spotlight shows one frame after Next, and the one it settles on.
async function cutoutAfterNext(tour: { value: TourHandle | null }) {
  const spotlight = tour.value!.spotlightEl as HTMLElement
  await vi.waitFor(() => expect(cutoutOf(spotlight)).toContain('path('))
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Motion B')).toBeVisible()
  await nextFrame()
  const firstFrame = cutoutOf(spotlight)
  // Settled: unchanged across a few frames (a glide moves it every frame).
  await vi.waitFor(async () => {
    const before = cutoutOf(spotlight)
    for (let i = 0; i < 3; i++) await nextFrame()
    expect(cutoutOf(spotlight)).toBe(before)
  })
  return { firstFrame, settled: cutoutOf(spotlight) }
}

test('exposes the spotlight and the callout positioner', async () => {
  const tour = await renderMotionTour()
  const spotlight = tour.value!.spotlightEl as HTMLElement | null
  const positioner = tour.value!.positionerEl as HTMLElement | null
  expect(spotlight?.classList.contains('ui-tour-spotlight')).toBe(true)
  expect(positioner?.classList.contains('ui-popover-positioner')).toBe(true)
  expect(positioner?.contains(tour.value!.panelEl as HTMLElement)).toBe(true)
})

test('the spotlight glides between steps by default', async () => {
  const tour = await renderMotionTour()
  const { firstFrame, settled } = await cutoutAfterNext(tour)
  expect(firstFrame).not.toBe(settled)
})

test('motion false: the cutout jumps to the next target', async () => {
  const tour = await renderMotionTour({ motion: false })
  const { firstFrame, settled } = await cutoutAfterNext(tour)
  expect(firstFrame).toBe(settled)
})

test('motion false from a provider turns the glide off too', async () => {
  const off = await renderMotionTour({}, { motion: false })
  const result = await cutoutAfterNext(off)
  expect(result.firstFrame).toBe(result.settled)
})

test('an inline clip-path on the exposed spotlight wins, and removing it shows Tour’s cutout again', async () => {
  const tour = await renderMotionTour({ motion: false })
  const spotlight = tour.value!.spotlightEl as HTMLElement
  await vi.waitFor(() => expect(cutoutOf(spotlight)).toContain('path('))
  const own = getComputedStyle(spotlight).clipPath
  expect(own).toContain('path(')

  spotlight.style.clipPath = 'inset(10px)'
  expect(getComputedStyle(spotlight).clipPath).toBe('inset(10px)')
  spotlight.style.removeProperty('clip-path')
  expect(getComputedStyle(spotlight).clipPath).toBe(own)
})

test('the callout is at its new position by the first animation frame after @step-change', async () => {
  const positions: string[] = []
  const tour = shallowRef<TourHandle | null>(null)
  const read = () => {
    const el = tour.value!.positionerEl as HTMLElement
    return `${el.style.top} ${el.style.left}`
  }
  await render(() => [
    h('button', { id: 'frame-a', style: 'margin: 16px' }, 'A'),
    h('div', { id: 'frame-b', style: 'margin: 220px 0 0 200px; width: 160px; height: 80px' }, 'B'),
    h(Tour as never, {
      ref: (instance: unknown) => (tour.value = instance as TourHandle | null),
      open: true,
      motion: false,
      steps: [
        { target: '#frame-a', title: 'Frame A' },
        {
          target: '#frame-b',
          title: 'Frame B',
          description: 'A longer step, so the callout resizes.',
        },
      ],
      onStepChange: ({ reason }: TourStepChangeDetails) => {
        if (reason === 'next') requestAnimationFrame(() => positions.push(read()))
      },
    }),
  ])
  await expect.element(page.getByText('Frame A')).toBeVisible()
  await vi.waitFor(async () => {
    const at = read()
    for (let i = 0; i < 3; i++) await nextFrame()
    expect(read()).toBe(at)
  })
  const before = read()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Frame B')).toBeVisible()
  await expect.poll(() => positions).toHaveLength(1)
  await vi.waitFor(async () => {
    const at = read()
    for (let i = 0; i < 3; i++) await nextFrame()
    expect(read()).toBe(at)
  })
  expect(positions).toHaveLength(1)
  expect(positions[0]).not.toBe(before)
  expect(positions[0]).toBe(read())
})

test('Skip and Done go through beforeClose, so a guard decides', async () => {
  const answers: ((allowed: boolean) => void)[] = []
  const beforeClose = vi.fn(() => new Promise<boolean>((resolve) => answers.push(resolve)))
  const open = shallowRef(true)
  await renderMotionTour({
    beforeClose,
    get open() {
      return open.value
    },
    'onUpdate:open': (v: boolean) => (open.value = v),
  })
  await page.getByRole('button', { name: 'Skip' }).click()
  expect(beforeClose).toHaveBeenCalledTimes(1)
  await expect.element(page.getByText('Motion A')).toBeVisible()

  answers[0]!(true)
  await vi.waitFor(() => expect(open.value).toBe(false))

  open.value = true
  await expect.element(page.getByText('Motion A')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  expect(beforeClose).toHaveBeenCalledTimes(2)
  answers[1]!(true)
  await vi.waitFor(() => expect(open.value).toBe(false))
})

test('arrow keys typed inside a spotlighted input move the caret, not the tour', async () => {
  const screen = await render(TourInteractiveFixture)
  await expect.element(page.getByText('Type your name')).toBeVisible()

  const input = screen.getByTestId('tour-input')
  await input.click()
  await userEvent.keyboard('abc{ArrowLeft}{ArrowLeft}')
  await expect.element(input).toHaveFocus()
  expect(screen.getByTestId('step-index').element().textContent).toBe('0')
  expect((input.element() as HTMLInputElement).selectionStart).toBe(1)

  // Modified arrows (e.g. word jumps) are left alone too.
  await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}')
  expect(screen.getByTestId('step-index').element().textContent).toBe('0')
})

test('Escape closes a Dialog opened from a tour step before it skips the tour', async () => {
  const screen = await render(TourInteractiveFixture)
  await expect.element(page.getByText('Type your name')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Open settings')).toBeVisible()

  await screen.getByTestId('open-dialog').click()
  await expect.element(page.getByRole('dialog', { name: 'Settings dialog' })).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('dialog-state')).toHaveTextContent('closed')
  expect(screen.getByTestId('state').element().textContent).toBe('open')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
})

test('Escape still skips the tour while a step’s own onBeforeEnter overlay is open', async () => {
  const screen = await render(TourTeleportFixture)
  await screen.getByTestId('trigger').click()
  await expect.element(page.getByText('Behind a Dialog')).toBeVisible()

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(document.body.textContent).not.toContain('Behind a Dialog'))
})

test('restarting a tour lands the callout on the first step instead of gliding in from the corner', async () => {
  const screen = await render(TourFixture)
  const glided: string[] = []
  let polling = true
  const poll = () => {
    const positioner = document.querySelector('.ui-popover-positioner')
    if (positioner?.getAnimations().some((a) => a.id === 'ui-tour-glide'))
      glided.push(screen.getByTestId('step-index').element().textContent ?? '')
    if (polling) requestAnimationFrame(poll)
  }
  requestAnimationFrame(poll)
  try {
    await screen.getByTestId('trigger').click()
    await expect.element(page.getByText('Step A')).toBeVisible()
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    await page.getByRole('button', { name: 'Next' }).click()
    await expect.element(page.getByText('Step B')).toBeVisible()
    // Sanity: a step change inside one session does glide.
    await vi.waitFor(() => expect(glided.length).toBeGreaterThan(0))

    await page.getByRole('button', { name: 'Skip' }).click()
    await expect.element(screen.getByTestId('state')).toHaveTextContent('closed')
    glided.length = 0

    // Reopening resets B -> A: that is a fresh placement, not a step to travel from.
    await screen.getByTestId('trigger').click()
    await expect.element(page.getByText('Step A')).toBeVisible()
    for (let i = 0; i < 5; i++) await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(glided).toEqual([])
  } finally {
    polling = false
  }
})

test('the callout glides to a step on another side of its target instead of jumping', async () => {
  const open = shallowRef(true)
  const steps: TourStep[] = [
    { target: '#glide-a', title: 'Below' },
    { target: '#glide-b', title: 'Above', side: 'top' },
  ]
  await render({
    setup: () => () =>
      h('div', { style: 'padding: 200px 40px' }, [
        h('button', { id: 'glide-a' }, 'A'),
        h('button', { id: 'glide-b', style: 'margin-inline-start: 300px' }, 'B'),
        h(Tour as never, {
          steps,
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
        }),
      ]),
  })
  await expect.element(page.getByText('Below')).toBeVisible()
  for (let i = 0; i < 3; i++) await new Promise((resolve) => requestAnimationFrame(resolve))
  const positioner = document.querySelector<HTMLElement>('.ui-popover-positioner')!
  const seen: DOMRect[] = []
  let sampling = true
  const sample = () => {
    seen.push(positioner.getBoundingClientRect())
    if (sampling) requestAnimationFrame(sample)
  }
  sample()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Above')).toBeVisible()
  const gliding = () => positioner.getAnimations().some((a) => a.id === 'ui-tour-glide')
  await vi.waitFor(() => expect(gliding()).toBe(true))
  await vi.waitFor(() => expect(gliding()).toBe(false))
  sampling = false
  // No frame covers half the trip: it travels instead of landing.
  const trip = Math.hypot(seen.at(-1)!.x - seen[0]!.x, seen.at(-1)!.y - seen[0]!.y)
  const moves = seen.slice(1).map((r, i) => Math.hypot(r.x - seen[i]!.x, r.y - seen[i]!.y))
  expect(trip).toBeGreaterThan(100)
  expect(Math.max(...moves)).toBeLessThan(trip / 2)
  const after = positioner.getBoundingClientRect()
  expect(after.bottom).toBeLessThan(document.querySelector('#glide-b')!.getBoundingClientRect().top)
})

test('a step asking for a side with no room in a narrow contained frame goes below the target instead', async () => {
  const frame = shallowRef<HTMLElement | null>(null)
  const open = shallowRef(true)
  const steps: TourStep[] = [{ target: '#wide-card', title: 'Recent activity', side: 'left' }]
  await render({
    setup: () => () =>
      h(
        'div',
        {
          ref: frame,
          'data-testid': 'frame',
          style: 'position: relative; width: 360px; height: 640px; overflow: hidden',
        },
        [
          h('div', { id: 'wide-card', style: 'margin: 120px 12px 0; height: 160px' }, 'Activity'),
          frame.value
            ? h(Tour as never, {
                open: open.value,
                'onUpdate:open': (v: boolean) => (open.value = v),
                steps,
                container: frame.value,
              })
            : null,
        ],
      ),
  })
  await vi.waitFor(() => expect(page.getByText('Recent activity').element()).toBeTruthy())
  await new Promise((r) => setTimeout(r, 400))
  const box = document.querySelector<HTMLElement>('[data-testid="frame"]')!.getBoundingClientRect()
  const card = document.getElementById('wide-card')!.getBoundingClientRect()
  const panel = page.getByText('Recent activity').element().closest<HTMLElement>('[role="dialog"]')!
  const r = panel.getBoundingClientRect()
  // Inside the frame, not cut off at its left edge, and under the card it points at.
  expect(r.left).toBeGreaterThanOrEqual(box.left - 0.5)
  expect(r.right).toBeLessThanOrEqual(box.right + 0.5)
  expect(r.top).toBeGreaterThanOrEqual(card.bottom - 0.5)
})
