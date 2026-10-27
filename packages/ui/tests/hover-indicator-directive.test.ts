import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, withDirectives } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { vHoverIndicator } from '../src/directives/vHoverIndicator'
import type { HoverIndicatorValue } from '../src/directives/vHoverIndicator'

const rows = () =>
  ['One', 'Two', 'Three'].map((label) =>
    h('button', { class: 'row', style: 'display: block; width: 100%; height: 32px' }, label),
  )
const listOf = (value: () => HoverIndicatorValue, modifiers: Record<string, boolean> = {}) =>
  defineComponent({
    setup: () => () =>
      withDirectives(h('div', { class: 'list', style: 'width: 200px' }, rows()), [
        [vHoverIndicator, value(), undefined, modifiers],
      ]),
  })

const list = () => document.querySelector<HTMLElement>('.list')!
const indicator = () => list().querySelector<HTMLElement>(':scope > .ui-indicator')
const marked = () => document.querySelector('[data-indicated]')?.textContent

test('v-hover-indicator puts its own highlight in the list and slides it to the hovered row', async () => {
  const screen = await render(listOf(() => '.row'))
  expect(indicator()?.getAttribute('aria-hidden')).toBe('true')
  expect(list().classList.contains('ui-hover-list')).toBe(true)
  expect(getComputedStyle(list()).position).toBe('relative')
  await userEvent.hover(screen.getByText('Three'))
  await vi.waitFor(() => expect(marked()).toBe('Three'))
  await vi.waitFor(() => expect(indicator()!.style.translate).toBe('0px 64px'))
  await userEvent.unhover(screen.getByText('Three'))
  await vi.waitFor(() => expect(marked()).toBeUndefined())
})

test('.over draws the highlight as a tint above the rows', async () => {
  await render(listOf(() => '.row', { over: true }))
  expect(indicator()!.classList.contains('ui-indicator--over')).toBe(true)
  expect(getComputedStyle(indicator()!).zIndex).toBe('2')
})

test('false turns it off, a selector turns it on, and unmounting takes the highlight away', async () => {
  const value = shallowRef<HoverIndicatorValue>(false)
  const screen = await render(listOf(() => value.value))
  expect(indicator()).toBeNull()
  value.value = '.row'
  await nextTick()
  expect(indicator()).not.toBeNull()
  const el = list()
  screen.unmount()
  expect(el.querySelector('.ui-indicator')).toBeNull()
})

test('enabled: false pauses the same highlight in place, as while a row is dragged', async () => {
  const enabled = shallowRef(true)
  const screen = await render(listOf(() => ({ itemSelector: '.row', enabled: enabled.value })))
  const first = indicator()
  enabled.value = false
  await nextTick()
  expect(indicator()).toBe(first)
  await userEvent.hover(screen.getByText('Two'))
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(marked()).toBeUndefined()
  enabled.value = true
  await nextTick()
  await userEvent.hover(screen.getByText('Three'))
  await vi.waitFor(() => expect(marked()).toBe('Three'))
  expect(indicator()).toBe(first)
})

test('in a list it adds a list item; a class of yours and a horizontal row show on it', async () => {
  const Row = defineComponent({
    setup: () => () =>
      withDirectives(
        h(
          'ul',
          { class: 'list', style: 'display: flex; width: 300px' },
          ['A', 'B'].map((label) => h('li', { class: 'row', style: 'width: 80px' }, label)),
        ),
        [[vHoverIndicator, { itemSelector: '.row', orientation: 'horizontal', class: 'mine' }]],
      ),
  })
  await render(Row)
  expect(indicator()!.tagName).toBe('LI')
  expect(indicator()!.className).toBe('ui-indicator ui-indicator--inline mine')
})

test("a ConfigProvider's motion off moves it at once, as in vael-ui's own lists", async () => {
  const List = listOf(() => '.row')
  const screen = await render(() => h(ConfigProvider as never, { motion: false }, () => h(List)))
  await userEvent.hover(screen.getByText('One'))
  await vi.waitFor(() => expect(marked()).toBe('One'))
  await userEvent.hover(screen.getByText('Three'))
  await vi.waitFor(() => expect(indicator()!.style.translate).toBe('0px 64px'))
  expect(indicator()!.style.transitionDuration).toBe('0ms')
})
