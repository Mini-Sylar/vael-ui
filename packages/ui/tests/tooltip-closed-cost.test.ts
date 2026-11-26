// A closed Tooltip mounts no panel parts, and its listeners cost one watcher per element.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import Tooltip from '../src/components/Tooltip/Tooltip.vue'

type SetTrigger = (el: Element | ComponentPublicInstance | null) => void
const slots = {
  trigger: ({ setTriggerEl }: { setTriggerEl: SetTrigger }) =>
    h('button', { type: 'button', ref: setTriggerEl }, 'Save'),
  default: () => 'Saves the draft',
}
// A Teleport leaves two empty text nodes in its target.
const bodyAnchors = () =>
  [...document.body.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).length

test('closed tooltips mount no Teleport; forceMount still does', async () => {
  const before = bodyAnchors()
  const screen = await render(
    defineComponent({
      setup: () => () => Array.from({ length: 10 }, () => h(Tooltip as never, null, slots)),
    }),
  )
  await nextTick()
  expect(bodyAnchors()).toBe(before)
  screen.unmount()
  await render(() => h(Tooltip as never, { forceMount: true }, slots))
  expect(document.querySelector('.ui-tooltip-positioner')).not.toBeNull()
})

test('a closed tooltip sets up a fixed number of watchers', async () => {
  const tooltip = shallowRef<{ $: { scope: { deps?: { nextDep?: unknown } } } }>()
  await render(() => h(Tooltip as never, { ref: tooltip }, slots))
  await nextTick()
  let effects = 0
  for (let link = tooltip.value!.$.scope.deps; link; link = link.nextDep as typeof link) effects++
  // Was 23: each of its fourteen trigger, panel and window listeners had a watcher of its own.
  expect(effects).toBeLessThanOrEqual(12)
})

test('the first open plays the enter, and every open after it too', async () => {
  const open = shallowRef(false)
  await render(() => h(Tooltip as never, { open: open.value }, slots), {
    global: { stubs: { transition: false } },
  })
  const moving = () =>
    (document.querySelector('.ui-tooltip-positioner')?.getAnimations({ subtree: true }).length ??
      0) > 0
  for (let round = 0; round < 2; round++) {
    open.value = true
    await vi.waitFor(() => expect(moving()).toBe(true))
    open.value = false
    await vi.waitFor(() => expect(document.querySelector('.ui-tooltip-positioner')).toBeNull())
    // Past the warm window, so the next open is a cold one that animates.
    await new Promise((resolve) => setTimeout(resolve, 350))
  }
})

test('trigger listeners move with the trigger, and Escape is bound only while open', async () => {
  const added: string[] = []
  const add = vi.spyOn(window, 'addEventListener').mockImplementation(function (
    this: Window,
    ...args: Parameters<Window['addEventListener']>
  ) {
    added.push(args[0])
    return EventTarget.prototype.addEventListener.apply(this, args)
  })
  try {
    const which = shallowRef('a')
    const open = shallowRef(false)
    const opened: boolean[] = []
    await render(() =>
      h(
        Tooltip as never,
        {
          open: open.value,
          openDelay: 0,
          'onUpdate:open': (v: boolean) => {
            opened.push(v)
            open.value = v
          },
        },
        {
          trigger: ({ setTriggerEl }: { setTriggerEl: SetTrigger }) =>
            h('button', { type: 'button', key: which.value, ref: setTriggerEl }, which.value),
          default: () => 'Tip',
        },
      ),
    )
    await nextTick()
    expect(added.filter((type) => type === 'keydown')).toHaveLength(0)
    which.value = 'b'
    await nextTick()
    await nextTick()
    document.querySelector('button')!.dispatchEvent(new PointerEvent('pointerenter'))
    await vi.waitFor(() => expect(opened).toEqual([true]))
    await vi.waitFor(() => expect(added.filter((type) => type === 'keydown')).toHaveLength(1))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await vi.waitFor(() => expect(opened).toEqual([true, false]))
  } finally {
    add.mockRestore()
  }
})
