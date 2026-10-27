import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import OtpInputFixture from './fixtures/OtpInputFixture.vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import Field from '../src/components/Field/Field.vue'

function basicInput(screen: Awaited<ReturnType<typeof render>>) {
  return screen.container.querySelector<HTMLInputElement>('[data-testid="basic"] .ui-otp-input')!
}
function basicCells(screen: Awaited<ReturnType<typeof render>>) {
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
  const screen = await render(OtpInputFixture, {})
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
  const screen = await render(OtpInputFixture, {})
  const input = basicInput(screen)
  input.focus()
  await vi.waitFor(() => {
    expect(getComputedStyle(input).outlineStyle).toBe('none')
  })
})

test('illegal characters are stripped for numeric type', async () => {
  const screen = await render(OtpInputFixture, { props: { type: 'numeric' } })
  const input = basicInput(screen)
  await userEvent.type(input, 'a1b2c3')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('123')
})

test('alphanumeric type accepts letters and digits', async () => {
  const screen = await render(OtpInputFixture, { props: { type: 'alphanumeric', length: 4 } })
  const input = basicInput(screen)
  await userEvent.type(input, 'A1b2')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('A1b2')
})

test('mask renders bullets in cells while the model keeps the real characters', async () => {
  const screen = await render(OtpInputFixture, { props: { mask: true } })
  const input = basicInput(screen)
  await userEvent.type(input, '42')
  const cells = basicCells(screen)
  expect(cellChar(cells[0]!)).toBe('•')
  expect(cellChar(cells[1]!)).toBe('•')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('42')
})

test('paste of a full code fills every cell and fires complete once', async () => {
  const screen = await render(OtpInputFixture, {})
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

test('clicking a filled cell selects it, so Backspace clears that cell', async () => {
  const screen = await render(OtpInputFixture, {})
  const input = basicInput(screen)
  await userEvent.type(input, '12345')
  const cells = basicCells(screen)
  await clickCell(input, cells[2]!)
  await userEvent.keyboard('{Backspace}')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('1245')
})

test('typing on a clicked cell of a full code replaces that digit', async () => {
  const screen = await render(OtpInputFixture, {})
  const input = basicInput(screen)
  await userEvent.type(input, '123456')
  await clickCell(input, basicCells(screen)[2]!)
  await userEvent.keyboard('9')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('129456')
})

test('a pasted code with separators keeps every digit', async () => {
  const screen = await render(OtpInputFixture, {})
  const input = basicInput(screen)
  input.focus()
  input.value = '123-456'
  input.setSelectionRange(7, 7)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('123456')
  expect(input.value).toBe('123456')
})

test('the overlay input actually has focus after clicking any cell', async () => {
  const screen = await render(OtpInputFixture, {})
  const input = basicInput(screen)
  const cells = basicCells(screen)
  await clickCell(input, cells[3]!)
  expect(document.activeElement).toBe(input)
})

test('disabled blocks the overlay input', async () => {
  const screen = await render(OtpInputFixture, { props: { disabled: true } })
  expect(basicInput(screen).disabled).toBe(true)
})

test('FormData carries the code via the native input name', async () => {
  const screen = await render(OtpInputFixture, {})
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('otp')).toBe('654321')
})

test('the real input carries autocomplete one-time-code and inputmode', async () => {
  const screen = await render(OtpInputFixture, {})
  const input = basicInput(screen)
  expect(input.getAttribute('autocomplete')).toBe('one-time-code')
  expect(input.getAttribute('inputmode')).toBe('numeric')
})

test('cells are aria-hidden decoration', async () => {
  const screen = await render(OtpInputFixture, {})
  const cellsWrap = screen.container.querySelector('[data-testid="basic"] .ui-otp-cells')!
  expect(cellsWrap.getAttribute('aria-hidden')).toBe('true')
})

test('a programmatic model write longer than length is clamped everywhere — cells, native value, completeness', async () => {
  const screen = await render(OtpInputFixture, {})
  await screen.getByTestId('overflow-model').click()
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('123456789')
  await vi.waitFor(() => expect(basicInput(screen).value).toBe('123456'))
  expect(basicCells(screen).map(cellChar).join('')).toBe('123456')
  const root = screen.container.querySelector('[data-testid="basic"] .ui-otp')!
  expect(root.getAttribute('data-state')).toBe('complete')
  await expect.element(screen.getByTestId('complete-count')).toHaveTextContent('1')
})

test('groups puts a separator between each group of cells', async () => {
  const screen = await render(OtpInputFixture, { props: { groups: 3 } })
  const row = screen.container.querySelector('[data-testid="basic"] .ui-otp-cells')!
  const kinds = Array.from(row.querySelectorAll(':scope > :not(.ui-otp-ring)')).map((el) =>
    el.classList.contains('ui-otp-separator') ? '-' : 'c',
  )
  expect(kinds.join('')).toBe('ccc-ccc')
})

test('groups takes explicit group sizes', async () => {
  const screen = await render(OtpInputFixture, { props: { groups: [2, 4] } })
  const row = screen.container.querySelector('[data-testid="basic"] .ui-otp-cells')!
  const kinds = Array.from(row.querySelectorAll(':scope > :not(.ui-otp-ring)')).map((el) =>
    el.classList.contains('ui-otp-separator') ? '-' : 'c',
  )
  expect(kinds.join('')).toBe('cc-cccc')
})

test('#separator replaces the default dash', async () => {
  const screen = await render(OtpInputFixture, {})
  await expect.element(screen.getByTestId('custom-sep')).toHaveTextContent('/0')
  expect(screen.container.querySelectorAll('[data-testid="custom-sep"]').length).toBe(1)
})

test('clicking a cell after a separator still targets that cell', async () => {
  const screen = await render(OtpInputFixture, { props: { groups: 3 } })
  const input = basicInput(screen)
  await userEvent.type(input, '123456')
  await clickCell(input, basicCells(screen)[4]!)
  await userEvent.keyboard('9')
  await expect.element(screen.getByTestId('basic-value')).toHaveTextContent('123496')
})

test('aria-label, aria-labelledby and aria-describedby name the input, not the wrapper', async () => {
  const screen = await render({
    components: { OtpInput, Field },
    template: `<div>
      <span id="otp-label">Backup code</span><span id="otp-hint">Sent by SMS</span>
      <OtpInput data-testid="labelled" aria-label="Verification code" aria-describedby="otp-hint" />
      <OtpInput aria-labelledby="otp-label" />
      <Field label="Login code" description="Check your email"><OtpInput /></Field>
    </div>`,
  })
  const input = screen.getByRole('textbox', { name: 'Verification code' })
  await expect.element(input).toBeInTheDocument()
  expect(input.element().getAttribute('aria-describedby')).toBe('otp-hint')
  const root = screen.container.querySelector('[data-testid="labelled"]')!
  expect(root.hasAttribute('aria-label')).toBe(false)
  await expect.element(screen.getByRole('textbox', { name: 'Backup code' })).toBeInTheDocument()
  const fieldInput = screen.getByRole('textbox', { name: 'Login code' })
  await expect.element(fieldInput).toHaveAccessibleDescription('Check your email')
})

test('variant="field" boxes the whole code and a placeholder marks each empty cell', async () => {
  const screen = await render(OtpInput, {
    props: { modelValue: '12', variant: 'field', placeholder: '0', 'aria-label': 'Code' },
  })
  expect(screen.container.querySelector('.ui-otp')).toHaveClass('ui-otp--field')
  const chars = [...screen.container.querySelectorAll<HTMLElement>('.ui-otp-cell-char')]
  expect(chars.map((c) => c.textContent)).toEqual(['1', '2', '0', '0', '0', '0'])
  expect(chars[0].classList.contains('ui-otp-cell-char--placeholder')).toBe(false)
  expect(chars[2].classList.contains('ui-otp-cell-char--placeholder')).toBe(true)
  // Cells inside the box carry no border of their own.
  const cell = screen.container.querySelector<HTMLElement>('.ui-otp-cell')!
  expect(getComputedStyle(cell).borderTopColor).toBe('rgba(0, 0, 0, 0)')
})

test('one ring glides to the active cell and carries the caret while it is empty', async () => {
  const screen = await render(OtpInputFixture)
  const otp = screen.container.querySelector<HTMLElement>('[data-testid="basic"]')!
  const input = otp.querySelector('input')!
  const ring = otp.querySelector<HTMLElement>('.ui-otp-ring')!
  input.focus()
  await vi.waitFor(() => expect(getComputedStyle(ring).opacity).toBe('1'))
  await userEvent.keyboard('12')
  await vi.waitFor(() => {
    const cell = otp.querySelector<HTMLElement>('.ui-otp-cell[data-active]')!
    expect(cell).toBe(otp.querySelectorAll('.ui-otp-cell')[2])
    expect(parseFloat(ring.style.translate)).toBe(cell.offsetLeft)
  })
  expect(ring.hasAttribute('data-caret')).toBe(true)
  input.blur()
  await vi.waitFor(() => expect(getComputedStyle(ring).opacity).toBe('0'))
})

test('clearing the code from your own code, while the field has focus, moves the active cell back to the first', async () => {
  const { h, shallowRef } = await import('vue')
  const code = shallowRef('')
  const screen = await render(() =>
    h(OtpInput, {
      modelValue: code.value,
      'onUpdate:modelValue': (v: string) => (code.value = v),
      length: 4,
      'aria-label': 'Code',
    }),
  )
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  input.focus()
  await userEvent.keyboard('9999')
  const active = () =>
    [...screen.container.querySelectorAll('.ui-otp-cell')].findIndex((cell) =>
      cell.hasAttribute('data-active'),
    )
  await vi.waitFor(() => expect(active()).toBe(3))
  code.value = ''
  input.focus()
  await vi.waitFor(() => expect(active()).toBe(0))
})
