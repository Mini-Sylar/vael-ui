import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { TransitionGroup, defineComponent, h, nextTick, shallowRef, withDirectives } from 'vue'
import Badge from '../src/components/Badge/Badge.vue'
import Calendar from '../src/components/Calendar/Calendar.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/motion/vAnimate'
import { useMotion } from '../src/motion/useMotion'
import type { AnimateDirectiveValue, DialogMotion, ElementHookContext } from '../src/motion/types'

const MS = 300
const real = { global: { stubs: { transition: false, 'transition-group': false } } }
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

afterEach(() => {
  document.body.innerHTML = ''
})

// A tick that pops in over MS, rendered with an unrelated counter so the test can re-render it.
function tick(onAfterEnter: (el: HTMLElement) => void, extra: AnimateDirectiveValue = {}) {
  const shown = shallowRef(false)
  const renders = shallowRef(0)
  const value = () =>
    ({
      initial: { opacity: 0, scale: 0.25 },
      duration: MS,
      onAfterEnter,
      ...(extra as object),
    }) as never
  render(
    {
      setup: () => () =>
        h('div', { 'data-renders': renders.value }, [
          shown.value
            ? withDirectives(h('span', { class: 'tick' }, '✓'), [[vAnimate, value()]])
            : null,
        ]),
    },
    real,
  )
  return { shown, renders }
}

test('v-animate onAfterEnter runs once its entrance has played, with the element', async () => {
  const onAfterEnter = vi.fn()
  const { shown } = tick(onAfterEnter)
  shown.value = true
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 40)
  expect(onAfterEnter.mock.calls[0]![0]).toBe(document.querySelector('.tick'))
})

test('re-rendering during the entrance does not run it early', async () => {
  const onAfterEnter = vi.fn()
  const { shown, renders } = tick(onAfterEnter)
  shown.value = true
  const start = performance.now()
  // An inline value is a new object every render: the directive updates mid-entrance.
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 30))
    renders.value++
  }
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 40)
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(onAfterEnter).toHaveBeenCalledTimes(1)
})

test('not called, and nothing thrown, when it unmounts mid-entrance', async () => {
  const onAfterEnter = vi.fn()
  const errors: unknown[] = []
  const caught = (e: ErrorEvent) => errors.push(e.error)
  addEventListener('error', caught)
  const { shown } = tick(onAfterEnter)
  shown.value = true
  await new Promise((resolve) => setTimeout(resolve, MS / 3))
  shown.value = false
  await new Promise((resolve) => setTimeout(resolve, MS * 2))
  removeEventListener('error', caught)
  expect(onAfterEnter).not.toHaveBeenCalled()
  expect(errors).toEqual([])
})

test('with motion off it runs at once', async () => {
  const onAfterEnter = vi.fn()
  const shown = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(ConfigProvider, { motion: false }, () =>
          shown.value
            ? withDirectives(h('span', 'Saved'), [
                [vAnimate, { initial: { opacity: 0 }, duration: MS, onAfterEnter }],
              ])
            : null,
        ),
    },
    real,
  )
  shown.value = true
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1))
  expect(performance.now() - start).toBeLessThan(MS / 2)
})

test('each replay runs it again', async () => {
  const onAfterEnter = vi.fn()
  const pick = shallowRef(0)
  render(
    {
      setup: () => () =>
        withDirectives(h('span', String(pick.value)), [
          [vAnimate, { initial: { scale: 0.5 }, duration: 120, replay: pick.value, onAfterEnter }],
        ]),
    },
    real,
  )
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
  pick.value++
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(2), { timeout: 2000 })
})

// Inside a dialog: one that waits for the panel, and one mounted once it's open.
function dialog(hint: () => void, later: () => void) {
  const open = shallowRef(false)
  const more = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(
          Dialog as never,
          { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v), title: 'Profile' },
          {
            default: () => [
              withDirectives(h('p', { class: 'hint' }, 'Hint'), [
                [
                  vAnimate,
                  {
                    initial: { opacity: 0, y: 8 },
                    duration: MS,
                    after: 'panel',
                    onAfterEnter: hint,
                  },
                ],
              ]),
              more.value
                ? withDirectives(h('p', { class: 'more' }, 'More'), [
                    [vAnimate, { initial: { opacity: 0 }, duration: MS, onAfterEnter: later }],
                  ])
                : null,
            ],
          },
        ),
    },
    real,
  )
  return { open, more }
}

test('inside a dialog it waits for its own entrance, after the panel', async () => {
  const hint = vi.fn()
  const { open } = dialog(hint, () => {})
  open.value = true
  await nextTick()
  const start = performance.now()
  await vi.waitFor(() => expect(hint).toHaveBeenCalledTimes(1), { timeout: 3000 })
  // The panel's opening, then its own MS.
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS + 100)
})

test('one mounted into an open dialog runs it after its own appearance', async () => {
  const later = vi.fn()
  const { open, more } = dialog(() => {}, later)
  open.value = true
  await new Promise((resolve) => setTimeout(resolve, 900))
  more.value = true
  const start = performance.now()
  await vi.waitFor(() => expect(later).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 40)
})

// One element shown or removed with `shown`, and its value.
function element(value: () => AnimateDirectiveValue) {
  const shown = shallowRef(true)
  render(
    {
      setup: () => () =>
        h('div', [
          shown.value
            ? withDirectives(h('span', { class: 'el' }, 'Hi'), [[vAnimate, value()]])
            : null,
        ]),
    },
    real,
  )
  return { shown, el: () => document.querySelector<HTMLElement>('.el') }
}

test('v-animate onAfterLeave runs once its exit has played and it is gone', async () => {
  const onAfterLeave = vi.fn()
  const { shown, el } = element(() => ({ exit: { opacity: 0 }, duration: MS, onAfterLeave }))
  await wait(50)
  const node = el()!
  shown.value = false
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterLeave).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 40)
  expect(node.isConnected).toBe(false)
  expect(onAfterLeave.mock.calls[0]![0]).toBe(node)
})

test('with no exit to play, onAfterLeave runs at once', async () => {
  const onAfterLeave = vi.fn()
  const { shown } = element(() => ({ onAfterLeave }))
  await wait(50)
  shown.value = false
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterLeave).toHaveBeenCalledTimes(1))
  expect(performance.now() - start).toBeLessThan(MS / 2)
})

test('onAfterMove runs once a change of animate has played, not for its first look', async () => {
  const onAfterMove = vi.fn()
  const turned = shallowRef(false)
  element(() => ({ animate: { rotate: turned.value ? 180 : 0 }, duration: MS, onAfterMove }))
  await wait(MS)
  expect(onAfterMove).not.toHaveBeenCalled()
  turned.value = true
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterMove).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 40)
})

test('onAfterMove runs once a layout slide has played', async () => {
  const onAfterMove = vi.fn()
  const above = shallowRef(false)
  render(
    {
      setup: () => () =>
        h('div', [
          above.value ? h('p', { style: 'height: 40px; margin: 0' }, 'New') : null,
          withDirectives(h('span', { class: 'el', style: 'display: block' }, 'Hi'), [
            [vAnimate, { layout: true, duration: MS, onAfterMove }],
          ]),
        ]),
    },
    real,
  )
  await wait(50)
  above.value = true
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterMove).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 40)
})

test('your own enter and leave hooks play instead of the values, and the callbacks wait for them', async () => {
  const onAfterEnter = vi.fn()
  const onAfterLeave = vi.fn()
  const enter = vi.fn((el: HTMLElement, _context: ElementHookContext) =>
    el.animate([{ opacity: 0 }, { opacity: 1 }], MS),
  )
  const leave = vi.fn((el: HTMLElement) =>
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: MS, fill: 'forwards' }),
  )
  const { shown, el } = element(() => ({ enter, leave, onAfterEnter, onAfterLeave }))
  await vi.waitFor(() => expect(enter).toHaveBeenCalledTimes(1))
  expect(enter.mock.calls[0]![1]).toMatchObject({ index: 0, reducedMotion: false })
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
  const node = el()!
  shown.value = false
  await vi.waitFor(() => expect(leave).toHaveBeenCalledTimes(1))
  // Still there while your animation plays.
  expect(node.isConnected).toBe(true)
  await vi.waitFor(() => expect(onAfterLeave).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(node.isConnected).toBe(false)
})

// A dialog with a target named in its motion, marked with the slot's `target()`.
function namedDialog(motion: DialogMotion<string>, name = 'hint') {
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(
          Dialog as never,
          {
            open: open.value,
            'onUpdate:open': (v: boolean) => (open.value = v),
            title: 'Profile',
            motion,
          },
          {
            default: ({ target }: { target: (n: string) => (el: unknown) => void }) =>
              h('p', { ref: target(name) }, 'Hint'),
          },
        ),
    },
    real,
  )
  return open
}

test("a dialog's onAfterEnter and onAfterLeave run once it has opened and closed, with its parts", async () => {
  const onAfterEnter = vi.fn()
  const onAfterLeave = vi.fn()
  const open = namedDialog({ onAfterEnter, onAfterLeave })
  open.value = true
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(onAfterEnter.mock.calls[0]![0].panel.classList).toContain('ui-dialog-panel')
  open.value = false
  await vi.waitFor(() => expect(onAfterLeave).toHaveBeenCalledTimes(1), { timeout: 2000 })
})

test("a target's callbacks in motion.targets run once each, for its own entrance and leave", async () => {
  const onAfterEnter = vi.fn()
  const onAfterLeave = vi.fn()
  const open = namedDialog({
    targets: {
      hint: { initial: { opacity: 0 }, duration: MS, after: 'panel', onAfterEnter, onAfterLeave },
    },
  })
  open.value = true
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 3000 })
  expect(onAfterEnter.mock.calls[0]![0].textContent).toBe('Hint')
  open.value = false
  await vi.waitFor(() => expect(onAfterLeave).toHaveBeenCalledTimes(1), { timeout: 2000 })
  await wait(300)
  expect(onAfterLeave).toHaveBeenCalledTimes(1)
})

test("a dialog's onAfterSwap runs once the new view is in, with that view", async () => {
  const onAfterSwap = vi.fn()
  const step = shallowRef(0)
  render(
    {
      setup: () => () =>
        h(
          Dialog as never,
          { open: true, title: 'Steps', motion: { swap: 'wait', onAfterSwap } },
          { default: () => h('div', { key: step.value, class: 'view' }, `Step ${step.value}`) },
        ),
    },
    real,
  )
  await wait(600)
  step.value = 1
  await vi.waitFor(() => expect(onAfterSwap).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(onAfterSwap.mock.calls[0]![0].textContent).toBe('Step 1')
})

test("a list's onAfterEnter and onAfterLeave run per item, with its index", async () => {
  const onAfterEnter = vi.fn()
  const onAfterLeave = vi.fn()
  const items = shallowRef([1])
  const List = defineComponent({
    setup() {
      const motion = useMotion('list', () => ({ duration: 120, onAfterEnter, onAfterLeave }))
      return () =>
        h(TransitionGroup, { tag: 'ul', ...motion.transition }, () =>
          items.value.map((n) => h('li', { key: n }, `item ${n}`)),
        )
    },
  })
  render(List, real)
  await import('../src/motion/list').then(() => wait(0))
  items.value = [1, 2, 3]
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(2), { timeout: 2000 })
  expect(onAfterEnter.mock.calls.map((c) => c[1].index).sort()).toEqual([0, 1])
  expect(onAfterEnter.mock.calls[0]![0].item.tagName).toBe('LI')
  items.value = [1]
  await vi.waitFor(() => expect(onAfterLeave).toHaveBeenCalledTimes(2), { timeout: 2000 })
})

test("Calendar's onAfterSwap runs once the new month is in, with its grid", async () => {
  const onAfterSwap = vi.fn()
  render(() => h(Calendar, { motion: { duration: 120, onAfterSwap } }), real)
  await wait(300)
  document.querySelector<HTMLButtonElement>('[aria-label="Next month"]')!.click()
  await vi.waitFor(() => expect(onAfterSwap).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(onAfterSwap.mock.calls[0]![1]).toEqual({ direction: 1 })
})

test("an always-on component's onAfterEnter runs once its initial has played", async () => {
  const onAfterEnter = vi.fn()
  render(() =>
    h(
      Badge,
      { motion: { initial: { root: { opacity: 0 } }, duration: MS, onAfterEnter } },
      () => '3',
    ),
  )
  const start = performance.now()
  await vi.waitFor(() => expect(onAfterEnter).toHaveBeenCalledTimes(1), { timeout: 2000 })
  expect(performance.now() - start).toBeGreaterThanOrEqual(MS - 60)
})

test('a marked name nothing gives motion to is reported in development', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const open = namedDialog({ targets: {} }, 'hnit')
  open.value = true
  await vi.waitFor(() =>
    expect(warn.mock.calls.flat().join(' ')).toContain("'hnit' isn't in this component's"),
  )
  warn.mockRestore()
})
