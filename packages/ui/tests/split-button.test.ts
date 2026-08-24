import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import SplitButtonFixture from './fixtures/SplitButtonFixture.vue'
import SplitButton from '../src/components/SplitButton/SplitButton.vue'

beforeEach(() => {
  // Teleported Menu positioners can outlive a fixture torn down mid-transition.
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function deferredTask() {
  let resolveTask!: () => void
  const task = () => new Promise<void>((resolve) => (resolveTask = resolve))
  return { task, resolve: () => resolveTask() }
}

test('main button click fires @click and does not open the menu', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const main = scope.querySelector<HTMLButtonElement>('.ui-split-button-main')!

  await userEvent.click(main)
  await expect.element(screen.getByTestId('click-count')).toHaveTextContent('1')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('chevron click opens the dropdown independently of the main action', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  await userEvent.click(trigger)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  await expect.element(screen.getByTestId('click-count')).toHaveTextContent('0')
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()
})

test('picking a dropdown item fires @select, closes the menu, and never fires the main @click', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  await userEvent.click(trigger)
  await screen.getByRole('menuitem', { name: 'Save a Copy' }).click()

  await expect.element(screen.getByTestId('last-action')).toHaveTextContent('Save a Copy')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await expect.element(screen.getByTestId('click-count')).toHaveTextContent('0')
})

test('main and chevron are two separately-focusable tab stops', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const main = scope.querySelector<HTMLButtonElement>('.ui-split-button-main')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  main.focus()
  expect(document.activeElement).toBe(main)
  await userEvent.keyboard('{Tab}')
  expect(document.activeElement).toBe(trigger)
})

test('Enter on the focused chevron opens the menu with the first item focused (native button + Menu wiring, zero extra code)', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  trigger.focus()
  await userEvent.keyboard('{Enter}')
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Save As...'))
})

test('once open, ArrowDown/ArrowUp roving focus and Home/End work exactly like Menu (its own keyboard handling, unmodified)', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  await userEvent.click(trigger)
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Save As...'))

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Save a Copy'))

  await userEvent.keyboard('{End}')
  // "Duplicate" is disabled — End lands on the last ENABLED item, still "Save a Copy".
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Save a Copy'))
})

test('disabled disables both the main and chevron buttons', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="disabled-wrap"]')!
  const main = scope.querySelector<HTMLButtonElement>('.ui-split-button-main')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  expect(main.disabled).toBe(true)
  expect(trigger.disabled).toBe(true)
  // A native `disabled` button doesn't dispatch click at all — .click() is a
  // no-op the same way a real pointer click would be, no userEvent bypass needed.
  main.click()
  await expect.element(screen.getByTestId('disabled-click-count')).toHaveTextContent('0')
})

test('@click supports a promise-returning handler — Button auto-loading runs on the main button', async () => {
  // onClick lands on the real inner <Button> (mainAttrs forwarding), so its
  // own useAsyncLoading tracks this exactly like a plain <Button @click>
  // would — no bespoke loading logic in SplitButton itself.
  const { task, resolve } = deferredTask()
  const screen = render(SplitButton, {
    props: { items: [{ label: 'One', value: 'one' }], onClick: () => task() },
    slots: { default: () => 'Save' },
  })
  const main = screen.container.querySelector<HTMLButtonElement>('.ui-split-button-main')!

  await userEvent.click(main)
  await expect.element(main).toHaveClass('ui-button--loading')
  await expect.element(main).toHaveAttribute('aria-disabled', 'true')

  resolve()
  await expect.element(main).not.toHaveClass('ui-button--loading')
})

test('chevron aria-label defaults to the localized message and is overridable via triggerLabel', async () => {
  const screen = render(SplitButtonFixture)
  const defaultScope = screen.container.querySelector('[data-testid="basic"]')!
  const defaultTrigger = defaultScope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!
  expect(defaultTrigger.getAttribute('aria-label')).toBe('More actions')

  const customScope = screen.container.querySelector('[data-testid="custom-label"]')!
  const customTrigger = customScope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!
  expect(customTrigger.getAttribute('aria-label')).toBe('Save options')
})

test('Menu wires aria-haspopup/aria-expanded onto the real chevron button', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  // Menu's own watchEffect wires these onto the real focusable element it
  // finds inside the #trigger slot — it reactively re-runs the first time
  // once the template ref actually binds post-mount, one microtask after
  // render() returns synchronously.
  await vi.waitFor(() => expect(trigger.getAttribute('aria-haspopup')).toBe('menu'))
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  await userEvent.click(trigger)
  await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('true'))
})

test('#item slot overrides row content while keeping selection behavior', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="item-slot"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  await userEvent.click(trigger)
  await expect.element(screen.getByTestId('custom-row').first()).toHaveTextContent('Save As...!')
})

test('header and footer slots forward through to the dropdown Menu', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="header-footer"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  await userEvent.click(trigger)
  await expect.element(screen.getByTestId('split-button-header')).toBeInTheDocument()
  await expect.element(screen.getByTestId('split-button-footer')).toBeInTheDocument()
})

test('root data-state reflects the dropdown open state', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const root = scope.querySelector<HTMLElement>('.ui-split-button')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  expect(root.dataset.state).toBe('closed')
  await userEvent.click(trigger)
  await vi.waitFor(() => expect(root.dataset.state).toBe('open'))
})

test('variant and size mirror onto both buttons', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="variant-outline"]')!
  const main = scope.querySelector<HTMLButtonElement>('.ui-split-button-main')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  for (const el of [main, trigger]) {
    expect(el.className).toContain('ui-button--outline')
    expect(el.className).toContain('ui-button--sm')
  }
})

test('exposes el/mainEl/triggerEl and imperative open()/close()', async () => {
  const screen = render(SplitButtonFixture)
  await expect.element(screen.getByTestId('imperative-refs')).toHaveTextContent('ready')

  await screen.getByTestId('imperative-open').click()
  await expect.element(screen.getByRole('menu')).toBeInTheDocument()

  await screen.getByTestId('imperative-close').click()
  await vi.waitFor(() => expect(screen.container.querySelector('.ui-menu-positioner')).toBeNull())
})

// Regression test: SplitButton's own closeOnEsc/closeOnOutside/scrollFade
// props had no default, so an unset boolean-typed prop was auto-coerced to
// `false` by Vue (not left `undefined`) and forwarded straight to Menu,
// silently overriding Menu's own `true` defaults for all three — dismissal
// via outside click or Escape never fired.
test('clicking outside closes the dropdown (Menu default is not silently forced off)', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  await userEvent.click(trigger)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await userEvent.click(document.body)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('Escape closes the dropdown (same closeOnEsc default-forwarding fix)', async () => {
  const screen = render(SplitButtonFixture)
  const scope = screen.container.querySelector('[data-testid="basic"]')!
  const trigger = scope.querySelector<HTMLButtonElement>('.ui-split-button-trigger')!

  await userEvent.click(trigger)
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')

  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})
