import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TreeReorderFixture from './fixtures/TreeReorderFixture.vue'

// The drag engine arrives 300ms late here, like a slow network, to cover presses made before it.
const engine = vi.hoisted(() => ({ loads: 0 }))
vi.mock('../src/composables/useSortable', async (importOriginal) => {
  engine.loads++
  await new Promise((resolve) => setTimeout(resolve, 300))
  return importOriginal()
})

test('Space before the engine arrives stops the page scrolling and grabs once it is ready', async () => {
  const screen = await render(TreeReorderFixture)
  const row = screen.container.querySelector<HTMLElement>('[data-tree-value="a"]')!
  row.focus()
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
  row.dispatchEvent(space)
  expect(space.defaultPrevented).toBe(true)
  await vi.waitFor(() =>
    expect(screen.container.querySelector('[aria-live="assertive"]')?.textContent).toContain(
      'Grabbed a',
    ),
  )
})
