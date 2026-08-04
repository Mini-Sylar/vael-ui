import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Tag from '../src/components/Tag/Tag.vue'

test('default slot content renders', async () => {
  const screen = render(Tag, { slots: { default: 'paid' } })
  await expect.element(screen.getByText('paid')).toBeInTheDocument()
})

test('default variant/size classes apply', async () => {
  const screen = render(Tag)
  const el = screen.container.querySelector('.ui-tag')!
  expect(el).toHaveClass('ui-tag--muted')
  expect(el).toHaveClass('ui-tag--md')
})

test('variant classes render', async () => {
  const screen = render(Tag, { props: { variant: 'success' } })
  expect(screen.container.querySelector('.ui-tag')).toHaveClass('ui-tag--success')
})

test('size classes render', async () => {
  const screen = render(Tag, { props: { size: 'sm' } })
  expect(screen.container.querySelector('.ui-tag')).toHaveClass('ui-tag--sm')
})

test('pill renders the pill modifier class', async () => {
  const screen = render(Tag, { props: { pill: true } })
  expect(screen.container.querySelector('.ui-tag')).toHaveClass('ui-tag--pill')
})

test('no #icon slot: no icon wrapper renders', async () => {
  const screen = render(Tag, { slots: { default: 'active' } })
  expect(screen.container.querySelector('.ui-tag-icon')).toBeNull()
})

test('#icon slot renders inside the icon wrapper', async () => {
  const screen = render(Tag, { slots: { default: 'active', icon: '<span data-testid="dot" />' } })
  const icon = screen.container.querySelector('.ui-tag-icon')!
  expect(icon).not.toBeNull()
  expect(icon.querySelector('[data-testid="dot"]')).not.toBeNull()
})

test('exposes el pointing at the real root', async () => {
  const screen = render(Tag, { slots: { default: 'active' } })
  const el = screen.container.querySelector('.ui-tag')
  expect(el).not.toBeNull()
})
