import '../src/style.css'
import { h, ref } from 'vue'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
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
  const screen = render(Stepper, { props: { items, modelValue: 1 } })
  const steps = screen.container.querySelectorAll('.ui-stepper-step')
  expect(steps[0]!.getAttribute('data-state')).toBe('completed')
  expect(steps[1]!.getAttribute('data-state')).toBe('active')
  expect(steps[2]!.getAttribute('data-state')).toBe('upcoming')
})

test('motionCss=false disables the check/number swap transition (no ui-stepper-check-* class applied)', async () => {
  const screen = render(Stepper, { props: { items, modelValue: 1, motionCss: false } })
  const check = screen.container.querySelector('.ui-stepper-step svg')!
  expect(check.getAttribute('class')).toBeNull()
})

test('connectors before the active step are marked filled', async () => {
  const screen = render(Stepper, { props: { items, modelValue: 2 } })
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
  const screen = render(Wrapper)
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
  const screen = render(Wrapper)
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
  const screen = render(Wrapper)
  const last = screen.container.querySelectorAll('.ui-stepper-trigger')[3]!
  expect(last.tagName).toBe('BUTTON')
  await userEvent.click(last)
  expect(modelValue.value).toBe(3)
})

test('a disabled step never becomes clickable, even with linear=false', async () => {
  const screen = render(Stepper, { props: { items, linear: false, modelValue: 0 } })
  const review = screen.container.querySelectorAll('.ui-stepper-trigger')[2]!
  expect(review.tagName).toBe('DIV')
})

test('clickable=false renders every trigger as a non-interactive div', async () => {
  const screen = render(Stepper, { props: { items, clickable: false, modelValue: 1 } })
  const triggers = screen.container.querySelectorAll('.ui-stepper-trigger')
  triggers.forEach((el) => expect(el.tagName).toBe('DIV'))
})

test('item slot fully overrides the default circle/label markup', async () => {
  const screen = render(Stepper, {
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
