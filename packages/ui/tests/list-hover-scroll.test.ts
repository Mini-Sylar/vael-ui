import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CommandPalette from '../src/components/CommandPalette/CommandPalette.vue'
import SelectFixture from './fixtures/SelectFixture.vue'
import ComboboxFixture from './fixtures/ComboboxFixture.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

const frames = (n: number) =>
  new Promise<void>((done) => {
    const tick = () => (--n ? requestAnimationFrame(tick) : done())
    requestAnimationFrame(tick)
  })

function scroller() {
  let el = document.querySelector<HTMLElement>('[role="option"]')?.parentElement ?? null
  while (el && el.scrollHeight <= el.clientHeight) el = el.parentElement
  return el!
}

// Points at the visible part of the option the list's bottom edge cuts through, in page coordinates
// so the pointer isn't scrolled to the row first.
async function pointAtHalfHidden(list: HTMLElement) {
  const bottom = list.getBoundingClientRect().bottom
  const row = [...list.querySelectorAll<HTMLElement>('[role="option"]')].find((el) => {
    const box = el.getBoundingClientRect()
    return box.top < bottom - 6 && box.bottom > bottom + 2
  })
  expect(row, 'a row the list edge cuts through').toBeTruthy()
  const box = row!.getBoundingClientRect()
  await userEvent.hover(document.documentElement, {
    position: { x: box.left + box.width / 2, y: (box.top + bottom) / 2 },
  })
  await vi.waitFor(() => expect(row!.hasAttribute('data-active')).toBe(true))
  await frames(3)
}

// Each checks: pointing at a half-hidden row leaves the list where it is; the keyboard still scrolls.
test('CommandPalette: pointing at a half-hidden row does not scroll the list', async () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, label: `Command ${i}` }))
  await render(CommandPalette, { props: { open: true, items } })
  await vi.waitFor(() => expect(document.querySelectorAll('[role="option"]')).toHaveLength(30))
  await frames(20)
  const list = scroller()
  const before = list.scrollTop
  await pointAtHalfHidden(list)
  expect(list.scrollTop).toBe(before)
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(list.scrollTop).toBeGreaterThan(before))
})

test('Select: pointing at a half-hidden option does not scroll the list', async () => {
  const screen = await render(SelectFixture, { props: { itemCount: 30 } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() =>
    expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(5),
  )
  await frames(20)
  const list = scroller()
  const before = list.scrollTop
  await pointAtHalfHidden(list)
  expect(list.scrollTop).toBe(before)
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(list.scrollTop).toBeGreaterThan(before))
})

test('Combobox: pointing at a half-hidden option does not scroll the list', async () => {
  const screen = await render(ComboboxFixture, { props: { itemCount: 30 } })
  await screen.getByRole('combobox').click()
  await vi.waitFor(() =>
    expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(5),
  )
  await frames(20)
  const list = scroller()
  const before = list.scrollTop
  await pointAtHalfHidden(list)
  expect(list.scrollTop).toBe(before)
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(list.scrollTop).toBeGreaterThan(before))
})
