// What a ConfigProvider says reaches motion everywhere: an engine reversed mid-way, v-animate
// under `motion: false`, and a preset inside a Teleport.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef, Teleport, withDirectives } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/directives/vAnimate'

const global = { stubs: { transition: false } }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const opacity = (el: Element) => Number(getComputedStyle(el).opacity)

test('an engine reversed mid-way carries on from what is on screen, both ways', async () => {
  const calls: { from: Record<string, unknown>; painted: number }[] = []
  // A fromTo adapter, as the docs show for GSAP: it starts exactly at `from`.
  const engine = (
    el: HTMLElement,
    from: Record<string, string | number>,
    to: Record<string, string | number>,
  ) => {
    if (el.classList.contains('ui-dialog-panel')) calls.push({ from, painted: opacity(el) })
    const run = el.animate(
      [
        { opacity: String(from.opacity ?? 1), scale: String(from.scale ?? 1) },
        { opacity: String(to.opacity ?? 1), scale: String(to.scale ?? 1) },
      ],
      { duration: 1500, fill: 'forwards' },
    )
    return Object.assign(
      run.finished.then(
        () => {},
        () => {},
      ),
      // As GSAP's kill and motion's stop do: it stays where it was.
      { stop: () => (run.commitStyles(), run.cancel()) },
    )
  }
  const open = shallowRef(false)
  render(
    () =>
      h(ConfigProvider as never, { motion: { version: 1, engine } }, () =>
        h(Dialog as never, { open: open.value, title: 'Engine' }),
      ),
    { global },
  )
  open.value = true
  await vi.waitFor(() => expect(calls).toHaveLength(1))
  expect(calls[0]!.from.opacity).toBe(0)
  await wait(500)
  const panel = document.querySelector('.ui-dialog-panel')!
  const shownOpening = opacity(panel)
  const scaledOpening = Number(getComputedStyle(panel).scale)
  expect(scaledOpening).toBeLessThan(0.995)
  expect(shownOpening).toBeGreaterThan(0.1)
  expect(shownOpening).toBeLessThan(0.9)
  open.value = false
  await vi.waitFor(() => expect(calls).toHaveLength(2))
  expect(Number(calls[1]!.from.opacity)).toBeCloseTo(shownOpening, 1)
  expect(Number(calls[1]!.from.scale)).toBeCloseTo(scaledOpening, 2)
  await wait(300)
  const shownClosing = opacity(panel)
  open.value = true
  await vi.waitFor(() => expect(calls).toHaveLength(3))
  expect(Number(calls[2]!.from.opacity)).toBeCloseTo(shownClosing, 1)
  expect(Number(calls[2]!.from.opacity)).toBeGreaterThan(0.1)
  // Closed all the way, then opened: it starts from its own values again.
  open.value = false
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog-panel')).toBeNull(), {
    timeout: 3000,
  })
  open.value = true
  await vi.waitFor(() => expect(calls).toHaveLength(5))
  expect(calls[4]!.from.opacity).toBe(0)
})

test("v-animate under a provider's motion: false shows at once and leaves at once", async () => {
  const shown = shallowRef(true)
  render(() =>
    h(ConfigProvider as never, { motion: false }, () =>
      shown.value
        ? withDirectives(h('div', { class: 'off' }, 'x'), [
            [vAnimate, { initial: { opacity: 0, y: 12 }, duration: 1500 }],
          ])
        : null,
    ),
  )
  await vi.waitFor(() => expect(document.querySelector('.off')).not.toBeNull())
  await wait(100)
  const el = document.querySelector('.off')!
  expect(el.getAnimations()).toHaveLength(0)
  expect(opacity(el)).toBe(1)
  shown.value = false
  await wait(50)
  expect(document.querySelector('.off')).toBeNull()
})

// A component of the app's that teleports its content, as a modal or a toast does.
const Sheet = defineComponent(
  () => () =>
    h(Teleport, { to: 'body' }, [
      withDirectives(h('div', { class: 'teleported' }, 'b'), [[vAnimate, 'rise']]),
    ]),
)

test('a v-animate preset inside a Teleport still finds its provider', async () => {
  const warn = vi.spyOn(console, 'warn')
  const rise = { initial: { opacity: 0, y: 12 }, duration: 1500 }
  render(() =>
    h(ConfigProvider as never, { motion: { version: 1, presets: { rise } } }, () => h(Sheet)),
  )
  await vi.waitFor(() => expect(document.querySelector('.teleported')).not.toBeNull())
  await wait(100)
  const el = document.querySelector('.teleported')!
  expect(el.getAnimations().length).toBeGreaterThan(0)
  expect(opacity(el)).toBeLessThan(1)
  expect(warn.mock.calls.flat().join(' ')).not.toContain("preset 'rise'")
  warn.mockRestore()
})

// In the provider's own template (an App.vue), the template's owner sits above the provider.
test('a preset in a Teleport written beside the provider, or passed through a slot, finds it', async () => {
  const warn = vi.spyOn(console, 'warn')
  const rise = { initial: { opacity: 0, y: 12 }, duration: 1500 }
  const Layout = defineComponent(
    (_, { slots }) =>
      () =>
        h('main', slots.default?.()),
  )
  render(() =>
    h(ConfigProvider as never, { motion: { version: 1, presets: { rise } } }, () => [
      h(Teleport, { to: 'body' }, [
        withDirectives(h('div', { class: 'beside' }, 'a'), [[vAnimate, 'rise']]),
      ]),
      h(Layout, () =>
        h(Teleport, { to: 'body' }, [
          withDirectives(h('div', { class: 'slotted' }, 'b'), [[vAnimate, 'rise']]),
        ]),
      ),
    ]),
  )
  await vi.waitFor(() => expect(document.querySelector('.slotted')).not.toBeNull())
  await wait(100)
  for (const selector of ['.beside', '.slotted']) {
    const el = document.querySelector(selector)!
    expect(el.getAnimations().length, selector).toBeGreaterThan(0)
  }
  expect(warn.mock.calls.flat().join(' ')).not.toContain("preset 'rise'")
  warn.mockRestore()
})

test('motion: false reaches a Teleport written beside the provider', async () => {
  render(() =>
    h(ConfigProvider as never, { motion: false }, () =>
      h(Teleport, { to: 'body' }, [
        withDirectives(h('div', { class: 'beside-off' }, 'x'), [
          [vAnimate, { initial: { opacity: 0, y: 12 }, duration: 1500 }],
        ]),
      ]),
    ),
  )
  await vi.waitFor(() => expect(document.querySelector('.beside-off')).not.toBeNull())
  await wait(100)
  const el = document.querySelector('.beside-off')!
  expect(el.getAnimations()).toHaveLength(0)
  expect(opacity(el)).toBe(1)
})
