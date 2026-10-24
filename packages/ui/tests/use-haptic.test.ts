import '../src/style.css'
import { afterAll, afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Switch from '../src/components/Switch/Switch.vue'
import { useHaptic } from '../src/composables/useHaptic'
import type { HapticOptions, UseHapticReturn } from '../src/composables/useHaptic'

const vibrate = vi.fn((_pattern: VibratePattern) => true)
const original = navigator.vibrate
navigator.vibrate = vibrate as typeof navigator.vibrate
afterEach(() => vibrate.mockClear())
// Leave the real one in place for other files in the same browser.
afterAll(() => {
  navigator.vibrate = original
})

// Calls useHaptic inside a component under an optional ConfigProvider `haptics` setting.
async function hapticUnder(haptics?: boolean | HapticOptions, options?: HapticOptions) {
  let api: UseHapticReturn | undefined
  const Probe = {
    setup() {
      api = useHaptic(options)
      return () => null
    },
  }
  await render({
    render: () =>
      haptics === undefined ? h(Probe) : h(ConfigProvider, { haptics }, () => h(Probe)),
  })
  return api!
}

test('selection, impact and notification play distinct patterns', async () => {
  const haptic = await hapticUnder()
  expect(haptic.isSupported).toBe(true)
  haptic.selection()
  haptic.impact('light')
  haptic.impact('heavy')
  haptic.notification('error')
  const patterns = vibrate.mock.calls.map(([pattern]) => pattern)
  expect(patterns[0]).toEqual([6])
  expect(patterns[1]).toEqual([10])
  expect(patterns[2]).toEqual([30])
  expect(patterns[3]).toEqual([22, 55, 22, 55, 32])
})

test('intensity scales the pulses, not the pauses, and stacks with the app-wide setting', async () => {
  const haptic = await hapticUnder({ intensity: 2 }, { intensity: 1.5 })
  haptic.notification('success')
  expect(vibrate).toHaveBeenCalledWith([36, 70, 60])
})

test('haptics false silences your own calls too', async () => {
  const haptic = await hapticUnder(false)
  haptic.impact()
  haptic.vibrate([40, 40, 40])
  expect(vibrate).not.toHaveBeenCalled()
})

test('works outside a component', () => {
  useHaptic().vibrate(25)
  expect(vibrate).toHaveBeenCalledWith([25])
})

test("vael-ui's components tap only when ConfigProvider turns haptics on", async () => {
  const off = await render({ render: () => h(Switch, { label: 'Alerts' }) })
  await off.getByRole('switch').click()
  expect(vibrate).not.toHaveBeenCalled()
  off.unmount()

  const on = await render({
    render: () => h(ConfigProvider, { haptics: true }, () => h(Switch, { label: 'Alerts' })),
  })
  await on.getByRole('switch').click()
  expect(vibrate).toHaveBeenCalledWith([6])
})
