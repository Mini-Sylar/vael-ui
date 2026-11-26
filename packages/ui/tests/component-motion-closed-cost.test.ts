// A closed popup's motion costs two watchers and resolves nothing until it opens or is customised.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, withDirectives } from 'vue'
import DatePicker from '../src/components/DatePicker/DatePicker.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Popover from '../src/components/Popover/Popover.vue'
import { useComponentMotion } from '../src/motion/useComponentMotion'
import { vAnimate } from '../src/motion/vAnimate'

afterEach(() => {
  document.body.innerHTML = ''
})

type Instance = { scope: { deps?: { nextDep?: unknown } } }
const effectsOf = (instance: Instance) => {
  let count = 0
  for (let link = instance.scope.deps; link; link = link.nextDep as typeof link) count++
  return count
}
const frame = () => new Promise(requestAnimationFrame)

test('an uncustomised closed component sets up two watchers and resolves nothing', async () => {
  let resolves = 0
  const instance = shallowRef<{ $: Instance }>()
  const Bare = defineComponent({
    setup() {
      useComponentMotion({
        name: 'Bare',
        role: 'overlay',
        key: 'popover',
        mainPart: 'panel',
        parts: () => ({}),
        root: () => null,
        motion: () => undefined,
        defaults: () => {
          resolves++
          return { panel: { opacity: 0 } }
        },
        owns: () => true,
        resizes: true,
      })
      return () => null
    },
  })
  render(() => h(Bare, { ref: instance }))
  await nextTick()
  // Was 8 with `resizes` (7 without): a watcher each for the phase, the root, the dev trace,
  // `resize`, `linked` and the engine, plus the resolved motion and its engine kind.
  expect(effectsOf(instance.value!.$) - 1).toBe(2)
  expect(resolves).toBe(0)
})

test('closed Popover, Dialog and DatePicker each set up five fewer effects for their motion', async () => {
  const popover = shallowRef<{ $: Instance }>()
  const dialog = shallowRef<{ $: Instance }>()
  const picker = shallowRef<{ $: Instance }>()
  render({
    setup: () => () => [
      h(
        Popover as never,
        { ref: popover },
        { trigger: () => h('button', { type: 'button' }, 'Open'), default: () => 'Body' },
      ),
      h(Dialog as never, { ref: dialog, title: 'T' }, { default: () => 'Body' }),
      h(DatePicker as never, { ref: picker }),
    ],
  })
  await nextTick()
  // Were 21, 20 and 19.
  expect(effectsOf(popover.value!.$)).toBeLessThanOrEqual(15)
  expect(effectsOf(dialog.value!.$)).toBeLessThanOrEqual(14)
  expect(effectsOf(picker.value!.$)).toBeLessThanOrEqual(14)
})

test('motion customised while closed still wires up: `linked` follows the next opening', async () => {
  const open = shallowRef(false)
  const motion = shallowRef<unknown>(undefined)
  const page = () => document.querySelector<HTMLElement>('.page')!
  render(
    {
      setup: () => () => [
        h('div', { class: 'page' }, 'Page'),
        h(Dialog as never, { open: open.value, title: 'T', motion: motion.value }),
      ],
    },
    { global: { stubs: { transition: false } } },
  )
  await frame()
  motion.value = { linked: { page: { el: page, open: { scale: '0.9' } } } }
  await frame()
  open.value = true
  await vi.waitFor(() => expect(getComputedStyle(page()).scale).toBe('0.9'), { timeout: 2000 })
})

test('an element that joins a force-mounted popover while open plays its appearance', async () => {
  const open = shallowRef(false)
  const extra = shallowRef(false)
  const onAfterEnter = vi.fn()
  render(
    () =>
      h(
        Popover as never,
        { open: open.value, forceMount: true },
        {
          trigger: () => h('button', { type: 'button' }, 'Open'),
          default: () =>
            extra.value
              ? withDirectives(h('p', { class: 'extra' }, 'More'), [
                  [vAnimate, { initial: { opacity: 0 }, duration: 300, onAfterEnter }],
                ])
              : null,
        },
      ),
    { global: { stubs: { transition: false } } },
  )
  await frame()
  open.value = true
  await vi.waitFor(() =>
    expect(document.querySelector('.ui-popover-positioner')!.getAttribute('style')).not.toContain(
      'display: none',
    ),
  )
  await new Promise((resolve) => setTimeout(resolve, 400))
  extra.value = true
  await vi.waitFor(() => expect(document.querySelector('.extra')).not.toBeNull())
  await frame()
  expect(document.querySelector('.extra')!.getAnimations().length).toBeGreaterThan(0)
  expect(onAfterEnter).not.toHaveBeenCalled()
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
})
