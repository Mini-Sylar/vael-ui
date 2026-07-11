import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Collapsible from '../src/components/Collapsible.vue'
import CollapsibleFixture from './fixtures/CollapsibleFixture.vue'

function panel() {
  return document.querySelector<HTMLElement>('.ui-collapsible-panel')!
}

test('opens and closes on trigger click', async () => {
  render(CollapsibleFixture)
  const trigger = page.getByRole('button', { name: 'Show details' })
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(panel().dataset.state).toBe('closed')

  await trigger.click()
  await expect
    .element(page.getByRole('button', { name: 'Hide details' }))
    .toHaveAttribute('aria-expanded', 'true')
  await vi.waitFor(() => expect(panel().dataset.state).toBe('open'))

  await page.getByRole('button', { name: 'Hide details' }).click()
  await expect
    .element(page.getByRole('button', { name: 'Show details' }))
    .toHaveAttribute('aria-expanded', 'false')
  await vi.waitFor(() => expect(panel().dataset.state).toBe('closed'))
})

test('v-model:open is a real two-way binding: trigger click updates the outer ref, and the outer ref drives the panel', async () => {
  const isOpen = ref(false)
  const Wrapper = {
    render: () =>
      h(
        Collapsible,
        { open: isOpen.value, 'onUpdate:open': (v: boolean) => (isOpen.value = v) },
        {
          trigger: ({ open }: { open: boolean }) => h('button', open ? 'Hide' : 'Show'),
          default: () => h('p', 'Panel content.'),
        },
      ),
  }
  render(Wrapper)

  await page.getByRole('button', { name: 'Show' }).click()
  expect(isOpen.value).toBe(true)
  await vi.waitFor(() => expect(panel().dataset.state).toBe('open'))

  isOpen.value = false
  await vi.waitFor(() => expect(panel().dataset.state).toBe('closed'))
})

test('root data-state mirrors the open model', async () => {
  render(CollapsibleFixture, { props: { initialOpen: true } })
  const root = document.querySelector<HTMLElement>('.ui-collapsible')!
  expect(root.dataset.state).toBe('open')

  await page.getByRole('button', { name: 'Hide details' }).click()
  await vi.waitFor(() => expect(root.dataset.state).toBe('closed'))
})

test('disabled prevents toggling on click', async () => {
  render(CollapsibleFixture, { props: { disabled: true } })
  const trigger = page.getByRole('button', { name: 'Show details' })
  await expect.element(trigger).toHaveAttribute('aria-disabled', 'true')

  // Dispatch at the DOM level directly — Playwright's own `.click()` refuses
  // to click an aria-disabled element at all (its actionability check treats
  // aria-disabled like native disabled), which would make this assertion
  // trivially true for the wrong reason. The guard this proves is
  // Collapsible's own onToggle `disabled` check (same technique Button's own
  // "guards re-entrant clicks" test uses).
  trigger.element().dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(trigger.element().getAttribute('aria-expanded')).toBe('false')
  expect(panel().dataset.state).toBe('closed')
})

test('motionCss=false skips the pin/transition dance — no inline block-size transition state', async () => {
  render(CollapsibleFixture, { props: { motionCss: false } })
  await page.getByRole('button', { name: 'Show details' }).click()
  await vi.waitFor(() => expect(panel().dataset.state).toBe('open'))
  expect(panel().style.blockSize).toBe('')
})

test('height pins to a concrete px value while animating, then releases once settled', async () => {
  render(CollapsibleFixture)
  const el = panel()
  expect(el.style.blockSize).toBe('0px')

  await page.getByRole('button', { name: 'Show details' }).click()
  await vi.waitFor(() => {
    const height = Number.parseFloat(el.style.blockSize)
    expect(Number.isFinite(height) && height > 0).toBe(true)
  })
  expect(el.dataset.state).toBe('opening')

  await vi.waitFor(() => expect(el.dataset.state).toBe('open'))
  expect(el.style.blockSize).toBe('')
})

test('exposes real el/panelEl elements', async () => {
  const captured = ref<InstanceType<typeof Collapsible> | null>(null)
  const Wrapper = {
    render: () =>
      h(Collapsible, { ref: captured }, { trigger: () => h('button', 'Show'), default: () => 'x' }),
  }
  render(Wrapper)

  expect(captured.value?.el).toBeInstanceOf(HTMLElement)
  expect(captured.value?.el?.classList.contains('ui-collapsible')).toBe(true)
  expect(captured.value?.panelEl).toBeInstanceOf(HTMLElement)
  expect(captured.value?.panelEl?.classList.contains('ui-collapsible-panel')).toBe(true)
})
