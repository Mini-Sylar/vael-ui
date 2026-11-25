// A closed menu sets up as little as it can: its popup parts wait for the first open.
import '../src/style.css'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import Menu from '../src/components/Menu/Menu.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

const items = Array.from({ length: 5 }, (_, i) => ({
  label: `Item ${i + 1}`,
  value: String(i + 1),
}))
const trigger = () => h('button', { type: 'button', class: 'open' }, 'Open')
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

function many(count: number, props: Record<string, unknown> = {}) {
  return defineComponent({
    setup: () => () =>
      Array.from({ length: count }, () =>
        h(Menu as never, { items, motion: false, ...props }, { trigger }),
      ),
  })
}

// Each read of document.fonts.ready makes the browser update style and layout.
let fontsReads = 0
beforeEach(() => {
  fontsReads = 0
  const fonts = document.fonts
  const ready = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(fonts), 'ready')!
  Object.defineProperty(fonts, 'ready', {
    configurable: true,
    get: () => (fontsReads++, ready.get!.call(fonts)),
  })
})
afterEach(() => {
  delete (document.fonts as unknown as { ready?: unknown }).ready
})

test('closed menus never read document.fonts.ready; the first open reads it once', async () => {
  const screen = await render(many(20))
  await nextTick()
  await frame()
  expect(fontsReads).toBe(0)
  await screen.container.querySelector<HTMLElement>('.open')!.click()
  await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull())
  await vi.waitFor(() => expect(fontsReads).toBe(1))
})

// A Teleport leaves two empty text nodes in its target.
const bodyAnchors = () =>
  [...document.body.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).length

test('closed menus mount no Teleport; forceMount still does', async () => {
  const before = bodyAnchors()
  const screen = await render(many(10))
  await nextTick()
  expect(bodyAnchors()).toBe(before)
  screen.unmount()
  await render(many(1, { forceMount: true }))
  expect(document.querySelector('.ui-menu-positioner')).not.toBeNull()
})

test('a closed menu sets up a fixed number of watchers', async () => {
  const menu = shallowRef<{ $: { scope: { deps?: { nextDep?: unknown } } } }>()
  await render(() => h(Menu as never, { ref: menu, items, motion: false }, { trigger }))
  await nextTick()
  let effects = 0
  for (let link = menu.value!.$.scope.deps; link; link = link.nextDep as typeof link) effects++
  // Was 46, when each popover document listener and highlight list listener had its own watcher.
  expect(effects).toBeLessThanOrEqual(37)
})

test('the first open plays the enter, and every open after it too', async () => {
  const open = shallowRef(false)
  await render(
    () =>
      h(
        Menu as never,
        { open: open.value, items, 'onUpdate:open': (v: boolean) => (open.value = v) },
        { trigger },
      ),
    { global: { stubs: { transition: false } } },
  )
  const moving = () =>
    (document.querySelector('.ui-menu-panel')?.getAnimations({ subtree: true }).length ?? 0) > 0
  for (let round = 0; round < 2; round++) {
    open.value = true
    await vi.waitFor(() => expect(moving()).toBe(true))
    open.value = false
    await vi.waitFor(() => expect(document.querySelector('.ui-menu-panel')).toBeNull())
  }
})

test('document listeners come and go with the open menu, and with an unmount while open', async () => {
  const added: string[] = []
  const removed: string[] = []
  const add = vi.spyOn(document, 'addEventListener').mockImplementation(function (
    this: Document,
    ...args: Parameters<Document['addEventListener']>
  ) {
    added.push(args[0])
    return EventTarget.prototype.addEventListener.apply(this, args)
  })
  const remove = vi.spyOn(document, 'removeEventListener').mockImplementation(function (
    this: Document,
    ...args: Parameters<Document['removeEventListener']>
  ) {
    removed.push(args[0])
    return EventTarget.prototype.removeEventListener.apply(this, args)
  })
  try {
    const open = shallowRef(false)
    const screen = await render(() =>
      h(Menu as never, { open: open.value, items, motion: false }, { trigger }),
    )
    await nextTick()
    const types = ['keydown', 'pointerdown', 'pointerup', 'pointercancel', 'focusin']
    const ours = (list: string[]) => list.filter((type) => types.includes(type)).length
    expect(ours(added)).toBe(0)
    open.value = true
    // Its own six, and the shared layer stack's Escape listener.
    await vi.waitFor(() => expect(ours(added)).toBe(7))
    open.value = false
    await vi.waitFor(() => expect(ours(removed)).toBe(7))
    open.value = true
    await vi.waitFor(() => expect(ours(added)).toBe(14))
    screen.unmount()
    expect(ours(removed)).toBe(14)
  } finally {
    add.mockRestore()
    remove.mockRestore()
  }
})
