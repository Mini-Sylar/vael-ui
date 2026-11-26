// What a long Select or Combobox list costs: plain rows when it isn't windowed, each row rendered
// once however often the panel around it re-renders, and nothing for the panel while it's closed.
import '../src/style.css'
import { beforeEach, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
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

for (const [name, Component] of [
  ['Select', Select],
  ['Combobox', Combobox],
] as const) {
  test(`${name}: placing the panel restyles neither the rows nor what they inherit`, async () => {
    const writes: string[] = []
    const watcher = new MutationObserver((records) => {
      for (const record of records) {
        const el = record.target as HTMLElement
        if (el.classList?.contains('ui-select-positioner'))
          writes.push(el.getAttribute('style') ?? '')
      }
    })
    watcher.observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: true })
    const screen = await render(() =>
      h(Component as never, { items, virtualize: false, 'aria-label': 'x' }),
    )
    await screen.getByRole('combobox').click()
    await vi.waitFor(() => expect(options()).toHaveLength(300))
    await frames()
    watcher.disconnect()
    // Hidden until placed by a clip, which doesn't inherit; never by `visibility`, which does.
    expect(writes.some((style) => /(^|;\s*)visibility:/.test(style))).toBe(false)
    const positioner = document.querySelector<HTMLElement>('.ui-select-positioner')!
    expect(positioner.style.clip).toBe('')
    // The panel reads the trigger's width; the rows never see it.
    const read = (el: Element) => getComputedStyle(el).getPropertyValue('--ui-anchor-inline-size')
    expect(read(document.querySelector('.ui-select-panel')!)).not.toBe('')
    expect(read(options()[0]!)).toBe('')
  })
}

test('a long plain list comes in blocks the browser skips out of view, and keys still reach any row', async () => {
  const screen = await render(() =>
    h(Select as never, { items, virtualize: false, 'aria-label': 'x' }),
  )
  await screen.getByRole('combobox').click()
  await vi.waitFor(() => expect(options()).toHaveLength(300))
  const blocks = [...document.querySelectorAll<HTMLElement>('.ui-select-run')]
  expect(blocks).toHaveLength(6)
  expect(blocks.map((block) => getComputedStyle(block).contentVisibility)).toEqual([
    'visible',
    'auto',
    'auto',
    'auto',
    'auto',
    'auto',
  ])
  // Held at their rows' height: the list scrolls as far as before any block renders.
  const list = document.querySelector<HTMLElement>('[role="listbox"]')!
  expect(list.scrollHeight).toBeGreaterThan(options()[0]!.offsetHeight * 299)
  const inView = (row: Element) => {
    const box = list.getBoundingClientRect()
    const rect = row.getBoundingClientRect()
    return rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1
  }
  await userEvent.keyboard('{End}')
  const last = document.getElementById(list.querySelector('[data-active]')!.id)!
  expect(last.id.endsWith('-opt-299')).toBe(true)
  await vi.waitFor(() => expect(inView(last)).toBe(true))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() =>
    expect(list.querySelector('[data-active]')!.id.endsWith('-opt-0')).toBe(true),
  )
  await vi.waitFor(() => expect(inView(options()[0]!)).toBe(true))
})

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

for (const [name, Component, selector] of [
  ['Select', Select, '.ui-select-chevron'],
  ['Combobox', Combobox, '.ui-combobox-chevron'],
] as const) {
  test(`${name}: with motion off the chevron turns at once`, async () => {
    await render(() => h(Component as never, { items, motion: false, 'aria-label': 'x' }))
    const chevron = document.querySelector<HTMLElement>(selector)!
    expect(getComputedStyle(chevron).transitionDuration).toBe('0s')
  })
}
