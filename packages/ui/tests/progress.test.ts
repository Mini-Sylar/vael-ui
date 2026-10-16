import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Progress from '../src/components/Progress/Progress.vue'

const bar = (root: HTMLElement) => root.querySelector<HTMLElement>('.ui-progress')!

test.each([
  [40, '40', 'loading'],
  [150, '100', 'complete'],
  [100, '100', 'complete'],
  [-20, '0', 'loading'],
  [null, null, 'indeterminate'],
])('value %s gives aria-valuenow %s and data-state="%s"', async (value, valuenow, state) => {
  const screen = await render(Progress, { props: { value } })
  const el = bar(screen.container)
  expect(el.getAttribute('aria-valuemin')).toBe('0')
  expect(el.getAttribute('aria-valuemax')).toBe('100')
  expect(el.getAttribute('aria-valuenow')).toBe(valuenow)
  expect(el.getAttribute('data-state')).toBe(state)
})

test('label sets aria-label; variant and size render as classes', async () => {
  const screen = await render(Progress, {
    props: { value: 50, label: 'Uploading', variant: 'danger', size: 'sm' },
  })
  const el = bar(screen.container)
  await expect.element(el).toHaveAttribute('aria-label', 'Uploading')
  expect(el).toHaveClass('ui-progress--danger', 'ui-progress--sm')
})

test('exposes el and fillEl for direct DOM/animation-lib access', async () => {
  const captured = ref<InstanceType<typeof Progress> | null>(null)
  const Wrapper = { render: () => h(Progress, { value: 50, ref: captured }) }
  await render(Wrapper)
  const fillEl = captured.value?.fillEl
  expect(captured.value?.el).toBeInstanceOf(HTMLElement)
  expect(fillEl).toBeInstanceOf(HTMLElement)
  expect(fillEl?.classList.contains('ui-progress-fill')).toBe(true)
})
