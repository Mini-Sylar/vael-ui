// A closed Dialog (and Drawer) mounts no panel parts and binds nothing to the document.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Drawer from '../src/components/Drawer/Drawer.vue'

const body = { default: () => 'Body' }
// A Teleport leaves two empty text nodes in its target.
const bodyAnchors = () =>
  [...document.body.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).length

test('closed dialogs and drawers mount no Teleport; forceMount still does', async () => {
  const before = bodyAnchors()
  const screen = await render(
    defineComponent({
      setup: () => () => [
        ...Array.from({ length: 5 }, () => h(Dialog as never, { title: 'T' }, body)),
        ...Array.from({ length: 5 }, () => h(Drawer as never, { title: 'T' }, body)),
      ],
    }),
  )
  await nextTick()
  expect(bodyAnchors()).toBe(before)
  screen.unmount()
  await render(() => h(Dialog as never, { title: 'T', forceMount: true }, body))
  expect(document.querySelector('.ui-dialog')).not.toBeNull()
})

test('a closed dialog sets up a fixed number of watchers', async () => {
  const dialog = shallowRef<{ $: { scope: { deps?: { nextDep?: unknown } } } }>()
  await render(() => h(Dialog as never, { ref: dialog, title: 'T' }, body))
  await nextTick()
  let effects = 0
  for (let link = dialog.value!.$.scope.deps; link; link = link.nextDep as typeof link) effects++
  // Was 23, with watchers for the document Tab listener, the new-content observer and transitionend.
  expect(effects).toBeLessThanOrEqual(20)
})

test('the first open plays the enter, and every open after it too', async () => {
  const open = shallowRef(false)
  await render(() => h(Dialog as never, { title: 'T', open: open.value }, body), {
    global: { stubs: { transition: false } },
  })
  const moving = () =>
    (document.querySelector('.ui-dialog-panel')?.getAnimations({ subtree: true }).length ?? 0) > 0
  for (let round = 0; round < 2; round++) {
    open.value = true
    await vi.waitFor(() => expect(moving()).toBe(true))
    open.value = false
    await vi.waitFor(() => expect(document.querySelector('.ui-dialog-panel')).toBeNull())
  }
})

test('the Tab trap is bound to the document only while open, and off again on an unmount', async () => {
  const added: unknown[] = []
  const removed: unknown[] = []
  const add = vi.spyOn(document, 'addEventListener').mockImplementation(function (
    this: Document,
    ...args: Parameters<Document['addEventListener']>
  ) {
    if (args[0] === 'keydown') added.push(args[1])
    return EventTarget.prototype.addEventListener.apply(this, args)
  })
  const remove = vi.spyOn(document, 'removeEventListener').mockImplementation(function (
    this: Document,
    ...args: Parameters<Document['removeEventListener']>
  ) {
    if (args[0] === 'keydown') removed.push(args[1])
    return EventTarget.prototype.removeEventListener.apply(this, args)
  })
  try {
    const open = shallowRef(false)
    const screen = await render(() =>
      h(Dialog as never, { title: 'T', open: open.value, motion: false }, body),
    )
    await nextTick()
    expect(added).toHaveLength(0)
    open.value = true
    // Its own Tab trap, and the shared layer stack's Escape listener.
    await vi.waitFor(() => expect(added).toHaveLength(2))
    open.value = false
    await vi.waitFor(() => expect(removed).toHaveLength(2))
    open.value = true
    await vi.waitFor(() => expect(added).toHaveLength(4))
    screen.unmount()
    expect(removed).toHaveLength(4)
  } finally {
    add.mockRestore()
    remove.mockRestore()
  }
})

test('maximizing still eases its size, and lets go of it when the ease ends', async () => {
  const maximized = shallowRef(false)
  await render(() =>
    h(
      Dialog as never,
      {
        title: 'T',
        open: true,
        maximizable: true,
        maximized: maximized.value,
        'onUpdate:maximized': (v: boolean) => (maximized.value = v),
      },
      body,
    ),
  )
  const panel = await vi.waitFor(() => document.querySelector<HTMLElement>('.ui-dialog-panel')!)
  document.querySelector<HTMLElement>('.ui-dialog-maximize')!.click()
  await vi.waitFor(() => expect(panel.classList.contains('ui-dialog-panel--resizing')).toBe(true))
  await vi.waitFor(() => expect(panel.classList.contains('ui-dialog-panel--resizing')).toBe(false))
  expect(maximized.value).toBe(true)
})
