// An uncustomised component pays one watcher for its motion; customising it later still wires it.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Button from '../src/components/Button/Button.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Switch from '../src/components/Switch/Switch.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

const frame = () => new Promise(requestAnimationFrame)
type Exposed = {
  $: { scope: { deps?: { nextDep?: unknown } }; bm?: unknown[]; m?: unknown[] }
}
const effectsOf = (component: Exposed) => {
  let count = 0
  for (let link = component.$.scope.deps; link; link = link.nextDep as typeof link) count++
  return count
}
const states = (el: Element | null) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-state')

test('an uncustomised switch or button sets up one motion watcher and no mount hooks for it', async () => {
  const toggle = shallowRef<Exposed>()
  const button = shallowRef<Exposed>()
  render({
    setup: () => () => [h(Switch, { ref: toggle }), h(Button, { ref: button }, () => 'A')],
  })
  await nextTick()
  // Was 8 each: two watchers, a scope and the replay watcher where one watcher is now.
  expect(effectsOf(toggle.value!)).toBeLessThanOrEqual(5)
  expect(effectsOf(button.value!)).toBeLessThanOrEqual(5)
  // Was one onBeforeMount and one onMounted, for an appearance it can't have.
  expect(button.value!.$.bm ?? []).toHaveLength(0)
  expect(button.value!.$.m ?? []).toHaveLength(0)
})

test('motion turned from true into states later still plays them and sets its timing', async () => {
  const on = shallowRef(false)
  const motion = shallowRef<unknown>(true)
  render({
    setup: () => () => h(Switch, { modelValue: on.value, motion: motion.value as never }),
  })
  const root = () => document.querySelector<HTMLElement>('.ui-switch')
  const thumb = () => document.querySelector('.ui-switch-thumb')
  await vi.waitFor(() => expect(thumb()).not.toBeNull())
  await frame()
  motion.value = { duration: 350, states: { checked: { thumb: { scale: [1, 1.4, 1] } } } }
  await vi.waitFor(() =>
    expect(root()!.style.getPropertyValue('--ui-duration-enter')).toBe('350ms'),
  )
  on.value = true
  await vi.waitFor(() => expect(states(thumb()).length).toBeGreaterThan(0))
})

test('a shared style that appears later reaches a button already mounted', async () => {
  const style = shallowRef<unknown>(undefined)
  render({
    setup: () => () =>
      h(ConfigProvider as never, { motion: style.value }, () =>
        h(Button, { 'data-testid': 'b' }, () => 'A'),
      ),
  })
  const button = () => document.querySelector<HTMLElement>('[data-testid="b"]')
  await vi.waitFor(() => expect(button()).not.toBeNull())
  await frame()
  style.value = { version: 1, button: { duration: 420 }, press: { active: { opacity: 0.4 } } }
  await vi.waitFor(() =>
    expect(button()!.style.getPropertyValue('--ui-duration-enter')).toBe('420ms'),
  )
  button()!.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  await vi.waitFor(() => expect(getComputedStyle(button()!).opacity).toBe('0.4'), {
    timeout: 2000,
  })
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})

test('replay plays the appearance again on a component customised after it mounted', async () => {
  const motion = shallowRef<unknown>(true)
  const done = vi.fn()
  render({ setup: () => () => h(Button, { motion: motion.value as never }, () => 'A') })
  await vi.waitFor(() => expect(document.querySelector('.ui-button')).not.toBeNull())
  motion.value = { initial: { root: { opacity: 0 } }, replay: 0, onAfterEnter: done }
  await frame()
  await frame()
  motion.value = { initial: { root: { opacity: 0 } }, replay: 1, onAfterEnter: done }
  await vi.waitFor(() => expect(done).toHaveBeenCalled(), { timeout: 2000 })
})
