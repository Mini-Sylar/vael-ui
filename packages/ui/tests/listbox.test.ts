import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import ListboxFixture from './fixtures/ListboxFixture.vue'

test('ArrowDown/ArrowUp step over items, skip disabled, and wrap at both ends', async () => {
  const screen = render(ListboxFixture)
  await screen.getByTestId('input').click()

  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('0') // Apple

  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('1') // Banana

  // Cherry (index 2) is disabled — skipped straight to Date (index 3).
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('3')

  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('4') // Elderberry

  // Wraps forward past the end back to Apple.
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('0')

  // Wraps backward past the start to the last enabled item.
  await userEvent.keyboard('{ArrowUp}')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('4')
})

test('Home/End jump to the first and last enabled items', async () => {
  const screen = render(ListboxFixture)
  await screen.getByTestId('input').click()

  await userEvent.keyboard('{End}')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('4')
  await userEvent.keyboard('{Home}')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('0')
})

test('typeahead jumps to the next item whose label starts with the typed character', async () => {
  const screen = render(ListboxFixture)
  await screen.getByTestId('input').click()

  await userEvent.keyboard('d')
  await expect.element(screen.getByTestId('active-index')).toHaveTextContent('3') // Date
})

test('Enter selects the active item', async () => {
  const screen = render(ListboxFixture)
  await screen.getByTestId('input').click()

  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('Banana')
})

test('activeId reflects listboxId-opt-index for the active row, undefined when none', async () => {
  const screen = render(ListboxFixture)
  await expect.element(screen.getByTestId('active-id')).toHaveTextContent('')

  await screen.getByTestId('input').click()
  await userEvent.keyboard('{ArrowDown}')
  await expect.element(screen.getByTestId('active-id')).toHaveTextContent('test-listbox-opt-0')
})

test('onActiveChange fires before activeIndex itself flips', async () => {
  const screen = render(ListboxFixture)
  await screen.getByTestId('input').click()
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard('{ArrowDown}')

  const log = screen.getByTestId('active-change-log').element().textContent
  // First step: -1 -> 0, onActiveChange(0) must see activeIndex still at -1.
  // Second step: 0 -> 1, onActiveChange(1) must see activeIndex still at 0.
  expect(log).toBe('0:-1,1:0')
})
