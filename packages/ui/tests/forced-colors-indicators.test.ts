// Forced colors drop author backgrounds; these marks must still show, in system colors.
import '../src/style.css'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import { h } from 'vue'
import { render } from 'vitest-browser-vue'
import { cdp } from 'vitest/browser'
import Tabs from '../src/components/Tabs/Tabs.vue'
import Loader from '../src/components/Loader/Loader.vue'
import PaginationFixture from './fixtures/PaginationFixture.vue'

const session = () =>
  cdp() as unknown as { send: (method: string, params?: object) => Promise<unknown> }
beforeAll(() =>
  session().send('Emulation.setEmulatedMedia', {
    features: [{ name: 'forced-colors', value: 'active' }],
  }),
)
afterAll(() => session().send('Emulation.setEmulatedMedia', { features: [] }))

const visibleBorder = (el: Element) => parseFloat(getComputedStyle(el).borderTopWidth) > 0

test('the emulation is on', () => {
  expect(matchMedia('(forced-colors: active)').matches).toBe(true)
})

test('the selected tab indicator draws a Highlight border or bar', async () => {
  for (const variant of ['background', 'underline'] as const) {
    const screen = await render(() =>
      h(
        Tabs as any,
        { items: ['a', 'b'], active: 'a' },
        {
          default: ({ items, itemProps, indicatorProps }: any) => [
            ...items.map((item: string) => h('button', itemProps(item), item)),
            h('span', indicatorProps(variant)),
          ],
        },
      ),
    )
    const indicator = screen.container.querySelector('.ui-tabs-indicator')!
    const style = getComputedStyle(indicator)
    if (variant === 'background') expect(visibleBorder(indicator)).toBe(true)
    else expect(style.forcedColorAdjust).toBe('none')
    screen.unmount()
  }
})

test('the current page indicator draws a Highlight border', async () => {
  const screen = await render(PaginationFixture, { props: { total: 50, pageSize: 10 } })
  const indicator = screen.container.querySelector('.ui-pagination-indicator')!
  await vi.waitFor(() => expect(visibleBorder(indicator)).toBe(true))
})

test('non-ring loaders keep their color', async () => {
  const screen = await render(Loader, { props: { type: 'dots' } })
  const el = screen.container.querySelector('.ui-loader')!
  expect(getComputedStyle(el).forcedColorAdjust).toBe('none')
})
