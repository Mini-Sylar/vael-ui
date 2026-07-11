import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import DirectiveSpike from './fixtures/DirectiveSpike.vue'

test('spike: Vapor directive value is a getter, called once, needs its own watchEffect for reactivity', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(DirectiveSpike)
  app.mount(host)
  try {
    const rawCalls = () =>
      host.querySelector('[data-testid="directive-spike-raw-calls"]')!.textContent
    const effectRuns = () =>
      host.querySelector('[data-testid="directive-spike-effect-runs"]')!.textContent
    const lastValue = () =>
      host.querySelector('[data-testid="directive-spike-last-value"]')!.textContent

    expect(rawCalls()).toBe('1')
    expect(effectRuns()).toBe('1')
    expect(lastValue()).toBe('initial')

    host.querySelector<HTMLElement>('[data-testid="directive-spike-change"]')!.click()
    await new Promise((resolve) => setTimeout(resolve, 50))

    // The directive FUNCTION itself should NOT be called again — Vapor
    // calls it once at setup. Our own watchEffect (reading the value
    // getter) should be what re-runs and picks up the change.
    expect(rawCalls()).toBe('1')
    expect(effectRuns()).toBe('2')
    expect(lastValue()).toBe('changed')
  } finally {
    app.unmount()
  }
})
