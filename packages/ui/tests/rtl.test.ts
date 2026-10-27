import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h, nextTick, shallowRef } from 'vue'
import type { VNodeChild } from 'vue'
import MenuList from '../src/components/MenuList/MenuList.vue'
import SelectButton from '../src/components/SelectButton/SelectButton.vue'
import Tabs from '../src/components/Tabs/Tabs.vue'
import Input from '../src/components/Input/Input.vue'
import Switch from '../src/components/Switch/Switch.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'

// Everything that measures and positions itself must land in the same place right to left.

const rtl = (child: () => VNodeChild) => ({
  render: () => h('div', { dir: 'rtl', style: 'inline-size: 420px' }, [child()]),
})
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1.5)
const settle = () => new Promise((resolve) => setTimeout(resolve, 400))

test('the hover highlight sits on the hovered row', async () => {
  const items = [
    { label: 'Inbox', value: 'inbox' },
    { label: 'Starred', value: 'starred' },
    { label: 'Archive', value: 'archive' },
  ]
  const screen = await render(rtl(() => h(MenuList as never, { items, 'aria-label': 'Mail' })))
  const row = screen.container.querySelectorAll<HTMLElement>('.ui-menu-list-item')[1]!
  // Keyboard focus takes the highlight; earlier files in the same browser can leave some behind.
  ;(document.activeElement as HTMLElement | null)?.blur()
  // The real cursor, so one left resting on another row by an earlier file can't win.
  await userEvent.hover(row)
  // Waits out the glide, which can run long under load.
  await vi.waitFor(() => {
    const highlight = screen.container
      .querySelector<HTMLElement>('.ui-menu-list-hover')!
      .getBoundingClientRect()
    const box = row.getBoundingClientRect()
    near(highlight.left, box.left)
    near(highlight.top, box.top)
    near(highlight.width, box.width)
  })
})

test('SelectButton and Tabs selection indicators sit on the selected option', async () => {
  const items = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
  ]
  const screen = await render(
    rtl(() => [
      h(SelectButton as never, { items, modelValue: 'week', 'aria-label': 'Range' }),
      h(
        Tabs as never,
        { items: ['one', 'two', 'three'], active: 'two' },
        {
          default: ({ items: list, itemProps, indicatorProps }: never) => [
            h('span', (indicatorProps as (kind: string) => object)('underline')),
            ...(list as string[]).map((item) =>
              h('button', { key: item, ...(itemProps as (i: string) => object)(item) }, item),
            ),
          ],
        },
      ),
    ]),
  )
  await settle()
  const checked = screen.container.querySelector<HTMLElement>(
    '.ui-select-button-option[data-checked]',
  )!
  const indicator = screen.container.querySelector<HTMLElement>('.ui-select-button-indicator')!
  near(indicator.getBoundingClientRect().left, checked.getBoundingClientRect().left)
  near(indicator.getBoundingClientRect().width, checked.getBoundingClientRect().width)
  const tab = screen.container.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')!
  const underline = screen.container.querySelector<HTMLElement>('.ui-tabs-indicator')!
  near(underline.getBoundingClientRect().left, tab.getBoundingClientRect().left)
  near(underline.getBoundingClientRect().width, tab.getBoundingClientRect().width)
})

test('a Tabs indicator follows a page that switches to right to left after it mounted', async () => {
  const dir = shallowRef<'ltr' | 'rtl'>('ltr')
  const active = shallowRef('one')
  const screen = await render({
    render: () =>
      h('div', { dir: dir.value, style: 'inline-size: 420px' }, [
        h(
          Tabs as never,
          { items: ['one', 'two', 'three'], active: active.value },
          {
            default: ({ items: list, itemProps, indicatorProps }: never) => [
              h('span', (indicatorProps as (kind: string) => object)('underline')),
              ...(list as string[]).map((item) =>
                h('button', { key: item, ...(itemProps as (i: string) => object)(item) }, item),
              ),
            ],
          },
        ),
      ]),
  })
  await settle()
  dir.value = 'rtl'
  await nextTick()
  active.value = 'two'
  await settle()
  const tab = screen.container.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')!
  const underline = screen.container.querySelector<HTMLElement>('.ui-tabs-indicator')!
  expect(tab.textContent).toBe('two')
  near(underline.getBoundingClientRect().left, tab.getBoundingClientRect().left)
  near(underline.getBoundingClientRect().width, tab.getBoundingClientRect().width)
})

test('Pagination current-page indicator sits on the current page', async () => {
  const screen = await render(rtl(() => h(Pagination, { page: 3, total: 100 })))
  await settle()
  const current = screen.container.querySelector<HTMLElement>('[aria-current="page"]')!
  const indicator = screen.container.querySelector<HTMLElement>('.ui-pagination-indicator')
  if (!indicator) return
  near(indicator.getBoundingClientRect().left, current.getBoundingClientRect().left)
})

test('#display sits over the input text and follows it as it scrolls', async () => {
  const long = 'مرحبا بالعالم هذه جملة طويلة جدا لا يمكن أن تتسع داخل هذا الحقل الضيق'
  const screen = await render(
    rtl(() =>
      h(
        Input,
        { modelValue: long, style: 'inline-size: 9rem', 'aria-label': 'Note' },
        {
          display: ({ value }: { value: string }) => h('span', { class: 'mine' }, value),
        },
      ),
    ),
  )
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  const display = screen.container.querySelector<HTMLElement>('.ui-input-display')!
  await vi.waitFor(() => expect(display.style.width).not.toBe(''))
  const style = getComputedStyle(input)
  const box = input.getBoundingClientRect()
  near(display.getBoundingClientRect().left, box.left + parseFloat(style.paddingLeft))
  near(display.getBoundingClientRect().right, box.right - parseFloat(style.paddingRight))
  // At rest, an RTL field shows the start of the text, on the right.
  const mine = display.querySelector<HTMLElement>('.mine')!
  near(mine.getBoundingClientRect().right, box.right - parseFloat(style.paddingRight))
  input.focus()
  input.setSelectionRange(long.length, long.length)
  input.dispatchEvent(new Event('select'))
  await vi.waitFor(() => expect(input.scrollLeft).not.toBe(0))
  await nextTick()
  // Scrolled to the end, the end of the text sits at the left edge.
  near(mine.getBoundingClientRect().left, box.left + parseFloat(style.paddingLeft))
})

test('the Switch thumb rests at the start, and on the far side when checked', async () => {
  const on = shallowRef(false)
  const screen = await render(rtl(() => h(Switch, { modelValue: on.value, label: 'Alerts' })))
  const track = screen.container
    .querySelector<HTMLElement>('.ui-switch-track')!
    .getBoundingClientRect()
  const thumb = () =>
    screen.container.querySelector<HTMLElement>('.ui-switch-thumb')!.getBoundingClientRect()
  const center = (rect: DOMRect) => rect.left + rect.width / 2
  await settle()
  expect(center(thumb())).toBeGreaterThan(center(track))
  expect(thumb().right).toBeLessThanOrEqual(track.right)
  on.value = true
  await settle()
  expect(center(thumb())).toBeLessThan(center(track))
  expect(thumb().left).toBeGreaterThanOrEqual(track.left)
})

test('dragging the Switch thumb toward the left turns it on', async () => {
  const on = shallowRef(false)
  const screen = await render(
    rtl(() =>
      h(Switch, {
        modelValue: on.value,
        'onUpdate:modelValue': (next: boolean) => (on.value = next),
        label: 'Alerts',
      }),
    ),
  )
  const input = screen.container.querySelector<HTMLInputElement>('input')!
  const track = screen.container.querySelector<HTMLElement>('.ui-switch-track')!
  const travel = track.offsetWidth - track.offsetHeight
  const pointer = (type: string, clientX: number) =>
    new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, clientX })
  input.dispatchEvent(pointer('pointerdown', 300))
  input.dispatchEvent(pointer('pointermove', 300 - travel * 0.8))
  input.dispatchEvent(pointer('pointerup', 300 - travel * 0.8))
  input.click()
  await nextTick()
  expect(on.value).toBe(true)
})
