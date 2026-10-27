// A long field gets a menu as wide as it, as Select's is; the levels opening beside it keep their
// own width.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h } from 'vue'
import CascadeSelectFixture from './fixtures/CascadeSelectFixture.vue'

test('the menu is as wide as a long field, and a submenu keeps its own width', async () => {
  const screen = await render(() => h('div', { style: 'width: 520px' }, [h(CascadeSelectFixture)]))
  const trigger = document.querySelector<HTMLElement>('.ui-cascade-select .ui-menu-trigger')!
  await screen.getByRole('button').first().click()
  const panels = () => [...document.querySelectorAll<HTMLElement>('.ui-menu-panel')]
  await vi.waitFor(() => expect(panels().length).toBe(1))
  await new Promise((r) => setTimeout(r, 400))
  const width = trigger.getBoundingClientRect().width
  expect(width).toBeGreaterThan(400)
  expect(panels()[0]!.getBoundingClientRect().width).toBeCloseTo(width, 0)
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(panels().length).toBe(2))
  await new Promise((r) => setTimeout(r, 400))
  expect(panels()[1]!.getBoundingClientRect().width).toBeLessThan(width / 2)
})
