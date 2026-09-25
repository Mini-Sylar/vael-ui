// Run `pnpm build` before this test — it consumes the built output, not source.
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import InputListenersRoot from './fixtures/InputListenersRoot.vue'

test('Input and Textarea forward consumer @input/@focus/@blur on real keystrokes in the built vapor bundle', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const events: string[] = []
  const app = createVaporApp(InputListenersRoot, { events: () => events })
  app.mount(host)
  try {
    const input = host.querySelector<HTMLInputElement>('[data-testid="vapor-listeners-input"]')!
    const textarea = host.querySelector<HTMLTextAreaElement>(
      '[data-testid="vapor-listeners-textarea"]',
    )!
    await userEvent.type(input, 'abc')
    await userEvent.type(textarea, 'xy')
    expect(events.filter((e) => e === 'input')).toHaveLength(3)
    expect(events.filter((e) => e === 'textarea-input')).toHaveLength(2)
    expect(events).toContain('focus')
    expect(events).toContain('blur')
  } finally {
    app.unmount()
    host.remove()
  }
})

test('a throwing consumer @input still lets the built vapor Input update, and reaches app.config.errorHandler', async () => {
  const { default: InputThrowingListenerRoot } =
    await import('./fixtures/InputThrowingListenerRoot.vue')
  const host = document.createElement('div')
  document.body.appendChild(host)
  const errors: unknown[] = []
  const app = createVaporApp(InputThrowingListenerRoot)
  app.config.errorHandler = (err) => void errors.push(err)
  app.mount(host)
  try {
    const input = host.querySelector<HTMLInputElement>('[data-testid="vapor-throwing-input"]')!
    await userEvent.type(input, 'ok')
    await expect
      .poll(() => host.querySelector('[data-testid="vapor-throwing-value"]')!.textContent)
      .toBe('ok')
    expect(errors).toHaveLength(2)
  } finally {
    app.unmount()
    host.remove()
  }
})
