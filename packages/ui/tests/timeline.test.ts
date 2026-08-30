import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import TimelineFixture from './fixtures/TimelineFixture.vue'

function stepsIn(screen: ReturnType<typeof render>, testId: string): NodeListOf<HTMLElement> {
  return screen.container.querySelectorAll<HTMLElement>(
    `[data-testid="${testId}"] .ui-timeline-step`,
  )
}

test('items are opaque — plain strings render via the bare fallback with no assumed shape', async () => {
  const screen = render(TimelineFixture, {})
  const steps = stepsIn(screen, 'plain')
  expect(steps).toHaveLength(3)
  await expect.element(steps[0]!).toHaveTextContent('Order placed')
})

test('with neither completed/active/current given, no data attrs are set and every connector is unfilled', async () => {
  const screen = render(TimelineFixture, {})
  const steps = stepsIn(screen, 'plain')
  steps.forEach((step) => {
    expect(step.hasAttribute('data-completed')).toBe(false)
    expect(step.hasAttribute('data-active')).toBe(false)
  })
  const connectors = screen.container.querySelectorAll(
    '[data-testid="plain"] .ui-timeline-connector',
  )
  connectors.forEach((c) => expect(c.hasAttribute('data-filled')).toBe(false))
})

test('completed is derived from the item via the consumer-supplied function, not a field on it', async () => {
  const screen = render(TimelineFixture, {})
  const steps = stepsIn(screen, 'completed')
  expect(steps[0]!.hasAttribute('data-completed')).toBe(true)
  expect(steps[1]!.hasAttribute('data-completed')).toBe(false)
  const connectors = screen.container.querySelectorAll(
    '[data-testid="completed"] .ui-timeline-connector',
  )
  expect(connectors[0]!.hasAttribute('data-filled')).toBe(true)
})

test('completed and active are independent — a step can be both at once', async () => {
  const screen = render(TimelineFixture, {})
  const step = stepsIn(screen, 'both-flags')[0]!
  expect(step.hasAttribute('data-completed')).toBe(true)
  expect(step.hasAttribute('data-active')).toBe(true)
})

test('the #item slot fully controls content — a range-shaped item with start/end renders however the consumer wants', async () => {
  const screen = render(TimelineFixture, {})
  await expect
    .element(
      screen.container.querySelector<HTMLElement>('[data-testid="range"] .ui-timeline-content')!,
    )
    .toHaveTextContent('Mon – Wed')
})

test('the #marker slot fully overrides the default dot and receives completed/active independently', async () => {
  const screen = render(TimelineFixture, {})
  expect(screen.container.querySelector('[data-testid="marker"] .ui-timeline-dot')).toBeNull()
  await expect
    .element(
      screen.container.querySelector<HTMLElement>('[data-testid="marker"] .ui-timeline-marker')!,
    )
    .toHaveTextContent('marker:false:true')
})

test('itemKey lets a consumer identify items other than by index', async () => {
  const screen = render(TimelineFixture, {})
  expect(stepsIn(screen, 'keyed')).toHaveLength(2)
  await expect.element(stepsIn(screen, 'keyed')[0]!).toHaveTextContent('A')
})

test('orientation prop drives the root modifier class', async () => {
  const screen = render(TimelineFixture, {})
  expect(screen.container.querySelector('[data-testid="plain"] .ui-timeline')!.className).toContain(
    'ui-timeline--vertical',
  )
  expect(
    screen.container.querySelector('[data-testid="horizontal"] .ui-timeline')!.className,
  ).toContain('ui-timeline--horizontal')
})

test('the #opposite slot renders on the other side of the line and only reserves that column when used', async () => {
  const screen = render(TimelineFixture, {})
  await expect
    .element(
      screen.container.querySelector<HTMLElement>(
        '[data-testid="opposite"] .ui-timeline-opposite',
      )!,
    )
    .toHaveTextContent('May 2025')
  // No #opposite given elsewhere — that column shouldn't exist there at all.
  expect(screen.container.querySelector('[data-testid="plain"] .ui-timeline-opposite')).toBeNull()
  expect(
    screen.container.querySelector('[data-testid="opposite"] .ui-timeline')!.className,
  ).toContain('ui-timeline--has-opposite')
})

test('the connector actually reaches from one marker to the next, regardless of content height', async () => {
  const screen = render(TimelineFixture, {})
  const markers = screen.container.querySelectorAll<HTMLElement>(
    '[data-testid="completed"] .ui-timeline-marker',
  )
  const connector = screen.container.querySelector<HTMLElement>(
    '[data-testid="completed"] .ui-timeline-connector',
  )!
  const firstMarkerRect = markers[0]!.getBoundingClientRect()
  const secondMarkerRect = markers[1]!.getBoundingClientRect()
  const connectorRect = connector.getBoundingClientRect()
  // Allow a couple px of slack for the marker's own halo/border box.
  expect(connectorRect.top).toBeLessThanOrEqual(firstMarkerRect.bottom + 2)
  expect(connectorRect.bottom).toBeGreaterThanOrEqual(secondMarkerRect.top - 2)
})

test("with #opposite, every row's marker lands at the same X regardless of that row's own opposite text width", async () => {
  const screen = render(TimelineFixture, {})
  const markers = screen.container.querySelectorAll<HTMLElement>(
    '[data-testid="opposite"] .ui-timeline-marker',
  )
  expect(markers.length).toBeGreaterThan(1)
  const lefts = [...markers].map((m) => m.getBoundingClientRect().left)
  lefts.forEach((left) => expect(left).toBeCloseTo(lefts[0]!, 1))
})

test('pulse is off by default — no animation on the active marker unless the pulse prop is set', async () => {
  const screen = render(TimelineFixture, {})
  const offRoot = screen.container.querySelector('[data-testid="pulse-off"] .ui-timeline')!
  const onRoot = screen.container.querySelector('[data-testid="pulse-on"] .ui-timeline')!
  expect(offRoot.className).not.toContain('ui-timeline--pulse')
  expect(onRoot.className).toContain('ui-timeline--pulse')

  const offBefore = getComputedStyle(
    screen.container.querySelector('[data-testid="pulse-off"] .ui-timeline-marker')!,
    '::before',
  )
  expect(offBefore.animationName).toBe('none')
})

test('motionCss=false also disables the dot and connector transitions, not just list add/remove', async () => {
  const screen = render(TimelineFixture, {})

  const offDot = getComputedStyle(
    screen.container.querySelector('[data-testid="no-motion"] .ui-timeline-dot')!,
  )
  expect(offDot.transitionProperty).toBe('background-color')

  const offConnectorAfter = getComputedStyle(
    screen.container.querySelector('[data-testid="no-motion"] .ui-timeline-connector')!,
    '::after',
  )
  expect(offConnectorAfter.transitionDuration).toBe('0s')

  const onConnectorAfter = getComputedStyle(
    screen.container.querySelector('[data-testid="motion-on"] .ui-timeline-connector')!,
    '::after',
  )
  expect(onConnectorAfter.transitionDuration).not.toBe('0s')
})

test('current derives completed/active from a plain linear index', async () => {
  const screen = render(TimelineFixture, {})
  const steps = stepsIn(screen, 'current')
  expect(steps[0]!.hasAttribute('data-active')).toBe(true)
  expect(steps[0]!.hasAttribute('data-completed')).toBe(false)
  expect(steps[1]!.hasAttribute('data-active')).toBe(false)
  expect(steps[1]!.hasAttribute('data-completed')).toBe(false)

  await screen.getByTestId('advance').click()
  await expect.poll(() => stepsIn(screen, 'current')[0]!.hasAttribute('data-completed')).toBe(true)
  expect(stepsIn(screen, 'current')[1]!.hasAttribute('data-active')).toBe(true)
})

test('completed and active fall back to current independently, per-flag', async () => {
  const screen = render(TimelineFixture, {})
  const steps = stepsIn(screen, 'current-with-completed')
  // `completed` is explicit (item.done); `active` wasn't given at all, so it still falls back
  // to current=0 on its own — the two flags resolve independently, not as an all-or-nothing pair.
  expect(steps[0]!.hasAttribute('data-completed')).toBe(true)
  expect(steps[0]!.hasAttribute('data-active')).toBe(true)
  expect(steps[1]!.hasAttribute('data-completed')).toBe(false)
  expect(steps[1]!.hasAttribute('data-active')).toBe(false)
})

test('pushing a new item renders an additional step reactively', async () => {
  const screen = render(TimelineFixture, {})
  expect(stepsIn(screen, 'reactive')).toHaveLength(1)

  await screen.getByTestId('push-item').click()
  await expect.poll(() => stepsIn(screen, 'reactive').length).toBe(2)
})
