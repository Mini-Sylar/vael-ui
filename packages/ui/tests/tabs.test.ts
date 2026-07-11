import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import TabsFixture from './fixtures/TabsFixture.vue'
import TabsReorderedFixture from './fixtures/TabsReorderedFixture.vue'

function focusedTab() {
  return document.activeElement?.getAttribute('data-testid')
}

test('click selects; arrows move selection + focus and wrap at both ends', async () => {
  const screen = render(TabsFixture)
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
  const screen = render(TabsFixture, { props: { orientation: 'vertical' } })
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
  const screen = render(TabsReorderedFixture)
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
  const screen = render(TabsFixture)
  await screen.getByTestId('tab-one').click()
  await expect.element(screen.getByTestId('changes')).toHaveTextContent('0')
})
