// A closed BottomSheet mounts no panel and sets up almost nothing; the first open moves as before.
import '../src/style.css'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createSSRApp, defineComponent, h, nextTick, shallowRef, useTemplateRef } from 'vue'
import type { Component, ComponentPublicInstance } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { SSRContext } from 'vue/server-renderer'
import BottomSheet from '../src/components/BottomSheet/BottomSheet.vue'
import { useSheetDrag } from '../src/composables/useSheetDrag'

const real = { stubs: { transition: false } }
const body = { default: () => 'Body' }
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const settled = () => new Promise((resolve) => setTimeout(resolve, 150))
const panel = () => document.querySelector<HTMLElement>('.ui-bottom-sheet-panel')
const nameOf = (instance: { type: unknown }) => (instance.type as { __name?: string }).__name

// A Teleport leaves two empty text nodes in its target.
const bodyAnchors = () =>
  [...document.body.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).length

let instances: ComponentPublicInstance[] = []
let updates: string[] = []
let observed = 0
let styleReads = 0
let listeners: string[] = []
let counting = false
const observers = [ResizeObserver, MutationObserver, IntersectionObserver].map((type) => ({
  proto: type.prototype,
  observe: type.prototype.observe,
}))
const getComputedStyle = window.getComputedStyle
const addEventListener = EventTarget.prototype.addEventListener
beforeEach(() => {
  instances = []
  updates = []
  observed = 0
  styleReads = 0
  listeners = []
  for (const { proto, observe } of observers)
    proto.observe = function (this: never, ...args: never[]) {
      if (counting) observed++
      return (observe as (...a: never[]) => void).apply(this, args)
    }
  window.getComputedStyle = function (...args) {
    if (counting) styleReads++
    return getComputedStyle.apply(window, args)
  } as typeof getComputedStyle
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest) {
    // Not the test root, where the test utils hear every DOM event.
    const ours =
      this === window || this === document || (this as Element).closest?.('[class*="ui-"]')
    if (counting && ours) listeners.push(type)
    return addEventListener.call(this, type, ...(rest as [EventListener]))
  } as typeof addEventListener
})
afterEach(() => {
  counting = false
  for (const { proto, observe } of observers) proto.observe = observe as never
  window.getComputedStyle = getComputedStyle
  EventTarget.prototype.addEventListener = addEventListener
})
const tally = {
  beforeMount(this: ComponentPublicInstance) {
    instances.push(this)
  },
  beforeUpdate(this: ComponentPublicInstance) {
    updates.push(nameOf(this.$) ?? String((this.$.type as { name?: string }).name))
  },
}

test('closed sheets mount no Teleport and set up no observer, listener, style read or re-render', async () => {
  const before = bodyAnchors()
  counting = true
  const screen = await render(
    defineComponent({
      setup: () => () =>
        Array.from({ length: 5 }, () => h(BottomSheet as never, { title: 'T' }, body)),
    }),
    { global: { mixins: [tally], ...real } },
  )
  await settled()
  counting = false
  // Each closed sheet had a Teleport, 5 observers, 9 style reads, 15 listeners and 2 re-renders.
  expect(bodyAnchors()).toBe(before)
  expect(observed).toBe(0)
  expect(styleReads).toBe(0)
  expect(listeners).toEqual([])
  expect(updates).toEqual([])
  screen.unmount()
})

test('a closed sheet and its dialog hold a fixed number of watchers', async () => {
  await render(() => h(BottomSheet as never, { title: 'T' }, body), {
    global: { mixins: [tally], ...real },
  })
  await nextTick()
  const effects: Record<string, number> = {}
  for (const instance of instances) {
    const name = nameOf(instance.$)
    if (name !== 'BottomSheet' && name !== 'Dialog') continue
    const scope = (instance.$ as unknown as { scope: { deps?: { nextDep?: unknown } } }).scope
    for (let link = scope.deps; link; link = link.nextDep as typeof link)
      effects[name] = (effects[name] ?? 0) + 1
  }
  // Were 18 and 22, with the drag listeners and the force-mounted panel's watchers.
  expect(effects.BottomSheet).toBeLessThanOrEqual(6)
  expect(effects.Dialog).toBeLessThanOrEqual(20)
})

test('forceMount passed through still mounts the panel at once', async () => {
  await render(() => h(BottomSheet as never, { title: 'T', forceMount: true }, body), {
    global: real,
  })
  expect(panel()).not.toBeNull()
  expect(panel()!.getClientRects()).toHaveLength(0)
})

// Each frame of an open: where the panel is, and the drag's resting offset under the rise.
async function opening(open: { value: boolean }) {
  open.value = true
  await nextTick()
  const seen: { top: number; rest: number; height: string }[] = []
  for (let i = 0; i < 40; i++) {
    await frame()
    const el = panel()
    if (!el?.getClientRects().length) continue
    seen.push({
      top: el.getBoundingClientRect().top,
      rest: new DOMMatrix(window.getComputedStyle(el).transform).m42,
      height: el.style.blockSize,
    })
  }
  return seen
}

test('the first open rises from below the screen to its snap point, like every open after it', async () => {
  const open = shallowRef(false)
  await render(
    () =>
      h(
        BottomSheet as never,
        { title: 'T', open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) },
        body,
      ),
    { global: real },
  )
  const rest = window.innerHeight * 0.4
  const runs = []
  for (let round = 0; round < 2; round++) {
    const seen = await opening(open)
    runs.push(seen)
    // Painted first below the screen, already on its snap point and as tall as the screen: no jump.
    expect(seen[0]!.top, `open ${round}`).toBeGreaterThan(window.innerHeight * 0.95)
    for (const frame of seen) {
      expect(frame.rest).toBeCloseTo(rest, 0)
      expect(frame.height).toBe(`${window.innerHeight}px`)
    }
    // Rises without going back down, and lands on the snap point.
    for (let i = 1; i < seen.length; i++) expect(seen[i]!.top).toBeLessThanOrEqual(seen[i - 1]!.top)
    expect(seen.at(-1)!.top).toBeCloseTo(rest, 0)
    open.value = false
    await vi.waitFor(() => expect(panel()!.getClientRects()).toHaveLength(0), { timeout: 2000 })
  }
  expect(runs[0]![0]!.top).toBeCloseTo(runs[1]![0]!.top, -1)
})

test('a sheet open on load starts on its snap point too', async () => {
  const open = shallowRef(true)
  await render(
    () => h(BottomSheet as never, { title: 'T', initialSnap: 'large', open: open.value }, body),
    { global: real },
  )
  await vi.waitFor(() => expect(panel()).not.toBeNull())
  expect(new DOMMatrix(window.getComputedStyle(panel()!).transform).m42).toBeCloseTo(
    window.innerHeight * 0.08,
    0,
  )
})

test('useSheetDrag rests a panel that mounts with the open at its snap point', async () => {
  const open = shallowRef(false)
  await render(
    defineComponent({
      setup() {
        const panelEl = useTemplateRef<HTMLElement>('panel')
        const handleEl = useTemplateRef<HTMLElement>('handle')
        useSheetDrag(open, {
          panelEl,
          handleEl,
          snapPoints: [{ id: 'half', height: 0.5 }],
          onDismiss: () => (open.value = false),
        })
        return () =>
          open.value
            ? h('div', { ref: 'panel', class: 'own-sheet', style: 'position: fixed; inset: 0' }, [
                h('div', { ref: 'handle' }),
              ])
            : null
      },
    }),
  )
  open.value = true
  await nextTick()
  const el = document.querySelector<HTMLElement>('.own-sheet')!
  expect(el.style.transform).toBe(`translateY(${window.innerHeight * 0.5}px)`)
  expect(el.style.blockSize).toBe(`${window.innerHeight}px`)
})

/** Server-renders `root`, puts the HTML (and anything teleported) on the page, then hydrates it. */
async function serveAndHydrate(root: () => Component | ReturnType<typeof h>) {
  const ctx: SSRContext = {}
  const html = await renderToString(createSSRApp({ render: root }), ctx)
  const host = document.createElement('div')
  host.innerHTML = html
  const target = document.createElement('div')
  target.id = 'ssr-sheet'
  target.innerHTML = (ctx.teleports?.['#ssr-sheet'] ?? '') as string
  document.body.append(host, target)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    createSSRApp({ render: root }).mount(host)
    await frame()
    const messages = [...warn.mock.calls, ...error.mock.calls].map((args) => args.join(' '))
    return { target, mismatches: messages.filter((m) => /hydrat|mismatch/i.test(m)) }
  } finally {
    warn.mockRestore()
    error.mockRestore()
  }
}

test('closed and open sheets hydrate without a mismatch', async () => {
  for (const open of [false, true]) {
    const { target, mismatches } = await serveAndHydrate(() =>
      h(BottomSheet as never, { title: 'T', open, teleportTo: '#ssr-sheet' }, body),
    )
    expect(mismatches, `open: ${open}`).toEqual([])
    expect(!!target.querySelector('.ui-bottom-sheet-panel'), `open: ${open}`).toBe(open)
    target.remove()
  }
})
