// Run `pnpm build` before this test — it consumes the built output, not source.
// Vapor hands the TransitionGroup ref over without `$el`; listEl must still be the <ul>.
import { expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import CommandPaletteVaporRoot from './fixtures/CommandPaletteVaporRoot.vue'

test('listEl is the results <ul>, and the list eases to its new height', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createVaporApp(CommandPaletteVaporRoot)
  const root = app.mount(host) as unknown as { palette: { listEl: HTMLElement | null } }

  await vi.waitFor(() => expect(root.palette.listEl?.tagName).toBe('UL'))
  const list = root.palette.listEl!
  const heights: number[] = []
  const start = performance.now()
  const sample = () => {
    heights.push(Math.round(list.getBoundingClientRect().height))
    if (performance.now() - start < 400) requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
  await userEvent.type(page.getByRole('combobox'), 'Item 1')
  await new Promise((resolve) => setTimeout(resolve, 450))

  expect(new Set(heights).size).toBeGreaterThan(2)
  app.unmount()
  host.remove()
})
