import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Button from '../src/components/Button/Button.vue'
import type { ButtonMotion } from '../src/motion/types'

vi.mock('../src/composables/dom', async (original) => ({
  ...(await original<typeof import('../src/composables/dom')>()),
  prefersReducedMotion: () => true,
}))

test('under reduced motion a state keeps its colour and opacity and drops movement', async () => {
  const motion: ButtonMotion = {
    states: { active: { label: { scale: '0.8', opacity: 0.5, x: [0, -6, 6, 0] } } },
  }
  render({ setup: () => () => h(Button, { motion }, () => 'Save') })
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  const label = () => document.querySelector<HTMLElement>('.ui-button-label')!
  await vi.waitFor(() => expect(button()).not.toBeNull())
  await new Promise((resolve) => setTimeout(resolve, 300))
  button().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  await vi.waitFor(() => expect(getComputedStyle(label()).opacity).toBe('0.5'), { timeout: 2000 })
  expect(getComputedStyle(label()).scale).not.toBe('0.8')
  expect(getComputedStyle(label()).translate).toBe('none')
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})
