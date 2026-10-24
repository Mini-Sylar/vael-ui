import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Collapsible from '../src/components/Collapsible/Collapsible.vue'
import CollapsibleFixture from './fixtures/CollapsibleFixture.vue'

function panel() {
  return document.querySelector<HTMLElement>('.ui-collapsible-panel')!
}

test('opens and closes on trigger click', async () => {
  await render(CollapsibleFixture)
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
  await render(Wrapper)

  await page.getByRole('button', { name: 'Show' }).click()
  expect(isOpen.value).toBe(true)
  await vi.waitFor(() => expect(panel().dataset.state).toBe('open'))

  isOpen.value = false
  await vi.waitFor(() => expect(panel().dataset.state).toBe('closed'))
})

test('root data-state mirrors the open model', async () => {
  await render(CollapsibleFixture, { props: { initialOpen: true } })
  const root = document.querySelector<HTMLElement>('.ui-collapsible')!
  expect(root.dataset.state).toBe('open')

  await page.getByRole('button', { name: 'Hide details' }).click()
  await vi.waitFor(() => expect(root.dataset.state).toBe('closed'))
})

test('disabled prevents toggling on click', async () => {
  await render(CollapsibleFixture, { props: { disabled: true } })
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

test('motion=false skips the pin/transition dance — no inline block-size transition state', async () => {
  await render(CollapsibleFixture, { props: { motion: false } })
  await page.getByRole('button', { name: 'Show details' }).click()
  await vi.waitFor(() => expect(panel().dataset.state).toBe('open'))
  expect(panel().style.blockSize).toBe('')
})

test('exposes real el/panelEl elements', async () => {
  const captured = ref<InstanceType<typeof Collapsible> | null>(null)
  const Wrapper = {
    render: () =>
      h(Collapsible, { ref: captured }, { trigger: () => h('button', 'Show'), default: () => 'x' }),
  }
  await render(Wrapper)

  expect(captured.value?.el).toBeInstanceOf(HTMLElement)
  expect(captured.value?.el?.classList.contains('ui-collapsible')).toBe(true)
  expect(captured.value?.panelEl).toBeInstanceOf(HTMLElement)
  expect(captured.value?.panelEl?.classList.contains('ui-collapsible-panel')).toBe(true)
})

test('a themed duration longer than 240ms runs to the end instead of snapping open', async () => {
  document.documentElement.style.setProperty('--ui-duration-enter', '800ms')
  try {
    await render(CollapsibleFixture)
    await page.getByRole('button', { name: 'Show details' }).click()
    await vi.waitFor(() => expect(panel().dataset.state).toBe('opening'))
    await new Promise((resolve) => setTimeout(resolve, 400))
    // Still mid-transition: pinned to a px height, not released to auto.
    expect(panel().dataset.state).toBe('opening')
    expect(panel().style.blockSize).not.toBe('')
    await vi.waitFor(() => expect(panel().dataset.state).toBe('open'), { timeout: 2000 })
  } finally {
    document.documentElement.style.removeProperty('--ui-duration-enter')
  }
})

test('a trigger slot that swaps to a different button gets aria-expanded and aria-controls', async () => {
  const fancy = ref(false)
  const screen = await render(() =>
    h(Collapsible, null, {
      trigger: () =>
        fancy.value
          ? h('button', { key: 'b', type: 'button', 'data-testid': 'b' }, 'B')
          : h('button', { key: 'a', type: 'button', 'data-testid': 'a' }, 'A'),
      default: () => 'Body',
    }),
  )
  expect(screen.container.querySelector('[data-testid="a"]')!.getAttribute('aria-expanded')).toBe(
    'false',
  )
  fancy.value = true
  await vi.waitFor(() => {
    const b = screen.container.querySelector('[data-testid="b"]')!
    expect(b.getAttribute('aria-expanded')).toBe('false')
    expect(b.getAttribute('aria-controls')).toBeTruthy()
  })
})
