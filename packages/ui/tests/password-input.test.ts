import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import PasswordInputFixture from './fixtures/PasswordInputFixture.vue'

function basicInput(screen: ReturnType<typeof render>) {
  return screen.container.querySelector<HTMLInputElement>('[data-testid="basic"] .ui-input-el')!
}
function toggleButton(screen: ReturnType<typeof render>) {
  return screen.container.querySelector<HTMLButtonElement>(
    '[data-testid="basic"] .ui-password-input-toggle',
  )
}
// Popover teleports its panel to document.body by default, so inline-mode
// hints (still inside screen.container) and popover-mode hints (outside it)
// both need a document-scoped query, not one scoped to screen.container.
function hintItems() {
  return Array.from(document.querySelectorAll<HTMLElement>('.ui-password-input-hint-item'))
}

test('v-model round-trips on every keystroke, type starts as password', async () => {
  const screen = render(PasswordInputFixture, {})
  const input = basicInput(screen)
  expect(input.type).toBe('password')
  await userEvent.type(input, 'hunter2')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('hunter2')
})

test('reveal toggle flips type and its own aria-label, and v-model:visible follows it', async () => {
  const screen = render(PasswordInputFixture, {})
  const input = basicInput(screen)
  const toggle = toggleButton(screen)!
  expect(toggle.getAttribute('aria-label')).toBe('Show password')

  await userEvent.click(toggle)
  expect(input.type).toBe('text')
  expect(toggle.getAttribute('aria-label')).toBe('Hide password')
  await expect.element(screen.getByTestId('visible')).toHaveTextContent('true')

  await userEvent.click(toggle)
  expect(input.type).toBe('password')
  await expect.element(screen.getByTestId('visible')).toHaveTextContent('false')
})

test('revealable=false hides the toggle entirely', async () => {
  const screen = render(PasswordInputFixture, { props: { revealable: false } })
  expect(toggleButton(screen)).toBeNull()
})

test('default rules: checklist rows flip data-passed as the value satisfies each one', async () => {
  const screen = render(PasswordInputFixture, {})
  const input = basicInput(screen)
  let items = hintItems()
  expect(items).toHaveLength(3)
  expect(items.every((el) => el.dataset.passed === undefined)).toBe(true)

  await userEvent.type(input, 'Abcdefg1')
  items = hintItems()
  expect(items.every((el) => el.dataset.passed === 'true')).toBe(true)
})

test('no rules and no #hint slot: the hint does not mount at all', async () => {
  render(PasswordInputFixture, { props: { rules: [] } })
  expect(hintItems()).toHaveLength(0)
})

test('custom rules prop overrides the built-in defaults', async () => {
  const rules = [{ label: 'Contains "ok"', test: (v: string) => v.includes('ok') }]
  const screen = render(PasswordInputFixture, { props: { rules } })
  const input = basicInput(screen)
  let items = hintItems()
  expect(items).toHaveLength(1)
  expect(items[0]!.textContent).toContain('Contains "ok"')

  await userEvent.type(input, 'ok')
  items = hintItems()
  expect(items[0]!.dataset.passed).toBe('true')
})

test('hintPlacement="inline" renders the hint immediately, unfocused', async () => {
  render(PasswordInputFixture, { props: { hintPlacement: 'inline' } })
  expect(hintItems()).toHaveLength(3)
})

test('hintPlacement="popover" only mounts the hint while the input is focused', async () => {
  const screen = render(PasswordInputFixture, { props: { hintPlacement: 'popover' } })
  expect(hintItems()).toHaveLength(0)

  const input = basicInput(screen)
  input.focus()
  await expect.poll(() => hintItems().length).toBe(3)

  input.blur()
  await expect.poll(() => hintItems().length).toBe(0)
})

test('hintPlacement="none" renders no hint at all', async () => {
  const screen = render(PasswordInputFixture, { props: { hintPlacement: 'none' } })
  const input = basicInput(screen)
  input.focus()
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(hintItems()).toHaveLength(0)
})

test('#hint slot override receives the correct results shape and replaces the default checklist', async () => {
  const screen = render(PasswordInputFixture, { props: { customHint: true } })
  expect(hintItems()).toHaveLength(0)
  const custom = screen.container.querySelectorAll('[data-testid="custom-hint"] li')
  expect(custom).toHaveLength(3)
})

test('wrapped in Field: aria-describedby wires to the error message', async () => {
  const screen = render(PasswordInputFixture, { props: { fieldError: 'Too short' } })
  const fieldInput = screen.container.querySelector<HTMLInputElement>('.ui-field .ui-input-el')!
  const describedBy = fieldInput.getAttribute('aria-describedby')
  expect(describedBy).toBeTruthy()
  const errorEl = screen.container.querySelector(`#${describedBy}`)
  expect(errorEl?.textContent).toContain('Too short')
})
