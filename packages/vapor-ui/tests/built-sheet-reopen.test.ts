/**
 * A BottomSheet stays mounted when closed (force-mount); opened again, it must come back on
 * screen, not stay where it left (run `pnpm build` first).
 */
import { expect, test } from 'vitest'
import { createApp, createVaporApp, vaporInteropPlugin } from 'vue'
import SheetReopenRoot from './fixtures/SheetReopenRoot.vue'
import SheetReopenVdomHost from './fixtures/SheetReopenVdomHost.vue'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function reopenTops(mount: (host: HTMLElement) => { unmount: () => void }) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = mount(host)
  const toggle = host.querySelector<HTMLElement>('[data-testid="toggle"]')!
  const top = () => {
    const panels = [...document.querySelectorAll<HTMLElement>('.ui-bottom-sheet-panel')]
    const shown = panels.find((p) => p.getBoundingClientRect().height > 0)
    return shown ? Math.round(shown.getBoundingClientRect().top) : null
  }
  const tops: (number | null)[] = []
  try {
    for (let round = 0; round < 2; round++) {
      toggle.click()
      await wait(700)
      tops.push(top())
      toggle.click()
      await wait(700)
    }
  } finally {
    app.unmount()
    host.remove()
  }
  return tops
}

test('Vapor BottomSheet: opened again, it comes back on screen', async () => {
  const tops = await reopenTops((host) => {
    const app = createVaporApp(SheetReopenRoot)
    app.mount(host)
    return app
  })
  expect(tops[0]!).toBeLessThan(innerHeight)
  expect(tops[1]).toBe(tops[0])
})

test('Vapor BottomSheet in a VDOM app (interop, as the docs): opened again, it comes back on screen', async () => {
  const tops = await reopenTops((host) => {
    const app = createApp(SheetReopenVdomHost)
    app.use(vaporInteropPlugin)
    app.mount(host)
    return app
  })
  expect(tops[0]!).toBeLessThan(innerHeight)
  expect(tops[1]).toBe(tops[0])
})
