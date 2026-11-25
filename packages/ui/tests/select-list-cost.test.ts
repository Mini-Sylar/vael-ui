// What a long Select or Combobox list costs: plain rows when it isn't windowed, each row rendered
// once however often the panel around it re-renders, and nothing for the panel while it's closed.
import '../src/style.css'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
})

const items = Array.from({ length: 300 }, (_, i) => ({ value: i, label: `Option ${i}` }))
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')]
const frames = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
const real = { global: { stubs: { transition: false } } }

for (const [name, Component] of [
  ['Select', Select],
  ['Combobox', Combobox],
] as const) {
  test(`${name}: a list that isn't windowed renders plain rows, a label each and one tick`, async () => {
    const screen = await render(() =>
      h(Component as never, { items, modelValue: 3, virtualize: false, 'aria-label': 'x' }),
    )
    await screen.getByRole('combobox').click()
    await vi.waitFor(() => expect(options()).toHaveLength(300))
    const plain = options().filter((option) => !option.hasAttribute('data-selected'))
    expect(plain).toHaveLength(299)
    // Its label and nothing else: no placing style, no comment or anchor nodes, no tick.
    expect(plain.filter((option) => option.childNodes.length !== 1)).toEqual([])
    expect(plain.filter((option) => option.getAttribute('style'))).toEqual([])
    expect(document.querySelectorAll('.ui-select-option-check')).toHaveLength(1)
  })

  test(`${name}: a closed one mounts no Teleport`, async () => {
    const anchors = () =>
      [...document.body.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).length
    const before = anchors()
    await render(() =>
      h(
        'div',
        Array.from({ length: 10 }, () => h(Component as never, { items, 'aria-label': 'x' })),
      ),
    )
    await nextTick()
    expect(anchors()).toBe(before)
  })
}

test('each row renders once as the panel opens and is placed', async () => {
  let calls = 0
  const screen = await render(() =>
    h(
      Select as never,
      { items, virtualize: false, 'aria-label': 'x' },
      { item: ({ item }: { item: { label: string } }) => (calls++, h('span', item.label)) },
    ),
  )
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(options()).toHaveLength(300))
  await frames()
  // Once each; a second pass is allowed for the row the highlight starts on.
  expect(calls).toBeLessThanOrEqual(600)
  const afterOpen = calls
  await frames()
  expect(calls).toBe(afterOpen)
})

test('a press on a row keeps focus where it is; a press elsewhere in the list is left alone', async () => {
  const screen = await render(() =>
    h(Select as never, { items, virtualize: false, 'aria-label': 'x' }),
  )
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(options()).toHaveLength(300))
  const press = (target: Element) => {
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event.defaultPrevented
  }
  expect(press(options()[5]!.firstElementChild!)).toBe(true)
  expect(press(document.querySelector('[role="listbox"]')!)).toBe(false)
})

test('a tick shows at once on open, draws in on a pick, and fades on an unpick', async () => {
  const value = shallowRef<number[]>([1])
  const screen = await render(
    () =>
      h(Select as never, {
        items: items.slice(0, 8),
        multiple: true,
        modelValue: value.value,
        'onUpdate:modelValue': (next: number[]) => (value.value = next),
        'aria-label': 'x',
      }),
    real,
  )
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(options()).toHaveLength(8))
  const tick = (index: number) => options()[index]!.querySelector('.ui-select-option-check')
  // There as the list opens: no entrance.
  expect(tick(1)).not.toBeNull()
  expect(tick(1)!.classList.contains('ui-tick-enter-active')).toBe(false)
  // Picked on a row already showing: it draws in.
  options()[4]!.click()
  await nextTick()
  expect(tick(4)!.classList.contains('ui-tick-enter-active')).toBe(true)
  await vi.waitFor(() => expect(tick(4)!.classList.contains('ui-tick-enter-active')).toBe(false))
  // Unpicked: it fades out before it goes.
  options()[4]!.click()
  await nextTick()
  expect(tick(4)!.classList.contains('ui-tick-leave-active')).toBe(true)
  await vi.waitFor(() => expect(tick(4)).toBeNull())
})
