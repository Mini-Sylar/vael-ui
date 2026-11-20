// `active` states listen on the window only while pressed: idle buttons add nothing to it.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Button from '../src/components/Button/Button.vue'
import { trackListeners } from './utils/windowListeners'

let tracker: ReturnType<typeof trackListeners> | undefined
afterEach(() => tracker?.restore())

test('a pressed state adds its window release listeners on press and drops them on release', async () => {
  tracker = trackListeners(window)
  render({
    setup: () => () =>
      [1, 2, 3].map((n) =>
        h(
          Button,
          { key: n, motion: { states: { active: { root: { scale: '0.9' } } } } },
          () => 'Go',
        ),
      ),
  })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-button')).toHaveLength(3))
  await new Promise((r) => setTimeout(r, 300))
  expect(tracker.count('pointerup', 'pointercancel')).toBe(0)
  const button = document.querySelector<HTMLElement>('.ui-button')!
  button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
  expect(tracker.count('pointerup', 'pointercancel')).toBe(2)
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
  expect(tracker.count('pointerup', 'pointercancel')).toBe(0)
})
