import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/directives/vAnimate'

const real = { global: { stubs: { transition: false } } }
const frame = () => new Promise(requestAnimationFrame)
const opacity = (el: Element | null) => (el ? Number(getComputedStyle(el).opacity) : NaN)

afterEach(() => {
  document.body.innerHTML = ''
})

async function framesOf(get: () => Element | null, count = 12) {
  const seen: number[] = []
  for (let i = 0; i < count; i++) {
    await frame()
    seen.push(opacity(get()))
  }
  return seen
}

function noteDialog(shown: { value: boolean }, events: string[]) {
  render(
    {
      setup: () => () =>
        h(
          Dialog as never,
          {
            open: true,
            title: 'Saving',
            motion: { targets: { note: { initial: { opacity: 0, y: 6 } } } },
            onAfterEnter: () => events.push('after-enter'),
          },
          () =>
            shown.value
              ? withDirectives(h('p', { class: 'note' }, 'Saved'), [[vAnimate, undefined, 'note']])
              : null,
        ),
    },
    real,
  )
}

test('an element that appears inside an open dialog plays its appearance (a v-if turning true)', async () => {
  const shown = shallowRef(false)
  const events: string[] = []
  noteDialog(shown, events)
  await vi.waitFor(() => expect(events).toContain('after-enter'), { timeout: 3000 })
  shown.value = true
  const seen = await framesOf(() => document.querySelector('.note'))
  // It came in: part-way at some frame, fully there at the end. The dialog's `targets.note` was used.
  expect(seen.some((o) => o > 0 && o < 1)).toBe(true)
  await vi.waitFor(() => expect(opacity(document.querySelector('.note'))).toBe(1))
})

test('one that mounts mid-opening appears once the dialog is open, and only once', async () => {
  const shown = shallowRef(false)
  const events: string[] = []
  noteDialog(shown, events)
  await frame()
  await frame()
  shown.value = true
  const seen = await framesOf(() => document.querySelector('.note'), 40)
  expect(events).toEqual(['after-enter'])
  // Faded in once: never back down once it started rising.
  const rising = seen.findIndex((o) => o > 0 && o < 1)
  expect(rising).toBeGreaterThanOrEqual(0)
  for (let i = rising + 1; i < seen.length; i++)
    expect(seen[i]!).toBeGreaterThanOrEqual(seen[i - 1]! - 0.01)
  expect(seen.at(-1)).toBe(1)
})

test('after-enter and after-leave fire once per open and close', async () => {
  const open = shallowRef(true)
  const events: string[] = []
  render(
    {
      setup: () => () =>
        h(Dialog as never, {
          open: open.value,
          title: 'Once',
          onAfterEnter: () => events.push('after-enter'),
          onAfterLeave: () => events.push('after-leave'),
        }),
    },
    real,
  )
  await vi.waitFor(() => expect(events).toContain('after-enter'), { timeout: 3000 })
  open.value = false
  await vi.waitFor(() => expect(events).toContain('after-leave'), { timeout: 3000 })
  await new Promise((r) => setTimeout(r, 300))
  expect(events).toEqual(['after-enter', 'after-leave'])
})

test('v-animate outside any component appears on its own; siblings under one name stagger', async () => {
  render({
    setup: () => () =>
      h(
        'div',
        [0, 1, 2].map((i) =>
          withDirectives(h('div', { class: `card card-${i}` }, `Card ${i}`), [
            [vAnimate, { initial: { opacity: 0 }, duration: 200, stagger: 0.1 }, 'cards'],
          ]),
        ),
      ),
  })
  await frame()
  const first: number[] = []
  const last: number[] = []
  for (let i = 0; i < 10; i++) {
    first.push(opacity(document.querySelector('.card-0')))
    last.push(opacity(document.querySelector('.card-2')))
    await frame()
  }
  // The first is on its way while the last (200 ms later) hasn't started yet.
  const i = first.findIndex((o) => o > 0.2 && o < 1)
  expect(i).toBeGreaterThanOrEqual(0)
  expect(last[i]).toBeLessThan(first[i]!)
  await vi.waitFor(() => expect(opacity(document.querySelector('.card-2'))).toBe(1), {
    timeout: 2000,
  })
})

test('a fade beside a move lands with it; a fade on its own eases quickly', async () => {
  render({
    setup: () => () =>
      h('div', [
        withDirectives(h('div', { class: 'moves' }, 'A'), [
          [vAnimate, { initial: { opacity: 0, y: 8 } }],
        ]),
        withDirectives(h('div', { class: 'fades' }, 'B'), [
          [vAnimate, { initial: { opacity: 0 } }],
        ]),
      ]),
  })
  await frame()
  // "<duration> <easing>" of one property in the inline transition.
  const timingOf = (selector: string, prop: string) =>
    new RegExp(`${prop} (\\d+ms (?:[a-z-]+\\([^)]*\\)|[^ ,]+))`).exec(
      document.querySelector<HTMLElement>(selector)!.style.transition,
    )?.[1]
  expect(timingOf('.moves', 'opacity')).toMatch(/^\d+ms linear\(/)
  expect(timingOf('.moves', 'opacity')).toBe(timingOf('.moves', 'translate'))
  expect(timingOf('.fades', 'opacity')).toMatch(/^\d+ms cubic-bezier\(/)
})
