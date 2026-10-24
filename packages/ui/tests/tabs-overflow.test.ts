// A tab row wider than its space scrolls inside it, and both highlights follow the scroll.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h, shallowRef } from 'vue'
import Tabs from '../src/components/Tabs/Tabs.vue'

test('fifteen tabs in a narrow box scroll inside it; End reaches the last, with its indicator', async () => {
  const items = Array.from({ length: 15 }, (_, i) => `tab-${i + 1}`)
  const active = shallowRef(items[0])
  render(() =>
    h('div', { style: 'inline-size: 320px' }, [
      h(
        Tabs as never,
        {
          items,
          active: active.value,
          'onUpdate:active': (value: string) => (active.value = value),
          'aria-label': 'Sections',
        },
        {
          default: ({ itemProps, indicatorProps }: Record<string, (...a: unknown[]) => object>) => [
            h('span', indicatorProps!()),
            ...items.map((item) => h('button', itemProps!(item), `Section ${item}`)),
          ],
        },
      ),
    ]),
  )
  const list = document.querySelector<HTMLElement>('[role="tablist"]')!
  await vi.waitFor(() => expect(list.scrollWidth).toBeGreaterThan(list.clientWidth))
  // The page itself never scrolls sideways.
  expect(list.getBoundingClientRect().width).toBeLessThanOrEqual(320)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)

  document.querySelector<HTMLElement>('[role="tab"]')!.focus()
  await userEvent.keyboard('{End}')
  await vi.waitFor(() => expect(active.value).toBe('tab-15'))
  const last = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].at(-1)!
  const box = list.getBoundingClientRect()
  await vi.waitFor(() => {
    const tab = last.getBoundingClientRect()
    expect(tab.right).toBeLessThanOrEqual(box.right + 1)
    const indicator = list.querySelector('.ui-tabs-indicator')!.getBoundingClientRect()
    expect(Math.abs(indicator.left - tab.left)).toBeLessThan(2)
    expect(Math.abs(indicator.width - tab.width)).toBeLessThan(2)
  })
})
