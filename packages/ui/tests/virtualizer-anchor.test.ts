// Dynamic rows: measuring rows above the view keeps what's on screen where it is.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import VirtualizerFixture from './fixtures/VirtualizerFixture.vue'

const frame = () => new Promise(requestAnimationFrame)

test('rows measured above the view do not shift the row at its top', async () => {
  const screen = await render(VirtualizerFixture, {
    props: { count: 200, dynamic: true, estimateSize: 40 },
  })
  const container = screen.container.querySelector<HTMLElement>('[data-testid="container"]')!
  container.scrollTop = 2000
  container.dispatchEvent(new Event('scroll'))
  // Row 50 sits at the top by the estimates; rows 42-49 above it then measure taller.
  await vi.waitFor(() => expect(container.querySelector('[data-virtual-index="42"]')).toBeTruthy())
  for (let i = 0; i < 5; i++) await frame()
  const row = container.querySelector<HTMLElement>('[data-virtual-index="50"]')!
  expect(row.getBoundingClientRect().top).toBeCloseTo(container.getBoundingClientRect().top, 0)
})
