import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ColorSchemeFixture from './fixtures/ColorSchemeFixture.vue'
import { useColorScheme } from '../src/composables/useColorScheme'

afterEach(() => {
  delete document.documentElement.dataset.theme
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
