import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Separator from '../src/components/Separator/Separator.vue'

test('horizontal (default): role=separator, no aria-orientation, no text spans', async () => {
  const screen = render(Separator)
  const el = screen.container.querySelector('.ui-separator')!
  expect(el.getAttribute('role')).toBe('separator')
  expect(el.getAttribute('aria-orientation')).toBeNull()
  expect(el.querySelector('.ui-separator-text')).toBeNull()
})

test('vertical: aria-orientation="vertical"', async () => {
  const screen = render(Separator, { props: { orientation: 'vertical' } })
  expect(screen.container.querySelector('.ui-separator')!.getAttribute('aria-orientation')).toBe(
    'vertical',
  )
})

test('slot content renders as a centered label flanked by two line spans', async () => {
  const screen = render(Separator, { slots: { default: 'OR' } })
  const el = screen.container.querySelector('.ui-separator')!
  expect(el.querySelectorAll('.ui-separator-line').length).toBe(2)
  await expect.element(el.querySelector<HTMLElement>('.ui-separator-text')!).toHaveTextContent('OR')
})
