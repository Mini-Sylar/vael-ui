import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import PasswordInput from '../src/components/PasswordInput/PasswordInput.vue'
import Toaster from '../src/components/Toaster/Toaster.vue'
import Tour from '../src/components/Tour/Tour.vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'

// Components with more than one root (or a Teleport root) route attrs by hand.

test('PasswordInput puts class and style on its wrapper and other attrs on the input', async () => {
  const screen = await render(PasswordInput, {
    attrs: { class: 'extra', style: 'margin-top: 3px', id: 'pw', 'data-testid': 'pw-input' },
  })
  const root = screen.container.querySelector('.ui-password-input')!
  expect(root.classList.contains('extra')).toBe(true)
  expect((root as HTMLElement).style.marginTop).toBe('3px')
  const input = screen.container.querySelector('input')!
  expect(input.id).toBe('pw')
  expect(input.dataset.testid).toBe('pw-input')
  expect(input.classList.contains('extra')).toBe(false)
})

test('Toaster puts attrs on the toast region', async () => {
  const screen = await render(Toaster, { attrs: { class: 'extra', 'data-testid': 'toasts' } })
  await vi.waitFor(() => {
    const region = document.querySelector('.ui-toaster')!
    expect(region.classList.contains('extra')).toBe(true)
    expect(region.getAttribute('data-testid')).toBe('toasts')
  })
  screen.unmount()
})

test('Tour puts attrs on its panel', async () => {
  const target = document.createElement('div')
  target.textContent = 'target'
  document.body.append(target)
  const screen = await render(Tour, {
    props: { open: true, steps: [{ target, title: 'Step' }] },
    attrs: { class: 'extra' },
  })
  await vi.waitFor(() => expect(document.querySelector('.ui-popover-panel.extra')).not.toBeNull())
  screen.unmount()
  target.remove()
})

test.each([
  ['Select', Select],
  ['Combobox', Combobox],
] as const)('%s applies ui.empty to the empty state', async (_, Comp) => {
  const screen = await render(Comp as never, {
    // Generic components: the shared props don't narrow through the union.
    props: { items: [], open: true, ui: { empty: 'custom-empty' } } as never,
  })
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-select-empty.custom-empty')).not.toBeNull(),
  )
  screen.unmount()
})
