// A springy indicator swinging past the end of a tab row isn't content to scroll to: the row that
// fits doesn't clip it or fade its edge mid-glide. A row that really is too wide still scrolls.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import Tabs from '../src/components/Tabs/Tabs.vue'
import { vScrollMask } from '../src/directives/vScrollMask'

function row(decorationPastEnd: number, contentWidth: number) {
  return withDirectives(
    h(
      'div',
      {
        class: 'row',
        style: 'position: relative; display: flex; inline-size: 300px; overflow-x: auto',
      },
      [
        h('span', {
          'aria-hidden': 'true',
          style: `position: absolute; inset-block: 0; inset-inline-start: 0; inline-size: ${300 + decorationPastEnd}px`,
        }),
        h('div', { style: `flex: none; inline-size: ${contentWidth}px; block-size: 20px` }),
      ],
    ),
    [[vScrollMask, 'x']],
  )
}

test('a decoration past the end does not make the row scroll or fade', async () => {
  render(() => row(20, 250))
  const el = document.querySelector<HTMLElement>('.row')!
  await new Promise(requestAnimationFrame)
  expect(el.scrollWidth).toBeGreaterThan(el.clientWidth)
  expect(el.classList.contains('scroll-fade-x')).toBe(false)
})

test('content past the end still makes the row scroll and fade', async () => {
  render(() => row(0, 500))
  const el = document.querySelector<HTMLElement>('.row')!
  await vi.waitFor(() => expect(el.classList.contains('scroll-fade-x')).toBe(true))
})

test('a tab row that fits lets its indicator overshoot show instead of clipping it', async () => {
  const items = ['overview', 'analytics', 'settings']
  render(() =>
    h(
      Tabs as never,
      { items, active: 'overview', 'aria-label': 'Sections' },
      {
        default: ({ itemProps, indicatorProps }: Record<string, (...a: unknown[]) => object>) => [
          h('span', indicatorProps!('background')),
          ...items.map((item) => h('button', itemProps!(item), item)),
        ],
      },
    ),
  )
  const list = document.querySelector<HTMLElement>('[role="tablist"]')!
  await vi.waitFor(() => expect(list.hasAttribute('data-indicator-placed')).toBe(true))
  expect(getComputedStyle(list).overflowX).toBe('visible')
  expect(list.querySelector('.ui-tabs-indicator')?.getAttribute('aria-hidden')).toBe('true')
})
