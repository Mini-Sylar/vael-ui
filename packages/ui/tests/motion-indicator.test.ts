// Indicators: `move` hands each move to you (from where it was), `spring` retimes the glide.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Tabs from '../src/components/Tabs/Tabs.vue'
import SelectButton from '../src/components/SelectButton/SelectButton.vue'
import MenuList from '../src/components/MenuList/MenuList.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'

const frame = () => new Promise(requestAnimationFrame)
const items = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo option' },
]
type Moved = { indicator: HTMLElement; from: { x: number; y: number; scaleX: number } }

const cases = [
  {
    name: 'Tabs',
    render: (motion: unknown, at: { value: string }) =>
      h(
        Tabs as never,
        { items: ['one', 'two'], active: at.value === 'a' ? 'one' : 'two', motion },
        {
          default: ({ items, itemProps, indicatorProps }: never) => [
            h('span', (indicatorProps as () => object)()),
            ...(items as string[]).map((item) =>
              h('button', (itemProps as (i: string) => object)(item), `Tab ${item} label`),
            ),
          ],
        },
      ),
  },
  {
    name: 'SelectButton',
    render: (motion: unknown, at: { value: string }) =>
      h(SelectButton as never, { items, modelValue: at.value, motion }),
  },
  {
    name: 'MenuList',
    render: (motion: unknown, at: { value: string }) =>
      h(MenuList as never, { items, active: at.value, motion }),
  },
  {
    name: 'Pagination',
    render: (motion: unknown, at: { value: string }) =>
      h(Pagination as never, { total: 50, page: at.value === 'a' ? 1 : 3, motion }),
  },
]

for (const { name, render: view } of cases) {
  test(`${name}: a \`move\` hook gets the indicator and where it came from`, async () => {
    const moves: Moved[] = []
    const at = shallowRef('a')
    const motion = {
      move: ({ indicator }: { indicator: HTMLElement }, context: Moved) =>
        void moves.push({ indicator, from: context.from }),
    }
    render({ setup: () => () => view(motion, at.value === 'a' ? { value: 'a' } : { value: 'b' }) })
    for (let i = 0; i < 4; i++) await frame()
    at.value = 'b'
    // The move to the new item: it starts where the old one was.
    const travelled = () => moves.find((m) => Math.abs(m.from.x) + Math.abs(m.from.y) > 1)
    await vi.waitFor(() => expect(travelled()).toBeDefined())
    expect(travelled()!.indicator.isConnected).toBe(true)
  })
}

test('`spring` on one SelectButton puts its indicator on that spring (written every frame)', async () => {
  const writes = async (motion: unknown) => {
    const at = shallowRef('a')
    const screen = await render({
      setup: () => () => h(SelectButton as never, { items, modelValue: at.value, motion }),
    })
    for (let i = 0; i < 4; i++) await frame()
    const indicator = screen.container.querySelector<HTMLElement>('.ui-select-button-indicator')!
    let count = 0
    new MutationObserver(() => count++).observe(indicator, { attributeFilter: ['style'] })
    at.value = 'b'
    for (let i = 0; i < 12; i++) await frame()
    screen.unmount()
    return count
  }
  expect(await writes({ spring: { damping: 0.6, response: 0.4 } })).toBeGreaterThan(4)
  expect(await writes(undefined)).toBeLessThanOrEqual(3)
})
