// Server-rendered, nothing has measured an indicator yet: the selected item draws the same look,
// and hands over to the indicator once it's placed.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { render } from 'vitest-browser-vue'
import MenuList from '../src/components/MenuList/MenuList.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'
import SelectButton from '../src/components/SelectButton/SelectButton.vue'
import Tabs from '../src/components/Tabs/Tabs.vue'

const tabs = () =>
  h(
    Tabs as never,
    { items: ['one', 'two'], active: 'two', 'aria-label': 'Sections' },
    {
      default: ({ itemProps, indicatorProps }: Record<string, (...a: unknown[]) => object>) => [
        h('span', indicatorProps!()),
        h('button', itemProps!('one'), 'One'),
        h('button', itemProps!('two'), 'Two'),
      ],
    },
  )
const cases: [string, () => ReturnType<typeof h>, string, string][] = [
  [
    'SelectButton',
    () =>
      h(SelectButton as never, {
        items: [
          { label: 'npm', value: 'npm' },
          { label: 'pnpm', value: 'pnpm' },
        ],
        modelValue: 'pnpm',
        'aria-label': 'Package manager',
      }),
    '.ui-select-button-option[data-checked]',
    '::before',
  ],
  ['Tabs', tabs, '[role="tab"][aria-selected="true"]', '::after'],
  [
    'Pagination',
    () => h(Pagination as never, { total: 50, pageSize: 10, page: 2 }),
    '[aria-current="page"]',
    '',
  ],
  [
    'MenuList',
    () =>
      h(MenuList as never, {
        items: [
          { label: 'Inbox', value: 'inbox' },
          { label: 'Sent', value: 'sent' },
        ],
        active: 'sent',
        'aria-label': 'Mail',
      }),
    '[aria-current="page"]',
    '::after',
  ],
]

// The look the selected item paints itself: its pseudo-element's, or (a Button) its box, drawn by
// its ::before, which must differ from an unselected sibling's.
function drawn(el: Element, pseudo: string) {
  if (pseudo) {
    const style = getComputedStyle(el, pseudo)
    return style.content === 'none' ? 'none' : style.backgroundColor
  }
  const box = getComputedStyle(el, '::before').backgroundColor
  const other = el.closest('ul')!.querySelector('.ui-pagination-page-button:not([aria-current])')!
  return box === getComputedStyle(other, '::before').backgroundColor ? 'none' : box
}

test.each(cases)(
  '%s: server-rendered, the selection shows before any script',
  async (_, view, selector, pseudo) => {
    const html = await renderToString(createSSRApp({ render: view } as Component))
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)
    const selected = host.querySelector(selector)!
    expect(selected).not.toBeNull()
    const look = drawn(selected, pseudo)
    expect(look).not.toBe('none')
    expect(look).not.toBe('rgba(0, 0, 0, 0)')
    host.remove()
  },
)

test.each(cases)(
  '%s: mounted, the indicator takes over from the fallback',
  async (_, view, selector, pseudo) => {
    const screen = await render({ render: view })
    const root = screen.container.firstElementChild!
    await vi.waitFor(() =>
      expect(
        root.closest('[data-indicator-placed]') ?? root.querySelector('[data-indicator-placed]'),
      ).not.toBeNull(),
    )
    const selected = screen.container.querySelector(selector)!
    // A Button's own box fades out over the indicator, the same color: no change you can see.
    await vi.waitFor(() => expect(drawn(selected, pseudo)).toBe('none'))
    await screen.unmount()
  },
)
