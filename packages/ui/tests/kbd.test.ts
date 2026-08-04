import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Kbd from '../src/components/Kbd/Kbd.vue'

test('default slot content renders', async () => {
  const screen = render(Kbd, { slots: { default: 'Esc' } })
  await expect.element(screen.getByText('Esc')).toBeInTheDocument()
})

test('renders a real <kbd> element with the base class', async () => {
  const screen = render(Kbd, { slots: { default: 'K' } })
  const el = screen.container.querySelector('kbd.ui-kbd')
  expect(el).not.toBeNull()
})

test('ui.root override merges onto the root', async () => {
  const screen = render(Kbd, { props: { ui: { root: 'my-kbd' } }, slots: { default: 'K' } })
  expect(screen.container.querySelector('.ui-kbd')).toHaveClass('my-kbd')
})

test('exposes el pointing at the real root', async () => {
  const screen = render(Kbd, { slots: { default: 'K' } })
  expect(screen.container.querySelector('.ui-kbd')).not.toBeNull()
})
