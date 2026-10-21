import { expect, test } from 'vitest'
import { createApp, createVaporApp } from 'vue'
import PresenceVapor from './fixtures/motion-spike/PresenceVapor.vue'
import PresenceVdom from './fixtures/motion-spike/PresenceVdom.vue'

const settle = () => new Promise((resolve) => setTimeout(resolve, 80))

for (const [name, mount] of [
  ['vdom', (host: Element) => createApp(PresenceVdom).mount(host) && createApp],
  ['vapor', (host: Element) => createVaporApp(PresenceVapor).mount(host) && createVaporApp],
] as const) {
  test(`M0 S2 (${name}): v-animate joins its nearest presence through the DOM, teleported too, and presence drives <Transition>`, async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    mount(host)
    await settle()
    // Every marked element found its presence, with its argument, in document order.
    expect(host.querySelector('[data-testid="joined"]')!.textContent).toBe(
      'summary,rows,rows,rows|inside',
    )
    // The bound presence props run Vue's (Vapor's) Transition hooks.
    host.querySelector<HTMLElement>('[data-testid="toggle"]')!.click()
    await settle()
    host.querySelector<HTMLElement>('[data-testid="toggle"]')!.click()
    await settle()
    expect(host.querySelector('[data-testid="log"]')!.textContent).toBe('enter,leave')
  })
}
