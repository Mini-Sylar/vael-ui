// A closed popover sets up as little as it can: its panel's parts wait for the first open.
import '../src/style.css'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import Popover from '../src/components/Popover/Popover.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-popover-positioner')) el.remove()
})

const trigger = () => h('button', { type: 'button' }, 'Open')
const slots = { trigger, default: () => 'Body' }

// A Teleport leaves two empty text nodes in its target.
const bodyAnchors = () =>
  [...document.body.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).length

test('closed popovers mount no Teleport; forceMount still does', async () => {
  const before = bodyAnchors()
  const screen = await render(
    defineComponent({
      setup: () => () =>
        Array.from({ length: 10 }, () =>
          h(Popover as never, { motion: false, openOnTriggerClick: true }, slots),
        ),
    }),
  )
  await nextTick()
  expect(bodyAnchors()).toBe(before)
  screen.unmount()
  await render(() => h(Popover as never, { forceMount: true }, slots))
  expect(document.querySelector('.ui-popover-positioner')).not.toBeNull()
})

test('a closed popover sets up a fixed number of watchers', async () => {
  const popover = shallowRef<{ $: { scope: { deps?: { nextDep?: unknown } } } }>()
  await render(() =>
    h(Popover as never, { ref: popover, motion: false, openOnTriggerClick: true }, slots),
  )
  await nextTick()
  let effects = 0
  for (let link = popover.value!.$.scope.deps; link; link = link.nextDep as typeof link) effects++
  // Was 21, when the trigger's MutationObserver was a watcher of its own beside the trigger's.
  // Then 19, while its motion set up a watcher per job before it ever opened.
  expect(effects).toBeLessThanOrEqual(15)
})

test('the first open plays the enter, and every open after it too', async () => {
  const open = shallowRef(false)
  await render(
    () =>
      h(
        Popover as never,
        {
          open: open.value,
          openOnTriggerClick: true,
          'onUpdate:open': (v: boolean) => (open.value = v),
        },
        slots,
      ),
    { global: { stubs: { transition: false } } },
  )
  const moving = () =>
    (document.querySelector('.ui-popover-panel')?.getAnimations({ subtree: true }).length ?? 0) > 0
  for (let round = 0; round < 2; round++) {
    open.value = true
    await vi.waitFor(() => expect(moving()).toBe(true))
    open.value = false
    await vi.waitFor(() => expect(document.querySelector('.ui-popover-panel')).toBeNull())
  }
})

test('a trigger that changes while closed is still the one the panel opens from', async () => {
  const label = shallowRef('One')
  const open = shallowRef(false)
  await render(() =>
    h(
      Popover as never,
      { open: open.value, motion: false, openOnTriggerClick: true },
      {
        trigger: () => h('button', { type: 'button', key: label.value }, label.value),
        default: () => 'Body',
      },
    ),
  )
  label.value = 'Two'
  await nextTick()
  const button = document.querySelector('.ui-popover-trigger button')!
  expect(button.textContent).toBe('Two')
  await vi.waitFor(() => expect(button.getAttribute('aria-expanded')).toBe('false'))
  open.value = true
  await vi.waitFor(() => expect(button.getAttribute('aria-expanded')).toBe('true'))
  await vi.waitFor(() => expect(document.querySelector('.ui-popover-panel')).not.toBeNull())
})
