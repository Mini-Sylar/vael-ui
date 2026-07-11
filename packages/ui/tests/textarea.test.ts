import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TextareaFixture from './fixtures/TextareaFixture.vue'
import Textarea from '../src/components/Textarea.vue'

test('v-model round-trips', async () => {
  render(TextareaFixture, {})
  await userEvent.fill(page.getByTestId('plain'), 'hello world')
  await expect.element(page.getByTestId('plain-value')).toHaveTextContent('hello world')
})

test('.lazy modifier commits on change, not on every keystroke', async () => {
  render(TextareaFixture, {})
  const lazyEl = page.getByTestId('lazy')
  await userEvent.click(lazyEl)
  await userEvent.type(lazyEl, 'late')
  await expect.element(page.getByTestId('lazy-value')).toHaveTextContent('')
  await userEvent.keyboard('{Tab}')
  await expect.element(page.getByTestId('lazy-value')).toHaveTextContent('late')
})

test('bottom row renders only when a bottom slot is present', async () => {
  const without = render(Textarea, {})
  expect(without.container.querySelector('.ui-textarea-bottom')).toBeNull()

  const withBottom = render(Textarea, {
    slots: { 'bottom-end': '<button type="button">Send</button>' },
  })
  const bottom = withBottom.container.querySelector('.ui-textarea-bottom')
  expect(bottom).not.toBeNull()
  expect(bottom!.querySelector('button')).not.toBeNull()
})

test('slot geometry: start/end/bottom-start/bottom-end all render inside the frame', async () => {
  const screen = render(Textarea, {
    slots: {
      start: '<span data-testid="start">S</span>',
      end: '<span data-testid="end">E</span>',
      'bottom-start': '<span data-testid="bs">BS</span>',
      'bottom-end': '<span data-testid="be">BE</span>',
    },
  })
  const frame = screen.container.querySelector('.ui-textarea')!
  for (const id of ['start', 'end', 'bs', 'be']) {
    expect(frame.querySelector(`[data-testid="${id}"]`)).not.toBeNull()
  }
})

test('frame click focuses the textarea', async () => {
  const screen = render(Textarea, {})
  const root = screen.container.querySelector<HTMLElement>('.ui-textarea')!
  const textarea = screen.container.querySelector<HTMLTextAreaElement>('.ui-textarea-el')!
  root.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  await vi.waitFor(() => expect(document.activeElement).toBe(textarea))
})

test('autoGrow renders the rows/maxRows custom properties for the native field-sizing path', async () => {
  const screen = render(Textarea, { props: { autoGrow: true, rows: 2, maxRows: 6 } })
  const root = screen.container.querySelector('.ui-textarea')!
  const textarea = screen.container.querySelector<HTMLTextAreaElement>('.ui-textarea-el')!
  expect(root).toHaveClass('ui-textarea--auto-grow')
  expect(textarea.style.getPropertyValue('--ui-textarea-rows')).toBe('2')
  expect(textarea.style.getPropertyValue('--ui-textarea-max-rows')).toBe('6')
})

test('autoGrow JS fallback grows blockSize as the value grows and respects maxRows, when field-sizing is unsupported', async () => {
  const supportsSpy = vi.spyOn(CSS, 'supports').mockReturnValue(false)
  try {
    const screen = render(Textarea, { props: { autoGrow: true, rows: 1 } })
    const textarea = screen.container.querySelector<HTMLTextAreaElement>('.ui-textarea-el')!
    const initialHeight = textarea.getBoundingClientRect().height

    await userEvent.fill(
      page.getByRole('textbox'),
      'line one\nline two\nline three\nline four\nline five',
    )
    await vi.waitFor(() => {
      expect(textarea.getBoundingClientRect().height).toBeGreaterThan(initialHeight)
    })
  } finally {
    supportsSpy.mockRestore()
  }
})
