import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import PasswordInput from '../src/components/PasswordInput/PasswordInput.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'
import InputNumber from '../src/components/InputNumber/InputNumber.vue'

const display = { display: ({ value }: { value: string }) => h('b', { class: 'mine' }, value) }

test('PasswordInput passes #display through', async () => {
  const screen = await render({
    render: () => h(PasswordInput, { modelValue: 'secret', 'aria-label': 'Password' }, display),
  })
  expect(screen.container.querySelector('.ui-input-display .mine')!.textContent).toBe('secret')
})

test('Combobox passes #display through, covering only the typed text after chips', async () => {
  const items = [
    { label: 'Alpha', value: 'a' },
    { label: 'Beta', value: 'b' },
  ]
  const screen = await render({
    render: () =>
      h(
        Combobox as never,
        { items, multiple: true, modelValue: ['a'], 'aria-label': 'Tags' },
        display,
      ),
  })
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  input.focus()
  input.value = 'be'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await vi.waitFor(() =>
    expect(screen.container.querySelector('.ui-input-display .mine')!.textContent).toBe('be'),
  )
  const chip = screen.container.querySelector('.ui-chip')!.getBoundingClientRect()
  const overlay = screen.container.querySelector('.ui-input-display')!.getBoundingClientRect()
  expect(overlay.left).toBeGreaterThanOrEqual(chip.right)
})

test('InputNumber #display replaces the rolling digits', async () => {
  const screen = await render({
    render: () =>
      h(InputNumber, { modelValue: 42, animated: true, 'aria-label': 'Amount' }, display),
  })
  const overlay = screen.container.querySelector('.ui-input-display')!
  expect(overlay.querySelector('.mine')!.textContent).toBe('42')
  expect(overlay.querySelector('.ui-animated-number')).toBeNull()
})
