import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CascadeSelectFixture from './fixtures/CascadeSelectFixture.vue'
import MenuFixture from './fixtures/MenuFixture.vue'
import type { CascadeSelectItem } from '../src/components/CascadeSelect/CascadeSelect.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

function focusedText() {
  return document.activeElement?.textContent?.trim()
}

// Every other row is a branch, so each one would otherwise mount a closed submenu Menu.
function longTree(count: number): CascadeSelectItem[] {
  return Array.from({ length: count }, (_, i) => ({
    label: i === 700 ? 'Zebra' : `City ${i}`,
    value: `c${i}`,
    children: i % 2 ? [{ label: `District ${i}`, value: `d${i}` }] : undefined,
  }))
}

function rootRows() {
  return document
    .querySelectorAll('.ui-menu-positioner .ui-menu-body')[0]!
    .querySelectorAll('[role="menuitem"]')
}

test('opening a CascadeSelect with 1000 root items renders a window of rows, quickly', async () => {
  const screen = await render(CascadeSelectFixture, { props: { items: longTree(1000) } })
  const trigger = screen.container.querySelector<HTMLElement>('[role="combobox"]')!
  const start = performance.now()
  trigger.click()
  await vi.waitFor(() => expect(focusedText()).toBe('City 0'), { interval: 1 })
  const elapsed = performance.now() - start
  expect(rootRows().length).toBeLessThan(100)
  expect(elapsed).toBeLessThan(120)
})

test('a long menu keeps End, Home, wrap-around and typeahead across the whole list', async () => {
  const screen = await render(CascadeSelectFixture, { props: { items: longTree(1000) } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('City 0'))

  await userEvent.keyboard('{End}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 999'))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 0'))
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 999'))
  await userEvent.keyboard('{Home}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 0'))
  await userEvent.keyboard('{ArrowDown}{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 2'))

  await userEvent.keyboard('z')
  await vi.waitFor(() => expect(focusedText()).toBe('Zebra'))
  expect(rootRows().length).toBeLessThan(100)
})

test('a submenu far down a long menu opens, selects, and is revealed again on reopen', async () => {
  const screen = await render(CascadeSelectFixture, { props: { items: longTree(1000) } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('City 0'))

  await userEvent.keyboard('{End}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 999'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('District 999'))
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 999'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(focusedText()).toBe('District 999'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('d999')
  await expect.element(screen.getByTestId('path')).toHaveTextContent('c999>d999')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')

  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('District 999'))
  await userEvent.keyboard('{ArrowLeft}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 999'))
})

test('ArrowUp on the trigger of a long Menu opens on its last row', async () => {
  const screen = await render(MenuFixture, { props: { itemCount: 300 } })
  screen.getByTestId('trigger').element().focus()
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(focusedText()).toBe('Item 299'))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('selected')).toHaveTextContent('item-299')
})

test('scrolling a focused row out of a long menu keeps keyboard focus inside the menu', async () => {
  const screen = await render(CascadeSelectFixture, { props: { items: longTree(1000) } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(focusedText()).toBe('City 0'))
  const body = document.querySelector<HTMLElement>('.ui-menu-positioner .ui-menu-body')!
  body.scrollTop = 20000
  body.dispatchEvent(new Event('scroll'))
  await vi.waitFor(() => expect(body.querySelector('[data-menu-index="0"]')).toBeNull())
  expect(body.contains(document.activeElement)).toBe(true)
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(focusedText()).toBe('City 1'))
})
