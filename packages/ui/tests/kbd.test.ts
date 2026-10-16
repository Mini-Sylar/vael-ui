import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Kbd from '../src/components/Kbd/Kbd.vue'

test('default slot content renders', async () => {
  const screen = await render(Kbd, { slots: { default: 'Esc' } })
  await expect.element(screen.getByText('Esc')).toBeInTheDocument()
})

test('ui.root override merges onto the root', async () => {
  const screen = await render(Kbd, { props: { ui: { root: 'my-kbd' } }, slots: { default: 'K' } })
  expect(screen.container.querySelector('.ui-kbd')).toHaveClass('my-kbd')
})

test('exposes el pointing at the real <kbd> root', async () => {
  const captured = ref<InstanceType<typeof Kbd> | null>(null)
  const screen = await render({ render: () => h(Kbd, { ref: captured }, () => 'K') })
  expect(captured.value?.el).toBe(screen.container.querySelector('kbd.ui-kbd'))
  expect(captured.value?.el).toBeInstanceOf(HTMLElement)
})
