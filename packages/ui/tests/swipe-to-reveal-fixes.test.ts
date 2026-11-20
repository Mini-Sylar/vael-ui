// SwipeToReveal: right to left, Escape inside a Dialog, and an open row following its panel's size.
import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import SwipeToReveal from '../src/components/SwipeToReveal/SwipeToReveal.vue'

const pointerId = 1
const down = (el: Element, clientX: number) =>
  el.dispatchEvent(new PointerEvent('pointerdown', { clientX, pointerId, bubbles: true }))
const move = (clientX: number) =>
  window.dispatchEvent(new PointerEvent('pointermove', { clientX, pointerId, bubbles: true }))
const up = (clientX: number) =>
  window.dispatchEvent(new PointerEvent('pointerup', { clientX, pointerId, bubbles: true }))
const frames = async (n = 3) => {
  for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame)
}

test('right to left: dragging left reveals the leading actions, on the right', async () => {
  const side = shallowRef<string | null>(null)
  const screen = await render(() =>
    h('div', { dir: 'rtl', style: 'width: 300px' }, [
      h(
        SwipeToReveal,
        { motion: false, onChange: (_: boolean, s: string | null) => (side.value = s) },
        {
          default: () => 'Row',
          'leading-actions': () => h('button', { style: 'width: 80px' }, 'Pin'),
        },
      ),
    ]),
  )
  const content = screen.container.querySelector<HTMLElement>('.ui-swipe-reveal-content')!
  const actions = screen.container.querySelector<HTMLElement>('.ui-swipe-reveal-actions')!
  down(content, 200)
  move(190)
  move(100)
  up(100)
  await frames()
  expect(side.value).toBe('leading')
  // The content moved left, uncovering the panel on the right.
  expect(content.getBoundingClientRect().right).toBeCloseTo(actions.getBoundingClientRect().left, 0)
  expect(getComputedStyle(actions).transformOrigin.startsWith('80px')).toBe(true)
})

test('Escape in an open row inside a Dialog closes the row, not the dialog', async () => {
  const open = shallowRef(true)
  const row = shallowRef(true)
  await render(() =>
    h(
      Dialog as never,
      { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v), title: 'Rows' },
      () =>
        h(
          SwipeToReveal,
          { open: row.value, 'onUpdate:open': (v: boolean) => (row.value = v), motion: false },
          {
            default: () => 'Row',
            'trailing-actions': () => h('button', { class: 'act' }, 'Delete'),
          },
        ),
    ),
  )
  await vi.waitFor(() => expect(document.querySelector('.act')).toBeTruthy())
  document.querySelector<HTMLElement>('.act')!.focus()
  await userEvent.keyboard('{Escape}')
  await nextTick()
  expect(row.value).toBe(false)
  expect(open.value).toBe(true)
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(open.value).toBe(false))
})

test('an open row follows its actions panel when it resizes', async () => {
  const width = shallowRef(80)
  const screen = await render(() =>
    h(
      SwipeToReveal,
      { open: true, motion: false },
      {
        default: () => 'Row',
        'trailing-actions': () => h('button', { style: `width: ${width.value}px` }, 'Delete'),
      },
    ),
  )
  const content = screen.container.querySelector<HTMLElement>('.ui-swipe-reveal-content')!
  const x = () => new DOMMatrix(getComputedStyle(content).transform).m41
  await vi.waitFor(() => expect(x()).toBe(-80))
  width.value = 120
  await vi.waitFor(() => expect(x()).toBe(-120))
})
