import '../src/style.css'
import { h, nextTick, ref, shallowRef } from 'vue'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import Stepper from '../src/components/Stepper/Stepper.vue'
import type { StepperItem } from '../src/components/Stepper/Stepper.vue'

const items: StepperItem[] = [
  { label: 'Account' },
  { label: 'Profile' },
  { label: 'Review', disabled: true },
  { label: 'Done' },
]

test('steps before/at/after modelValue get completed/active/upcoming data-state', async () => {
  const screen = await render(Stepper, { props: { items, modelValue: 1 } })
  const steps = screen.container.querySelectorAll('.ui-stepper-step')
  expect(steps[0]!.getAttribute('data-state')).toBe('completed')
  expect(steps[1]!.getAttribute('data-state')).toBe('active')
  expect(steps[2]!.getAttribute('data-state')).toBe('upcoming')
})

test('motionCss=false disables the check/number swap transition (no ui-stepper-check-* class applied)', async () => {
  const screen = await render(Stepper, { props: { items, modelValue: 1, motionCss: false } })
  const check = screen.container.querySelector('.ui-stepper-step svg')!
  expect(check.getAttribute('class')).toBeNull()
})

test('connectors before the active step are marked filled', async () => {
  const screen = await render(Stepper, { props: { items, modelValue: 2 } })
  const connectors = screen.container.querySelectorAll('.ui-stepper-connector')
  expect(connectors[0]!.getAttribute('data-state')).toBe('filled')
  expect(connectors[1]!.getAttribute('data-state')).toBe('filled')
  expect(connectors[2]!.getAttribute('data-state')).toBe('unfilled')
})

test('clicking a past step (linear default) navigates back and emits change', async () => {
  const modelValue = ref(2)
  const changed: number[] = []
  const Wrapper = {
    render: () =>
      h(Stepper as any, {
        items,
        modelValue: modelValue.value,
        'onUpdate:modelValue': (v: number) => (modelValue.value = v),
        onChange: (i: number) => changed.push(i),
      }),
  }
  const screen = await render(Wrapper)
  const first = screen.container.querySelectorAll('.ui-stepper-trigger')[0]!
  await userEvent.click(first)
  expect(modelValue.value).toBe(0)
  expect(changed).toEqual([0])
})

test('linear (default) blocks skipping ahead to an unreached step', async () => {
  const modelValue = ref(0)
  const Wrapper = {
    render: () =>
      h(Stepper as any, {
        items,
        modelValue: modelValue.value,
        'onUpdate:modelValue': (v: number) => (modelValue.value = v),
      }),
  }
  const screen = await render(Wrapper)
  const last = screen.container.querySelectorAll('.ui-stepper-trigger')[3]!
  // Not clickable ahead of the active step: renders as a plain div, not a button.
  expect(last.tagName).toBe('DIV')
  expect(modelValue.value).toBe(0)
})

test('linear=false allows jumping straight to any non-disabled step', async () => {
  const modelValue = ref(0)
  const Wrapper = {
    render: () =>
      h(Stepper as any, {
        items,
        linear: false,
        modelValue: modelValue.value,
        'onUpdate:modelValue': (v: number) => (modelValue.value = v),
      }),
  }
  const screen = await render(Wrapper)
  const last = screen.container.querySelectorAll('.ui-stepper-trigger')[3]!
  expect(last.tagName).toBe('BUTTON')
  await userEvent.click(last)
  expect(modelValue.value).toBe(3)
})

test('a disabled step never becomes clickable, even with linear=false', async () => {
  const screen = await render(Stepper, { props: { items, linear: false, modelValue: 0 } })
  const review = screen.container.querySelectorAll('.ui-stepper-trigger')[2]!
  expect(review.tagName).toBe('DIV')
})

test('clickable=false renders every trigger as a non-interactive div', async () => {
  const screen = await render(Stepper, { props: { items, clickable: false, modelValue: 1 } })
  const triggers = screen.container.querySelectorAll('.ui-stepper-trigger')
  triggers.forEach((el) => expect(el.tagName).toBe('DIV'))
})

test('item slot fully overrides the default circle/label markup', async () => {
  const screen = await render(Stepper, {
    props: { items, modelValue: 0 },
    slots: {
      item: ({ item, index }: { item: StepperItem; index: number }) =>
        `custom-${index}-${item.label}`,
    },
  })
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-stepper-content')!)
    .toHaveTextContent('custom-0-Account')
})

test('linear: steps reached earlier stay clickable after stepping back', async () => {
  const modelValue = ref(0)
  const Wrapper = {
    render: () =>
      h(Stepper as any, {
        items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
        modelValue: modelValue.value,
        'onUpdate:modelValue': (v: number) => (modelValue.value = v),
      }),
  }
  const screen = await render(Wrapper)
  modelValue.value = 2
  await Promise.resolve()
  const triggers = () => screen.container.querySelectorAll<HTMLElement>('.ui-stepper-trigger')
  await userEvent.click(triggers()[0]!)
  expect(modelValue.value).toBe(0)
  // Step 2 was reached, so it's still a button; step 3 never was.
  expect(triggers()[2]!.tagName).toBe('BUTTON')
  expect(triggers()[3]!.tagName).toBe('DIV')
  await userEvent.click(triggers()[2]!)
  expect(modelValue.value).toBe(2)
})

test('non-interactive steps carry no disabled attribute; disabled steps use aria-disabled and look dimmed', async () => {
  const screen = await render(Stepper, { props: { items, modelValue: 0 } })
  const triggers = screen.container.querySelectorAll<HTMLElement>('.ui-stepper-trigger')
  triggers.forEach((el) => expect(el.hasAttribute('disabled')).toBe(false))
  expect(triggers[2]!.getAttribute('aria-disabled')).toBe('true')
  expect(triggers[3]!.hasAttribute('aria-disabled')).toBe(false)
  // Disabled reads differently from a merely upcoming step.
  expect(getComputedStyle(triggers[2]!).opacity).toBe('0.5')
  expect(getComputedStyle(triggers[3]!).opacity).toBe('1')
})

test('#indicator slot replaces the circle content and receives the step state', async () => {
  const screen = await render(Stepper, {
    props: { items, modelValue: 1 },
    slots: {
      indicator: ({ index, state }: { index: number; state: string }) => `${index}:${state}`,
    },
  })
  const circles = screen.container.querySelectorAll<HTMLElement>('.ui-stepper-circle')
  expect(circles[0]!.textContent).toBe('0:completed')
  expect(circles[1]!.textContent).toBe('1:active')
  expect(circles[3]!.textContent).toBe('3:upcoming')
  expect(circles[0]!.querySelector('svg')).toBeNull()
})

test('motionCss=false switches off the circle and connector fill transitions too', async () => {
  const make = (motionCss: boolean) =>
    render(Stepper, { props: { items, modelValue: 1, motionCss } })
  const parts = (container: HTMLElement) => ({
    circle: container.querySelector<HTMLElement>('.ui-stepper-circle')!,
    connector: container.querySelector<HTMLElement>('.ui-stepper-connector')!,
  })
  const on = await make(true)
  const animated = parts(on.container)
  expect(getComputedStyle(animated.circle).transitionProperty).not.toBe('none')
  expect(getComputedStyle(animated.connector, '::after').transitionProperty).toBe('scale')
  on.unmount()

  const off = await make(false)
  const still = parts(off.container)
  expect(getComputedStyle(still.circle).transitionProperty).toBe('none')
  expect(getComputedStyle(still.connector, '::after').transitionProperty).toBe('none')
})

test('exposes circleEls, connectorEls and labelEls in order, and keeps them right when a step remounts', async () => {
  const stepper = shallowRef<{
    circleEls: HTMLElement[]
    connectorEls: HTMLElement[]
    labelEls: HTMLElement[]
  } | null>(null)
  const modelValue = ref(0)
  const screen = await render(() =>
    h(Stepper as any, {
      ref: stepper,
      items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }],
      modelValue: modelValue.value,
    }),
  )
  const query = (selector: string) => [...screen.container.querySelectorAll<HTMLElement>(selector)]
  expect(stepper.value!.circleEls).toHaveLength(4)
  expect(stepper.value!.connectorEls).toHaveLength(3)
  expect(stepper.value!.circleEls).toEqual(query('.ui-stepper-circle'))
  expect(stepper.value!.connectorEls).toEqual(query('.ui-stepper-connector'))
  expect(stepper.value!.labelEls.map((el) => el.textContent)).toEqual(['A', 'B', 'C', 'D'])

  // Reaching step 2 swaps its trigger from a div to a button, a new circle element.
  const oldCircle = stepper.value!.circleEls[2]
  modelValue.value = 2
  await nextTick()
  await nextTick()
  const circles = query('.ui-stepper-circle')
  expect(circles[2]).not.toBe(oldCircle)
  expect(stepper.value!.circleEls).toEqual(circles)
  expect(stepper.value!.labelEls).toEqual(query('.ui-stepper-label'))
})

test('--ui-stepper-fill on a connector drives its fill, and the default look holds when unset', async () => {
  // motionCss=false, as JS would: with the CSS transition on, the new value eases in.
  const screen = await render(Stepper, { props: { items, modelValue: 1, motionCss: false } })
  const connectors = screen.container.querySelectorAll<HTMLElement>('.ui-stepper-connector')
  const filled = connectors[0]!
  const empty = connectors[1]!
  const scaleOf = (el: HTMLElement) => getComputedStyle(el, '::after').scale
  expect(scaleOf(filled)).toBe('1')
  expect(scaleOf(empty)).toBe('0 1')
  empty.style.setProperty('--ui-stepper-fill', '0.5')
  filled.style.setProperty('--ui-stepper-fill', '0.25')
  expect(scaleOf(empty)).toBe('0.5 1')
  expect(scaleOf(filled)).toBe('0.25 1')
})

test('horizontal: a circle scaled up for a pop still fits, without scrolling the row', async () => {
  const { h } = await import('vue')
  const { render: r } = await import('vitest-browser-vue')
  const { default: Stepper } = await import('../src/components/Stepper/Stepper.vue')
  await r(() =>
    h(Stepper as never, {
      items: [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }],
      modelValue: 0,
    }),
  )
  const list = document.querySelector<HTMLElement>('.ui-stepper--horizontal')!
  const circle = document.querySelector<HTMLElement>('.ui-stepper-circle')!
  circle.style.scale = '1.15'
  expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight)
  expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth)
})

test('the check stays centered in its circle while it fades in', async () => {
  const { h, shallowRef } = await import('vue')
  const { render: r } = await import('vitest-browser-vue')
  const { default: Stepper } = await import('../src/components/Stepper/Stepper.vue')
  const step = shallowRef(0)
  await r(
    () =>
      h(Stepper as never, {
        items: [{ label: 'One' }, { label: 'Two' }],
        modelValue: step.value,
      }),
    { global: { stubs: { transition: false } } },
  )
  step.value = 1
  const svg = await vi.waitFor(() => {
    const el = document.querySelector<SVGElement>('.ui-stepper-check-enter-active')
    if (!el) throw new Error('not entering yet')
    return el
  })
  const circle = svg.closest<HTMLElement>('.ui-stepper-circle')!.getBoundingClientRect()
  const check = svg.getBoundingClientRect()
  expect(check.left + check.width / 2).toBeCloseTo(circle.left + circle.width / 2, 0)
  expect(check.top + check.height / 2).toBeCloseTo(circle.top + circle.height / 2, 0)
})

test('vertical: the line under a circle starts right below it, even when the step has a description', async () => {
  const { h } = await import('vue')
  const { render: r } = await import('vitest-browser-vue')
  const { default: Stepper } = await import('../src/components/Stepper/Stepper.vue')
  await r(() =>
    h(Stepper as never, {
      orientation: 'vertical',
      items: [{ label: 'Cart', description: '3 items' }, { label: 'Shipping' }],
      modelValue: 0,
    }),
  )
  const step = document.querySelector<HTMLElement>('.ui-stepper-step')!
  const circle = step.querySelector<HTMLElement>('.ui-stepper-circle')!.getBoundingClientRect()
  const bridge = getComputedStyle(step, '::after')
  const connector = document
    .querySelector<HTMLElement>('.ui-stepper-connector')!
    .getBoundingClientRect()
  // The bridge runs from just below the circle to where the connector begins.
  const stepTop = step.getBoundingClientRect().top
  const bridgeTop = stepTop + parseFloat(bridge.top)
  const bridgeBottom = step.getBoundingClientRect().bottom - parseFloat(bridge.bottom)
  expect(bridgeTop - circle.bottom).toBeLessThan(8)
  expect(Math.abs(bridgeBottom - connector.top)).toBeLessThan(1)
})
