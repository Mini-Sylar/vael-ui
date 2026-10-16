import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Tag from '../src/components/Tag/Tag.vue'

test('default slot content renders', async () => {
  const screen = await render(Tag, { slots: { default: 'paid' } })
  await expect.element(screen.getByText('paid')).toBeInTheDocument()
})

test('variant, size and pill modifier classes render, defaulting to muted/md', async () => {
  const screen = await render(Tag)
  const el = screen.container.querySelector('.ui-tag')!
  expect(el).toHaveClass('ui-tag--muted', 'ui-tag--md')
  expect(el).not.toHaveClass('ui-tag--pill')

  await screen.rerender({ variant: 'success', size: 'sm', pill: true })
  expect(el).toHaveClass('ui-tag--success', 'ui-tag--sm', 'ui-tag--pill')
})

test('no #icon slot: no icon wrapper renders', async () => {
  const screen = await render(Tag, { slots: { default: 'active' } })
  expect(screen.container.querySelector('.ui-tag-icon')).toBeNull()
})

test('#icon slot renders inside the icon wrapper', async () => {
  const screen = await render(Tag, {
    slots: { default: 'active', icon: '<span data-testid="dot" />' },
  })
  const icon = screen.container.querySelector('.ui-tag-icon')!
  expect(icon).not.toBeNull()
  expect(icon.querySelector('[data-testid="dot"]')).not.toBeNull()
})

test('exposes el pointing at the real root', async () => {
  const captured = ref<InstanceType<typeof Tag> | null>(null)
  const screen = await render({ render: () => h(Tag, { ref: captured }, () => 'active') })
  expect(captured.value?.el).toBe(screen.container.querySelector('.ui-tag'))
  expect(captured.value?.el).toBeInstanceOf(HTMLElement)
})
