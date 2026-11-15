import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Sortable from '../src/components/Sortable/Sortable.vue'

const real = { global: { stubs: { transition: false, 'transition-group': false } } }

function sortableInDialog() {
  const open = shallowRef(true)
  const items = shallowRef([
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ])
  const Page = defineComponent({
    setup: () => () =>
      h(
        Dialog as never,
        {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          'aria-label': 'Main',
        },
        () =>
          h(Sortable as never, {
            items: items.value,
            'onUpdate:items': (v: typeof items.value) => (items.value = v),
          }),
      ),
  })
  return { open, items, Page }
}
const handles = () => Array.from(document.querySelectorAll<HTMLElement>('.ui-sortable-handle'))
const status = () => document.querySelector('.ui-sortable [role="status"]')!

test('Escape during a keyboard grab cancels the move, not the Dialog', async () => {
  const { open, items, Page } = sortableInDialog()
  await render(Page, real)
  await vi.waitFor(() => expect(handles().length).toBe(3))
  handles()[0]!.focus()
  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(handles()[0]!.getAttribute('aria-pressed')).toBe('true'))
  expect(handles()[1]!.getAttribute('aria-pressed')).toBe('false')
  expect(status().getAttribute('aria-live')).toBe('polite')
  await userEvent.keyboard('{ArrowDown}{Escape}')
  await vi.waitFor(() => expect(status().textContent).toContain('cancelled'))
  expect(open.value).toBe(true)
  expect(items.value.map((i) => i.value)).toEqual(['a', 'b', 'c'])
  await vi.waitFor(() => expect(handles()[0]!.getAttribute('aria-pressed')).toBe('false'))
  // With no grab, Escape closes the Dialog as before.
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(open.value).toBe(false))
})

test('Escape during a pointer drag cancels the drag, not the Dialog', async () => {
  const { open, Page } = sortableInDialog()
  await render(Page, real)
  await vi.waitFor(() => expect(handles().length).toBe(3))
  const handle = handles()[0]!
  const box = handle.getBoundingClientRect()
  const pointerId = 71
  const at = (dy: number) => ({
    bubbles: true,
    pointerId,
    button: 0,
    clientX: box.left + 4,
    clientY: box.top + 4 + dy,
  })
  handle.dispatchEvent(new PointerEvent('pointerdown', at(0)))
  for (const dy of [6, 12, 18]) {
    window.dispatchEvent(new PointerEvent('pointermove', at(dy)))
    await new Promise((r) => requestAnimationFrame(r))
  }
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-sortable-item[data-grabbed]')).not.toBeNull(),
  )
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  )
  await vi.waitFor(() => expect(status().textContent).toContain('cancelled'))
  expect(open.value).toBe(true)
  window.dispatchEvent(new PointerEvent('pointerup', at(18)))
})
