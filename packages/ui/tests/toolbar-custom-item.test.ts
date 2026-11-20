import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick } from 'vue'
import Toolbar from '../src/components/Toolbar/Toolbar.vue'

test('a custom focusable (role="button" tabindex="0") stays in the roving set', async () => {
  const screen = await render(() =>
    h(Toolbar, { 'aria-label': 'Tools' }, () => [
      h('button', { type: 'button', id: 'first' }, 'First'),
      h('div', { role: 'button', tabindex: 0, id: 'custom' }, 'Custom'),
      h('button', { type: 'button', id: 'last' }, 'Last'),
    ]),
  )
  await nextTick()
  const el = (id: string) => screen.container.querySelector<HTMLElement>(`#${id}`)!
  // The first refresh sets the custom item to -1; a later one must still find it.
  await vi.waitFor(() => expect(el('custom').tabIndex).toBe(-1))
  ;(el('first') as HTMLButtonElement).disabled = true
  await vi.waitFor(() => expect(el('custom').tabIndex).toBe(0))
  el('custom').focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(el('last'))
  await userEvent.keyboard('{ArrowLeft}')
  expect(document.activeElement).toBe(el('custom'))
})
