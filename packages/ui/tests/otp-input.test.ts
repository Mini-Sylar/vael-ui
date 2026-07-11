import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import OtpInputFixture from './fixtures/OtpInputFixture.vue'

function basicInput(screen: ReturnType<typeof render>) {
  return screen.container.querySelector<HTMLInputElement>('[data-testid="basic"] .ui-otp-input')!
}
function basicCells(screen: ReturnType<typeof render>) {
  return Array.from(
    screen.container.querySelectorAll<HTMLElement>('[data-testid="basic"] .ui-otp-cell'),
  )
}
function cellChar(cell: HTMLElement) {
  return cell.querySelector('.ui-otp-cell-char')?.textContent ?? ''
}
// A real click always hit-tests to the overlay input (it's the topmost
// element over the whole row) — replicate that by clicking the INPUT
// directly at the pixel offset of the target cell's center, rather than
// clicking the cell locator itself. Playwright's `force: true` on the cell
// locator dispatches straight at that node instead of doing real coordinate
// hit-testing, so it never reaches the input the way an actual user click
// would.
async function clickCell(input: HTMLInputElement, cell: HTMLElement) {
  const cellRect = cell.getBoundingClientRect()
  const inputRect = input.getBoundingClientRect()
  await userEvent.click(input, {
    position: {
      x: cellRect.left - inputRect.left + cellRect.width / 2,
      y: cellRect.top - inputRect.top + cellRect.height / 2,
    },
  })
}

test('typing fills cells sequentially', async () => {
  const screen = render(OtpInputFixture, {})
  const input = basicInput(screen)
  await userEvent.type(input, '123')
  const cells = basicCells(screen)
  expect(cellChar(cells[0]!)).toBe('1')
  expect(cellChar(cells[1]!)).toBe('2')
  expect(cellChar(cells[2]!)).toBe('3')
  expect(cellChar(cells[3]!)).toBe('')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('123')
})

test("the real overlay input's own native focus ring is suppressed — the per-cell data-active/data-focus-visible styling is the only visible focus indicator", async () => {
  const screen = render(OtpInputFixture, {})
  const input = basicInput(screen)
  input.focus()
  await vi.waitFor(() => {
    expect(getComputedStyle(input).outlineStyle).toBe('none')
  })
})

test('illegal characters are stripped for numeric type', async () => {
  const screen = render(OtpInputFixture, { props: { type: 'numeric' } })
  const input = basicInput(screen)
  await userEvent.type(input, 'a1b2c3')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('123')
})

test('alphanumeric type accepts letters and digits', async () => {
  const screen = render(OtpInputFixture, { props: { type: 'alphanumeric', length: 4 } })
  const input = basicInput(screen)
  await userEvent.type(input, 'A1b2')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('A1b2')
})

test('mask renders bullets in cells while the model keeps the real characters', async () => {
  const screen = render(OtpInputFixture, { props: { mask: true } })
  const input = basicInput(screen)
  await userEvent.type(input, '42')
  const cells = basicCells(screen)
  expect(cellChar(cells[0]!)).toBe('•')
  expect(cellChar(cells[1]!)).toBe('•')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('42')
})

test('paste of a full code fills every cell and fires complete once', async () => {
  const screen = render(OtpInputFixture, {})
  const input = basicInput(screen)
  input.focus()
  // A real paste inserts the clipboard text into the input's own value
  // BEFORE firing 'input' with inputType 'insertFromPaste' — replicate that
  // DOM effect directly, since a synthetically dispatched ClipboardEvent
  // doesn't trigger a real browser's paste-insertion default action.
  input.value = '123456'
  input.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: '123456' }),
  )
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('123456')
  await expect.element(screen.getByTestId('complete-count')).toHaveTextContent('1')

  // A no-op re-render (parent updates without the value changing) must not
  // re-fire complete.
  await screen.rerender({})
  await expect.element(screen.getByTestId('complete-count')).toHaveTextContent('1')
})

test('clicking a cell moves the caret there, so Backspace edits mid-string', async () => {
  const screen = render(OtpInputFixture, {})
  const input = basicInput(screen)
  await userEvent.type(input, '12345')
  const cells = basicCells(screen)
  await clickCell(input, cells[2]!)
  await userEvent.keyboard('{Backspace}')
  // Backspace at caret index 2 removes the character just before it (index 1).
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('1345')
})

test('the overlay input actually has focus after clicking any cell', async () => {
  const screen = render(OtpInputFixture, {})
  const input = basicInput(screen)
  const cells = basicCells(screen)
  await clickCell(input, cells[3]!)
  expect(document.activeElement).toBe(input)
})

test('disabled blocks the overlay input', async () => {
  const screen = render(OtpInputFixture, { props: { disabled: true } })
  expect(basicInput(screen).disabled).toBe(true)
})

test('FormData carries the code via the native input name', async () => {
  const screen = render(OtpInputFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('otp')).toBe('654321')
})

test('the real input carries autocomplete one-time-code and inputmode', async () => {
  const screen = render(OtpInputFixture, {})
  const input = basicInput(screen)
  expect(input.getAttribute('autocomplete')).toBe('one-time-code')
  expect(input.getAttribute('inputmode')).toBe('numeric')
})

test('cells are aria-hidden decoration', async () => {
  const screen = render(OtpInputFixture, {})
  const cellsWrap = screen.container.querySelector('[data-testid="basic"] .ui-otp-cells')!
  expect(cellsWrap.getAttribute('aria-hidden')).toBe('true')
})

test('a programmatic model write longer than length is clamped everywhere — cells, native value, completeness', async () => {
  const screen = render(OtpInputFixture, {})
  await screen.getByTestId('overflow-model').click()
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('123456789')
  await vi.waitFor(() => expect(basicInput(screen).value).toBe('123456'))
  expect(basicCells(screen).map(cellChar).join('')).toBe('123456')
  const root = screen.container.querySelector('[data-testid="basic"] .ui-otp')!
  expect(root.getAttribute('data-state')).toBe('complete')
  await expect.element(screen.getByTestId('complete-count')).toHaveTextContent('1')
})
