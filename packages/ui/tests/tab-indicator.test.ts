import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, useTemplateRef } from 'vue'
import { useTabIndicator } from '../src/composables/useTabIndicator'

// A scaled ancestor that never fires transitionend - the state an entering Dialog/Drawer is in
// when Tabs first measures.
const ScaledTabs = defineComponent({
  setup() {
    const active = shallowRef('two')
    const listEl = useTemplateRef<HTMLElement>('list')
    const { style } = useTabIndicator(active, { listEl })
    return () =>
      h('div', { style: 'transform: scale(0.5); transform-origin: 0 0' }, [
        h('div', { ref: 'list', style: 'position: relative; display: flex; padding: 0' }, [
          ...['one', 'two', 'three'].map((tab) =>
            h('button', {
              role: 'tab',
              'aria-selected': active.value === tab,
              style: 'width: 100px; height: 32px; padding: 0; border: 0; flex: none',
            }),
          ),
          h('span', { 'data-testid': 'indicator', style: style.value }),
        ]),
      ])
  },
})

test('indicator measures the active tab correctly inside a scaled (still-animating) ancestor', async () => {
  const screen = await render(ScaledTabs)
  await nextTick()
  await nextTick()
  const indicator = screen.container.querySelector<HTMLElement>('[data-testid="indicator"]')!
  expect(parseFloat(indicator.style.insetInlineStart)).toBeCloseTo(100, 0)
  expect(parseFloat(indicator.style.inlineSize)).toBeCloseTo(100, 0)
})

const FractionalTabs = defineComponent({
  setup() {
    const active = shallowRef('three')
    const listEl = useTemplateRef<HTMLElement>('list')
    const { style } = useTabIndicator(active, { listEl })
    return () =>
      h('div', { ref: 'list', style: 'position: relative; display: flex; width: 301.6px' }, [
        ...['one', 'two', 'three'].map((tab) =>
          h('button', {
            role: 'tab',
            'aria-selected': active.value === tab,
            style: 'width: 100.4px; height: 32px; padding: 0; border: 0; flex: none',
          }),
        ),
        h('span', { 'data-testid': 'indicator', style: style.value }),
      ])
  },
})

test('indicator stays exact on an unscaled list with fractional widths', async () => {
  const screen = await render(FractionalTabs)
  await nextTick()
  await nextTick()
  const indicator = screen.container.querySelector<HTMLElement>('[data-testid="indicator"]')!
  expect(parseFloat(indicator.style.insetInlineStart)).toBeCloseTo(200.8, 1)
  expect(parseFloat(indicator.style.inlineSize)).toBeCloseTo(100.4, 1)
})
