import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TabsFixture from './fixtures/TabsFixture.vue'
import TabsReorderedFixture from './fixtures/TabsReorderedFixture.vue'
import TabsPanelsFixture from './fixtures/TabsPanelsFixture.vue'

function focusedTab() {
  return document.activeElement?.getAttribute('data-testid')
}

test('click selects; arrows move selection + focus and wrap at both ends', async () => {
  const screen = await render(TabsFixture)
  const active = screen.getByTestId('active')

  await expect.element(screen.getByRole('tablist')).toBeInTheDocument()

  await screen.getByTestId('tab-two').click()
  await expect.element(active).toHaveTextContent('two')
  await expect.element(screen.getByTestId('tab-two')).toHaveAttribute('aria-selected', 'true')
  await expect.element(screen.getByTestId('changes')).toHaveTextContent('1')

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(active).toHaveTextContent('three')
  await vi.waitFor(() => expect(focusedTab()).toBe('tab-three'))

  // Wraps forward past the end
  await userEvent.keyboard('{ArrowRight}')
  await expect.element(active).toHaveTextContent('one')
  await vi.waitFor(() => expect(focusedTab()).toBe('tab-one'))

  // Wraps backward past the start
  await userEvent.keyboard('{ArrowLeft}')
  await expect.element(active).toHaveTextContent('three')
  await vi.waitFor(() => expect(focusedTab()).toBe('tab-three'))

  await userEvent.keyboard('{Home}')
  await expect.element(active).toHaveTextContent('one')
  await userEvent.keyboard('{End}')
  await expect.element(active).toHaveTextContent('three')
  await expect.element(screen.getByTestId('changes')).toHaveTextContent('6')
})

test('vertical orientation navigates with ArrowUp/ArrowDown', async () => {
  const screen = await render(TabsFixture, { props: { orientation: 'vertical' } })
  const active = screen.getByTestId('active')

  await expect.element(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')

  await screen.getByTestId('tab-one').click()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(active).toHaveTextContent('two')
  // Horizontal keys are inert in vertical mode
  await userEvent.keyboard('{ArrowRight}')
  await expect.element(active).toHaveTextContent('two')
  await userEvent.keyboard('{ArrowUp}')
  await expect.element(active).toHaveTextContent('one')
})

test('data-tab-value lets keyboard focus find the right element when DOM order differs from items order', async () => {
  // Rendered DOM order is [three, one, two] while items is [one, two, three]
  // — without data-tab-value, focus-by-position would land on the wrong tab.
  const screen = await render(TabsReorderedFixture)
  const active = screen.getByTestId('active')

  await screen.getByTestId('tab-one').click()
  await expect.element(active).toHaveTextContent('one')

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(active).toHaveTextContent('two')
  // The bug this guards against: positional focus would grab DOM index 1
  // (which is "one" in this reordered layout), not "two".
  await vi.waitFor(() => expect(focusedTab()).toBe('tab-two'))

  await userEvent.keyboard('{ArrowRight}')
  await expect.element(active).toHaveTextContent('three')
  await vi.waitFor(() => expect(focusedTab()).toBe('tab-three'))
})

test('selecting the already-active tab does not emit change', async () => {
  const screen = await render(TabsFixture)
  await screen.getByTestId('tab-one').click()
  await expect.element(screen.getByTestId('changes')).toHaveTextContent('0')
})

test('idBase wires each tab to its panel via id/aria-controls; unset, tabs get ids but no aria-controls', async () => {
  const wired = await render(TabsPanelsFixture, { props: { idBase: 'acct' } })
  const tabs = wired.container.querySelectorAll<HTMLElement>('[role="tab"]')
  expect(tabs[0]!.id).toBe('acct-tab-one')
  expect(tabs[1]!.getAttribute('aria-controls')).toBe('acct-panel-two')
  const panel = document.getElementById(tabs[0]!.getAttribute('aria-controls')!)!
  expect(panel.getAttribute('role')).toBe('tabpanel')
  expect(document.getElementById(panel.getAttribute('aria-labelledby')!)).toBe(tabs[0])

  const bare = await render(TabsPanelsFixture)
  const bareTabs = bare.container.querySelectorAll<HTMLElement>('[role="tab"]')
  expect(bareTabs[0]!.id).not.toBe('')
  expect(bareTabs[0]!.hasAttribute('aria-controls')).toBe(false)
})

test('exposed panelProps() returns matching tabpanel attributes', async () => {
  const screen = await render(TabsPanelsFixture, { props: { idBase: 'acct' } })
  await vi.waitFor(() =>
    expect(JSON.parse(screen.getByTestId('panel-props').element().textContent!)).toEqual({
      id: 'acct-panel-two',
      role: 'tabpanel',
      'aria-labelledby': 'acct-tab-two',
      tabindex: 0,
    }),
  )
})

test('useTabs keeps object items apart, matching each tab by position', async () => {
  const { defineComponent, h, shallowRef, useTemplateRef } = await import('vue')
  const { useTabs } = await import('../src/composables/useTabs')
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const active = shallowRef(items[1]!)
  const Strip = defineComponent({
    setup() {
      const listEl = useTemplateRef<HTMLElement>('list')
      const { onKeydown, focused } = useTabs(active, { items, listEl })
      return () =>
        h(
          'div',
          { ref: 'list', role: 'tablist', onKeydown },
          items.map((item) =>
            h(
              'button',
              {
                role: 'tab',
                // What binding the item itself produces: the same string for every object.
                'data-tab-value': String(item),
                tabindex: item === focused.value ? 0 : -1,
                onClick: () => (active.value = item),
              },
              item.id,
            ),
          ),
        )
    },
  })
  const screen = await render(Strip)
  screen.container.querySelectorAll<HTMLElement>('[role="tab"]')[1]!.focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(active.value.id).toBe('c'))
  // Focus follows the selection to its own tab, not the first tab with the same string.
  await vi.waitFor(() => expect(document.activeElement?.textContent).toBe('c'))
})

test('mounting Tabs gives Vue no invalid watch source', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await render(TabsFixture)
    const invalid = warn.mock.calls.filter((args) =>
      String(args[0]).includes('Invalid watch source'),
    )
    expect(invalid).toEqual([])
  } finally {
    warn.mockRestore()
  }
})
