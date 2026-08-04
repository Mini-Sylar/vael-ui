import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Progress from '../src/components/Progress/Progress.vue'

const bar = (root: HTMLElement) => root.querySelector<HTMLElement>('.ui-progress')!

test('aria-valuenow reflects value, clamped to max', async () => {
  const screen = render(Progress, { props: { value: 40 } })
  const el = bar(screen.container)
  await expect.element(el).toHaveAttribute('aria-valuenow', '40')
  await expect.element(el).toHaveAttribute('aria-valuemin', '0')
  await expect.element(el).toHaveAttribute('aria-valuemax', '100')
})

test('value above max clamps aria-valuenow to max', async () => {
  const screen = render(Progress, { props: { value: 150, max: 100 } })
  await expect.element(bar(screen.container)).toHaveAttribute('aria-valuenow', '100')
})

test('value below 0 clamps aria-valuenow to 0', async () => {
  const screen = render(Progress, { props: { value: -20 } })
  await expect.element(bar(screen.container)).toHaveAttribute('aria-valuenow', '0')
})

test('indeterminate (value null) drops aria-valuenow and sets data-state', async () => {
  const screen = render(Progress, { props: { value: null } })
  const el = bar(screen.container)
  expect(el.hasAttribute('aria-valuenow')).toBe(false)
  expect(el.getAttribute('data-state')).toBe('indeterminate')
})

test('value at max sets data-state="complete"', async () => {
  const screen = render(Progress, { props: { value: 100, max: 100 } })
  expect(bar(screen.container).getAttribute('data-state')).toBe('complete')
})

test('value below max sets data-state="loading"', async () => {
  const screen = render(Progress, { props: { value: 30, max: 100 } })
  expect(bar(screen.container).getAttribute('data-state')).toBe('loading')
})

test('variant and size classes render', async () => {
  const screen = render(Progress, { props: { value: 50, variant: 'danger', size: 'sm' } })
  const el = bar(screen.container)
  expect(el).toHaveClass('ui-progress--danger')
  expect(el).toHaveClass('ui-progress--sm')
})

test('label sets aria-label', async () => {
  const screen = render(Progress, { props: { value: 50, label: 'Uploading' } })
  await expect.element(bar(screen.container)).toHaveAttribute('aria-label', 'Uploading')
})

test('exposes el and fillEl for direct DOM/animation-lib access', async () => {
  const captured = ref<InstanceType<typeof Progress> | null>(null)
  const Wrapper = { render: () => h(Progress, { value: 50, ref: captured }) }
  render(Wrapper)
  const fillEl = captured.value?.fillEl
  expect(captured.value?.el).toBeInstanceOf(HTMLElement)
  expect(fillEl).toBeInstanceOf(HTMLElement)
  expect(fillEl?.classList.contains('ui-progress-fill')).toBe(true)
})
