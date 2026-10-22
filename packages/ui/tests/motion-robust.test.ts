// Base 8: motion stays out of the way where it would misbehave (hidden tabs, KeepAlive, many at once).
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, KeepAlive, nextTick, shallowRef, withDirectives } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/directives/vAnimate'

const real = { global: { stubs: { transition: false } } }
const frame = () => new Promise(requestAnimationFrame)
const panel = () => document.querySelector<HTMLElement>('.ui-dialog-panel')

function hideTab(hidden: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  })
}

afterEach(() => {
  hideTab(false)
  document.body.innerHTML = ''
})

test('in a hidden tab, a dialog opens and closes at once: no backlog to play when you come back', async () => {
  const open = shallowRef(false)
  render({ setup: () => () => h(Dialog as never, { open: open.value, title: 'Hidden' }) }, real)
  hideTab(true)
  open.value = true
  await nextTick()
  await frame()
  expect(panel()).not.toBeNull()
  // Nothing of the motion's: the panel and backdrop show as they are (a button's own hover fade aside).
  expect(panel()!.getAnimations()).toHaveLength(0)
  expect(document.querySelector('.ui-dialog-overlay')!.getAnimations()).toHaveLength(0)
  expect(getComputedStyle(panel()!).opacity).toBe('1')
  open.value = false
  await nextTick()
  await vi.waitFor(() => expect(panel()).toBeNull(), { timeout: 300 })
})

test('KeepAlive: coming back to a kept view replays nothing (its boxes were kept, not grown from nothing)', async () => {
  const Kept = defineComponent({
    setup: () => () =>
      h('div', { style: 'display: grid; gap: 8px' }, [
        withDirectives(h('section', { class: 'sized' }, [h('p', 'Some content')]), [
          [vAnimate, { duration: 300 }, undefined, { size: true }],
        ]),
        withDirectives(h('p', { class: 'placed' }, 'Placed'), [
          [vAnimate, { layout: true, duration: 300 }],
        ]),
      ]),
  })
  const Other = defineComponent({ setup: () => () => h('p', 'Other') })
  const which = shallowRef<'kept' | 'other'>('kept')
  render({
    setup: () => () =>
      h(KeepAlive, null, [which.value === 'kept' ? h(Kept, { key: 'k' }) : h(Other, { key: 'o' })]),
  })
  await vi.waitFor(() => expect(document.querySelector('.sized')).not.toBeNull())
  for (let i = 0; i < 3; i++) await frame()
  which.value = 'other'
  for (let i = 0; i < 3; i++) await frame()
  which.value = 'kept'
  const runs = new Set<string>()
  for (let i = 0; i < 8; i++) {
    await frame()
    for (const el of document.querySelectorAll('.sized, .placed'))
      for (const a of el.getAnimations()) runs.add(String(a.id))
  }
  expect([...runs]).toEqual([])
})

test('many appearing at once: those in view play, up to a budget; the rest, and those off screen, just show', async () => {
  const look = { initial: { opacity: 0 }, duration: 400 }
  render({
    setup: () => () =>
      h('div', [
        ...Array.from({ length: 40 }, (_, i) =>
          withDirectives(h('p', { class: 'seen', style: 'margin: 0; height: 4px' }, String(i)), [
            [vAnimate, look],
          ]),
        ),
        h('div', { style: 'height: 3000px' }),
        withDirectives(h('p', { class: 'far' }, 'Far'), [[vAnimate, look]]),
      ]),
  })
  await vi.waitFor(() => expect(document.querySelectorAll('.seen')).toHaveLength(40))
  await frame()
  await frame()
  const playing = [...document.querySelectorAll('.seen')].filter((el) => el.getAnimations().length)
  expect(playing).toHaveLength(24)
  // The first 24 in page order.
  expect(playing.at(-1)!.textContent).toBe('23')
  expect(document.querySelector('.far')!.getAnimations()).toHaveLength(0)
  expect(getComputedStyle(document.querySelector('.far')!).opacity).toBe('1')
})

test("dev: a part with its own CSS transition on what motion animates gets a warning; ours don't", async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const open = shallowRef(false)
  render(
    {
      setup: () => () => [
        h(Dialog as never, { open: open.value, title: 'Plain' }),
        h(Dialog as never, {
          open: open.value,
          title: 'Mine',
          ui: { panel: { style: { transition: 'opacity 300ms ease, scale 300ms ease' } } },
        }),
      ],
    },
    real,
  )
  open.value = true
  await nextTick()
  await vi.waitFor(() =>
    expect(
      warn.mock.calls.some(([m]) => String(m).includes('own CSS transition on opacity, scale')),
    ).toBe(true),
  )
  // Once, for the one with its own; vael-ui's own parts never.
  expect(warn.mock.calls.filter(([m]) => String(m).includes('own CSS transition'))).toHaveLength(1)
  warn.mockRestore()
})

test('dev: which layers set the motion shows on the element, and each open is timed for DevTools', async () => {
  performance.clearMeasures()
  const open = shallowRef(false)
  render(
    {
      setup: () => () =>
        h(Dialog as never, {
          open: open.value,
          title: 'Traced',
          motion: { spring: { damping: 1, response: 0.2 } },
        }),
    },
    real,
  )
  open.value = true
  await nextTick()
  await vi.waitFor(
    () => expect(performance.getEntriesByName('vael-ui · Dialog open')).toHaveLength(1),
    {
      timeout: 2000,
    },
  )
  expect(panel()!.getAttribute('data-motion')).toBe('Dialog · built-in, yours: spring')
  const [entry] = performance.getEntriesByName('vael-ui · Dialog open') as PerformanceMeasure[]
  expect(entry!.duration).toBeGreaterThan(0)
  expect(entry!.detail).toMatchObject({ engine: 'css' })
})

test('a scrolling list (rows recycled) neither fades rows in nor leaves them in place', async () => {
  const rows = shallowRef([0, 1, 2])
  const look = { initial: { opacity: 0 }, duration: 300 }
  render({
    setup: () => () =>
      h(
        'div',
        rows.value.map((r) =>
          withDirectives(h('p', { key: r, class: `row row-${r}` }, String(r)), [[vAnimate, look]]),
        ),
      ),
  })
  await vi.waitFor(() => expect(document.querySelectorAll('.row')).toHaveLength(3))
  await new Promise((resolve) => setTimeout(resolve, 400))
  // As a virtualizer does while you scroll: one row out, one in.
  document.dispatchEvent(new Event('scroll'))
  rows.value = [1, 2, 3]
  await nextTick()
  await frame()
  expect(document.querySelector('.row-0')).toBeNull()
  expect(document.querySelector('.row-3')!.getAnimations()).toHaveLength(0)
  // Not scrolling: a real add animates.
  await new Promise((resolve) => setTimeout(resolve, 200))
  rows.value = [1, 2, 3, 4]
  await vi.waitFor(() => expect(document.querySelector('.row-4')?.getAnimations().length).toBe(1))
})

test('dev: the DevTools timing entries never pile up over a session', async () => {
  performance.clearMeasures()
  const open = shallowRef(false)
  render({ setup: () => () => h(Dialog as never, { open: open.value, title: 'Many' }) }, real)
  for (let i = 0; i < 3; i++) {
    open.value = true
    await vi.waitFor(() => expect(panel()?.getAnimations() ?? [1]).toHaveLength(0), {
      timeout: 2000,
    })
    await new Promise((r) => setTimeout(r, 50))
    open.value = false
    await vi.waitFor(() => expect(panel()).toBeNull(), { timeout: 2000 })
  }
  expect(performance.getEntriesByName('vael-ui · Dialog open')).toHaveLength(1)
  expect(performance.getEntriesByName('vael-ui · Dialog close')).toHaveLength(1)
})
