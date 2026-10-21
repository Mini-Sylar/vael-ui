import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, useTemplateRef } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { useHoverIndicator } from '../src/composables/useHoverIndicator'
import type { IndicatorMode } from '../src/composables/useTabIndicator'

const List = defineComponent({
  setup() {
    const list = useTemplateRef<HTMLElement>('list')
    const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
    const { style } = useHoverIndicator(list, { itemSelector: '.row', indicatorEl })
    return () =>
      h('div', { ref: 'list', style: 'position: relative; isolation: isolate; width: 200px' }, [
        h('div', { ref: 'indicatorEl', class: 'ui-indicator', style: style.value }),
        ...['One', 'Two', 'Three', 'Four'].map((label) =>
          h('button', { class: 'row', style: 'display: block; width: 100%; height: 40px' }, label),
        ),
      ])
  },
})

const mount = (indicator: IndicatorMode, motion?: boolean) =>
  render(() => h(ConfigProvider as never, { indicator, motion }, () => h(List)))

const indicator = () => document.querySelector<HTMLElement>('.ui-indicator')!
const top = () => indicator().getBoundingClientRect().top
const rowTop = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('.row')]
    .find((row) => row.textContent === label)!
    .getBoundingClientRect().top

test('a spring set on ConfigProvider overshoots the row, then settles on it', async () => {
  const screen = await mount({ damping: 0.4, response: 0.3 })
  await userEvent.hover(screen.getByText('One'))
  await vi.waitFor(() => expect(Math.abs(top() - rowTop('One'))).toBeLessThan(0.5))
  await userEvent.hover(screen.getByText('Two'))
  const target = rowTop('Two')
  let furthest = top()
  const start = performance.now()
  while (performance.now() - start < 600) {
    furthest = Math.max(furthest, top())
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  expect(furthest).toBeGreaterThan(target + 1)
  await vi.waitFor(() => expect(Math.abs(top() - target)).toBeLessThan(0.5))
  // The spring owns position and size; only the fade is left to CSS.
  expect(indicator().style.transitionProperty).toBe('opacity')
})

test("'instant' moves the highlight with no transition", async () => {
  const screen = await mount('instant')
  await userEvent.hover(screen.getByText('One'))
  await userEvent.hover(screen.getByText('Four'))
  await vi.waitFor(() => expect(indicator().style.transitionDuration).toBe('0ms'))
})

test('motion false still wins over a spring', async () => {
  const screen = await mount({ damping: 0.4 }, false)
  await userEvent.hover(screen.getByText('One'))
  await userEvent.hover(screen.getByText('Two'))
  await vi.waitFor(() => expect(indicator().style.transitionDuration).toBe('0ms'))
  expect(indicator().style.transitionProperty).not.toBe('opacity')
})

test("a selection indicator without its own motion flag follows ConfigProvider's motion off", async () => {
  const { shallowRef } = await import('vue')
  const { useTabIndicator } = await import('../src/composables/useTabIndicator')
  const active = shallowRef('a')
  const Selection = defineComponent({
    setup() {
      const list = useTemplateRef<HTMLElement>('list')
      const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
      const { style } = useTabIndicator(active, {
        listEl: list,
        orientation: 'vertical',
        selector: '[data-on]',
        indicatorEl,
      })
      return () =>
        h('div', { ref: 'list', style: 'position: relative' }, [
          h('div', { ref: 'indicatorEl', class: 'ui-indicator', style: style.value }),
          ...['a', 'b'].map((key) =>
            h('div', { 'data-on': active.value === key || undefined, style: 'height: 40px' }, key),
          ),
        ])
    },
  })
  render(() =>
    h(ConfigProvider as never, { indicator: { damping: 0.4 }, motion: false }, () => h(Selection)),
  )
  await vi.waitFor(() => expect(indicator().style.transitionDuration).toBe('0ms'))
  active.value = 'b'
  await vi.waitFor(() => expect(indicator().style.insetBlockStart).toBe('40px'))
  expect(indicator().style.transitionProperty).not.toBe('opacity')
})
