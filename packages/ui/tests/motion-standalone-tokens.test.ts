// vael-ui/motion with no component and no style.css: its timing tokens come with it.
import { expect, test } from 'vitest'
import { animate } from '../src/motion/animate'

test('motion on its own brings the timing tokens its names resolve to', () => {
  expect(animate).toBeTypeOf('function')
  const root = getComputedStyle(document.documentElement)
  expect(root.getPropertyValue('--ui-duration-exit').trim()).toBe('150ms')
  expect(root.getPropertyValue('--ui-ease-out').trim()).toBe('cubic-bezier(0.23, 1, 0.32, 1)')
})
