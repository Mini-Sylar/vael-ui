import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { Component, VNode } from 'vue'
import { render } from 'vitest-browser-vue'
import ColorSchemeFixture from './fixtures/ColorSchemeFixture.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { useColorScheme } from '../src/composables/useColorScheme'

afterEach(() => {
  delete document.documentElement.dataset.theme
  for (const animation of document.getAnimations()) animation.finish()
  document.getElementById('vt-author-css')?.remove()
})

test('defaults to system, applies data-theme on explicit choice, clears it back to system', async () => {
  const screen = await render(ColorSchemeFixture)

  await expect.element(screen.getByTestId('mode')).toHaveTextContent('system')
  expect(document.documentElement.dataset.theme).toBeUndefined()

  await screen.getByTestId('set-dark').click()
  await expect.element(screen.getByTestId('mode')).toHaveTextContent('dark')
  await expect.element(screen.getByTestId('resolved')).toHaveTextContent('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')

  await screen.getByTestId('set-system').click()
  await expect.element(screen.getByTestId('mode')).toHaveTextContent('system')
  expect(document.documentElement.dataset.theme).toBeUndefined()
})

test('persists through the provided get/set pair and restores it on the next mount', async () => {
  let stored: string | null = null
  const persist = { get: () => stored, set: (m: string | null) => (stored = m) }

  const screen = await render(ColorSchemeFixture, { props: { persist } })
  await screen.getByTestId('set-light').click()
  expect(stored).toBe('light')
  await screen.unmount()

  const screen2 = await render(ColorSchemeFixture, { props: { persist } })
  await expect.element(screen2.getByTestId('mode')).toHaveTextContent('light')
})

test('a reveal spreads the new scheme in a circle from the given point', async () => {
  let api: ReturnType<typeof useColorScheme> | undefined
  await render({
    setup() {
      api = useColorScheme()
      return () => null
    },
  })
  api!.setMode('dark', { from: { x: 40, y: 30 }, duration: 400 })
  await vi.waitFor(() => {
    const reveal = document
      .getAnimations()
      .find(
        (animation) =>
          (animation.effect as KeyframeEffect).pseudoElement === '::view-transition-new(root)',
      )
    expect(reveal).toBeDefined()
    const frames = (reveal!.effect as KeyframeEffect).getKeyframes()
    expect(frames[0]!.clipPath).toBe('circle(0px at 40px 30px)')
  })
  expect(document.documentElement.dataset.theme).toBe('dark')
})

test('without View Transitions the scheme switches at once', async () => {
  const original = (document as { startViewTransition?: unknown }).startViewTransition
  ;(document as { startViewTransition?: unknown }).startViewTransition = undefined
  try {
    let api: ReturnType<typeof useColorScheme> | undefined
    await render({
      setup() {
        api = useColorScheme()
        return () => null
      },
    })
    api!.setMode('dark', { from: document.body })
    expect(document.documentElement.dataset.theme).toBe('dark')
  } finally {
    ;(document as { startViewTransition?: unknown }).startViewTransition = original
  }
})

test('every instance shares one scheme, so two toggles stay in step', async () => {
  let header: ReturnType<typeof useColorScheme> | undefined
  let settings: ReturnType<typeof useColorScheme> | undefined
  await render({
    setup() {
      header = useColorScheme()
      settings = useColorScheme()
      return () => null
    },
  })
  settings!.setMode('dark')
  expect(header!.mode.value).toBe('dark')
  expect(header!.resolvedMode.value).toBe('dark')
  header!.setMode('system')
  expect(settings!.mode.value).toBe('system')
})

const OLD = '::view-transition-old(root)'
const NEW = '::view-transition-new(root)'
const onRoot = () =>
  document
    .getAnimations()
    .filter((animation) =>
      [OLD, NEW].includes((animation.effect as KeyframeEffect).pseudoElement ?? ''),
    )
const named = (name: string) =>
  onRoot().find((animation) => (animation as CSSAnimation).animationName === name)
const circle = () =>
  onRoot().find((animation) =>
    (animation.effect as KeyframeEffect)
      .getKeyframes()
      .some((frame) => String(frame.clipPath).startsWith('circle')),
  )

async function mountScheme(wrap?: (child: Component) => VNode) {
  let api: ReturnType<typeof useColorScheme> | undefined
  const Child = defineComponent({
    setup() {
      api = useColorScheme()
      return () => h('button', { 'data-testid': 'toggle' }, 'toggle')
    },
  })
  const screen = await render(wrap ? { render: () => wrap(Child) } : Child)
  return { api: api!, button: screen.getByTestId('toggle').element() as HTMLElement }
}

test('the circle replaces only the browser crossfade', async () => {
  const { api } = await mountScheme()
  api.setMode('dark', { from: { x: 10, y: 10 } })
  await vi.waitFor(() => expect(circle()).toBeDefined())
  expect(onRoot().filter((animation) => animation instanceof CSSAnimation)).toEqual([])
})

test('your own CSS animation on the root pseudos plays, and the circle steps aside', async () => {
  const style = document.createElement('style')
  style.id = 'vt-author-css'
  style.textContent = `@keyframes vt-mine { from { opacity: 0 } }
    ::view-transition-new(root) { animation: vt-mine 300ms; }`
  document.head.append(style)
  const { api } = await mountScheme()
  api.setMode('dark', { from: { x: 10, y: 10 } })
  await vi.waitFor(() => expect(named('vt-mine')).toBeDefined())
  await new Promise((resolve) => requestAnimationFrame(resolve))
  expect(named('vt-mine')!.playState).toBe('running')
  expect(circle()).toBeUndefined()
  // The rest of the transition stays the browser's own.
  expect(named('-ua-view-transition-fade-out')).toBeDefined()
})

test('a ConfigProvider with motion: false switches at once', async () => {
  const doc = document as Document & { startViewTransition: () => unknown }
  const spy = vi.spyOn(doc, 'startViewTransition')
  try {
    const { api, button } = await mountScheme((child) =>
      h(ConfigProvider, { motion: false }, () => h(child)),
    )
    api.setMode('dark', { from: button })
    expect(spy).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.theme).toBe('dark')

    // Called above the provider, the toggle inside it still decides.
    let outer: ReturnType<typeof useColorScheme> | undefined
    const screen = await render({
      setup() {
        outer = useColorScheme()
        return () =>
          h(ConfigProvider, { motion: false }, () => h('button', { 'data-testid': 'inner' }, 'x'))
      },
    })
    outer!.setMode('light', { from: screen.getByTestId('inner').element() })
    expect(spy).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.theme).toBe('light')
  } finally {
    spy.mockRestore()
  }
})

test('the default reveal keeps its 500 ms drawer timing', async () => {
  const { api } = await mountScheme()
  api.setMode('dark', { from: { x: 10, y: 10 } })
  await vi.waitFor(() => expect(circle()).toBeDefined())
  const timing = circle()!.effect!.getTiming()
  expect(timing.duration).toBe(500)
  expect(timing.easing).toBe('cubic-bezier(0.32, 0.72, 0, 1)')
})

test('the reveal times itself from the motion tokens where it starts', async () => {
  const { api, button } = await mountScheme()
  button.style.setProperty('--ui-duration-drawer', '0.3s')
  button.style.setProperty('--ui-ease-drawer', 'linear')
  api.setMode('dark', { from: button })
  await vi.waitFor(() => expect(circle()).toBeDefined())
  const timing = circle()!.effect!.getTiming()
  expect(timing.duration).toBe(300)
  expect(timing.easing).toBe('linear')
})

test('explicit duration and easing win over the tokens', async () => {
  const { api, button } = await mountScheme()
  button.style.setProperty('--ui-duration-drawer', '300ms')
  button.style.setProperty('--ui-ease-drawer', 'linear')
  api.setMode('dark', { from: button, duration: 450, easing: 'ease-in' })
  await vi.waitFor(() => expect(circle()).toBeDefined())
  const timing = circle()!.effect!.getTiming()
  expect(timing.duration).toBe(450)
  expect(timing.easing).toBe('ease-in')
})
