// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import FocusListenersRoot from './fixtures/FocusListenersRoot.vue'

test('consumer @focus and @blur on wrapper-rooted controls fire once on a real Tab through the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const events: string[] = []
  const app = createVaporApp(FocusListenersRoot, { events: () => events })
  app.mount(host)
  try {
    // One Tab per control: each is entered and left exactly once, in order.
    for (let i = 0; i < 7; i++) await userEvent.tab()
    expect(events).toEqual([
      'checkbox-focus',
      'checkbox-blur',
      'switch-focus',
      'switch-blur',
      'radios-focus',
      'radios-blur',
      'select-focus',
      'select-blur',
      'slider-focus',
      'slider-blur',
    ])
  } finally {
    app.unmount()
    host.remove()
  }
})
