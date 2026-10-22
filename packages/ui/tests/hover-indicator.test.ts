import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, useTemplateRef } from 'vue'
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

test('a list nested inside another keeps its own highlight', async () => {
  const Nested = defineComponent({
    setup() {
      const outer = useTemplateRef<HTMLElement>('outer')
      const inner = useTemplateRef<HTMLElement>('inner')
      const { style: outerStyle } = useHoverIndicator(outer, {
        itemSelector: '.row',
        scope: '.outer, .inner',
      })
      const { style: innerStyle } = useHoverIndicator(inner, {
        itemSelector: '.row',
        scope: '.outer, .inner',
      })
      return () =>
        h('div', { ref: 'outer', class: 'outer', style: 'position: relative; width: 200px' }, [
          h('div', { class: 'ui-indicator outer-indicator', style: outerStyle.value }),
          h('button', { class: 'row', style: 'display: block; height: 30px' }, 'Outer'),
          h('div', { ref: 'inner', class: 'inner', style: 'position: relative' }, [
            h('div', { class: 'ui-indicator inner-indicator', style: innerStyle.value }),
            h('button', { class: 'row', style: 'display: block; height: 30px' }, 'Inner'),
          ]),
        ])
    },
  })
  const screen = await render(Nested)
  await userEvent.hover(screen.getByText('Outer'))
  await vi.waitFor(() =>
    expect(getComputedStyle(document.querySelector('.outer-indicator')!).opacity).toBe('1'),
  )
  await userEvent.hover(screen.getByText('Inner'))
  await vi.waitFor(() =>
    expect(getComputedStyle(document.querySelector('.inner-indicator')!).opacity).toBe('1'),
  )
  // The outer list lost its row to the inner one, so its highlight goes, instead of jumping there.
  await vi.waitFor(() =>
    expect(getComputedStyle(document.querySelector('.outer-indicator')!).opacity).toBe('0'),
  )
})

test('a list shown again (a menu reopened) gets its indicator placed on the same row', async () => {
  const shown = shallowRef(true)
  const Toggled = defineComponent({
    setup() {
      const list = useTemplateRef<HTMLElement>('list')
      const indicator = useTemplateRef<HTMLElement>('indicator')
      useHoverIndicator(list, { itemSelector: '.row', indicatorEl: indicator })
      return () =>
        shown.value
          ? h(
              'div',
              { ref: 'list', style: 'position: relative; isolation: isolate; width: 200px' },
              [
                h('div', { ref: 'indicator', class: 'ui-indicator', 'aria-hidden': 'true' }),
                ...['One', 'Two'].map((label) =>
                  h('button', { class: 'row', style: 'display: block; width: 100%' }, label),
                ),
              ],
            )
          : null
    },
  })
  const screen = await render(Toggled)
  const placed = () => document.querySelector<HTMLElement>('.ui-indicator')!.style.translate
  await userEvent.hover(screen.getByText('Two'))
  await vi.waitFor(() => expect(placed()).not.toBe(''))
  // Gone with the pointer still on it (an item chosen), then back.
  shown.value = false
  await nextTick()
  shown.value = true
  await nextTick()
  await userEvent.unhover(document.body)
  await userEvent.hover(screen.getByText('Two'))
  await vi.waitFor(() => expect(placed()).not.toBe(''))
})
