import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, useTemplateRef } from 'vue'
import { useHoverIndicator } from '../src/composables/useHoverIndicator'

const List = defineComponent({
  setup() {
    const list = useTemplateRef<HTMLElement>('list')
    const { style } = useHoverIndicator(list, { itemSelector: '.row' })
    return () =>
      h('div', { ref: 'list', style: 'position: relative; isolation: isolate; width: 200px' }, [
        h('div', { class: 'ui-indicator', style: style.value, 'aria-hidden': 'true' }),
        ...['One', 'Two', 'Three'].map((label) =>
          h('button', { class: 'row', style: 'display: block; width: 100%' }, label),
        ),
      ])
  },
})

const marked = () => document.querySelector('[data-indicated]')?.textContent

test('the indicator follows the pointer and leaves with it', async () => {
  const screen = await render(List)
  await userEvent.hover(screen.getByText('Three'))
  await vi.waitFor(() => expect(marked()).toBe('Three'))
  await userEvent.unhover(screen.getByText('Three'))
  await vi.waitFor(() => expect(marked()).toBeUndefined())
})

test('keyboard focus moves the indicator even while the pointer rests in the list', async () => {
  const screen = await render(List)
  await userEvent.hover(screen.getByText('Three'))
  await vi.waitFor(() => expect(marked()).toBe('Three'))
  await userEvent.keyboard('{Tab}')
  await vi.waitFor(() => expect(marked()).toBe('One'))
})
