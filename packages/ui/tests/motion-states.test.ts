import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h, nextTick, shallowRef } from 'vue'
import Accordion from '../src/components/Accordion/Accordion.vue'
import AccordionItem from '../src/components/AccordionItem/AccordionItem.vue'
import Button from '../src/components/Button/Button.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Input from '../src/components/Input/Input.vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import Switch from '../src/components/Switch/Switch.vue'
import type {
  AccordionMotion,
  ButtonMotion,
  InputMotion,
  OtpInputMotion,
} from '../src/motion/types'

const frame = () => new Promise(requestAnimationFrame)
const states = (el: Element | null) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-state')
const settle = async () => {
  for (
    let i = 0;
    i < 40 &&
    document.getAnimations().some((a) => a.id === 'ui-state' && a.playState === 'running');
    i++
  )
    await frame()
}

afterEach(() => {
  document.body.innerHTML = ''
})

test('an invalid field shakes on entering the state, not when it mounts invalid, and again each time', async () => {
  const invalid = shallowRef(true)
  const motion: InputMotion = { states: { invalid: { root: { x: [0, -6, 6, -3, 0] } } } }
  render({ setup: () => () => h(Input, { invalid: invalid.value, motion }) })
  const root = () => document.querySelector('.ui-input')
  await vi.waitFor(() => expect(root()).not.toBeNull())
  // Mounted invalid: shown as is, nothing plays.
  for (let i = 0; i < 5; i++) await frame()
  expect(states(root()).filter((a) => a.playState === 'running')).toHaveLength(0)

  invalid.value = false
  await nextTick()
  invalid.value = true
  await vi.waitFor(() => expect(states(root()).some((a) => a.playState === 'running')).toBe(true))
  // It moves: somewhere along the shake it's off its rest position.
  const xs = new Set<string>()
  while (states(root()).some((a) => a.playState === 'running')) {
    xs.add(getComputedStyle(root()!).translate)
    await frame()
  }
  expect(xs.size).toBeGreaterThan(2)
  expect(getComputedStyle(root()!).translate).toBe('none')

  invalid.value = false
  await nextTick()
  invalid.value = true
  await vi.waitFor(() => expect(states(root()).some((a) => a.playState === 'running')).toBe(true))
})

test('a pop from one value to another rides its own spring, overshoot and all, after its delay', async () => {
  const invalid = shallowRef(false)
  const spring = { damping: 0.35, response: 0.45 }
  const motion: InputMotion = {
    states: {
      invalid: {
        root: { scale: { value: [0.8, 1], spring }, opacity: { value: [0.5, 1], delay: 0.2 } },
      },
    },
  }
  render({ setup: () => () => h(Input, { invalid: invalid.value, motion }) })
  const root = () => document.querySelector('.ui-input')
  await vi.waitFor(() => expect(root()).not.toBeNull())
  for (let i = 0; i < 5; i++) await frame()
  invalid.value = true
  await vi.waitFor(() => expect(states(root()).length).toBe(2))
  expect(states(root()).map((a) => a.effect!.getTiming().delay)).toContain(200)
  let most = 0
  while (states(root()).some((a) => a.playState === 'running')) {
    most = Math.max(most, Number(getComputedStyle(root()!).scale.split(' ')[0]))
    await frame()
  }
  expect(most).toBeGreaterThan(1.05)
})

test('a switch plays its unchecked keyframes when turned off, and its checked ones when turned on', async () => {
  const on = shallowRef(false)
  render({
    setup: () => () =>
      h(Switch, {
        modelValue: on.value,
        motion: {
          states: {
            checked: { thumb: { scale: [1, 1.4, 1] } },
            unchecked: { thumb: { scale: [1, 0.6, 1] } },
          },
        },
      }),
  })
  const thumb = () => document.querySelector('.ui-switch-thumb')
  await vi.waitFor(() => expect(thumb()).not.toBeNull())
  for (let i = 0; i < 5; i++) await frame()
  // Mounted off: shown as is.
  expect(states(thumb())).toHaveLength(0)
  const peak = async () => {
    await vi.waitFor(() => expect(states(thumb()).length).toBeGreaterThan(0))
    const seen: number[] = []
    while (states(thumb()).some((a) => a.playState === 'running')) {
      seen.push(Number(getComputedStyle(thumb()!).scale))
      await frame()
    }
    return seen
  }
  on.value = true
  expect(Math.max(...(await peak()))).toBeGreaterThan(1.2)
  on.value = false
  expect(Math.min(...(await peak()))).toBeLessThan(0.8)
})

test("a held value with its own timing keeps it, delay and all; the rest share the component's", async () => {
  const invalid = shallowRef(false)
  const motion: InputMotion = {
    states: {
      invalid: {
        root: {
          backgroundColor: { value: 'rgb(255, 0, 0)', duration: 600, delay: 0.3 },
          scale: '0.98',
        },
      },
    },
  }
  render({ setup: () => () => h(Input, { invalid: invalid.value, motion }) })
  const root = () => document.querySelector('.ui-input')
  await vi.waitFor(() => expect(root()).not.toBeNull())
  for (let i = 0; i < 5; i++) await frame()
  invalid.value = true
  await vi.waitFor(() => expect(states(root()).length).toBe(2))
  const timings = states(root()).map((a) => a.effect!.getTiming())
  expect(timings).toContainEqual(expect.objectContaining({ duration: 600, delay: 300 }))
  expect(timings.filter((t) => t.delay === 0)).toHaveLength(1)
})

test('a new timing reaches its tokens in the same flush: nothing starts on the default between', async () => {
  const duration = shallowRef(350)
  let seen = ''
  render({
    setup: () => () => {
      const d = duration.value
      // Queued during the render, as a replay's appearance is: it runs as soon as the flush ends.
      if (d === 220)
        queueMicrotask(() => (seen = root().style.getPropertyValue('--ui-duration-enter')))
      return h(Input, { motion: { duration: d } })
    },
  })
  const root = () => document.querySelector<HTMLElement>('.ui-input')!
  await vi.waitFor(() => expect(root().style.getPropertyValue('--ui-duration-enter')).toBe('350ms'))
  duration.value = 220
  await vi.waitFor(() => expect(seen).not.toBe(''))
  expect(seen).toBe('220ms')
})

test('keyframes take times, an easing per segment and repeats; an endless one stops with its state', async () => {
  const invalid = shallowRef(false)
  const pressed = shallowRef(false)
  const motion: InputMotion = {
    states: {
      invalid: {
        root: {
          scale: {
            value: [1, 1.2, 0.9, 1],
            times: [0, 0.4, 0.7, 1],
            easing: 'ease-out',
            duration: 400,
            repeat: 1,
          },
        },
      },
      disabled: {
        root: { x: { value: [0, 2], duration: 50, repeat: Infinity, repeatType: 'reverse' } },
      },
    },
  }
  render({
    setup: () => () => h(Input, { invalid: invalid.value, disabled: pressed.value, motion }),
  })
  const root = () => document.querySelector<HTMLElement>('.ui-input')!
  await vi.waitFor(() => expect(root()).not.toBeNull())
  for (let i = 0; i < 5; i++) await frame()
  invalid.value = true
  await vi.waitFor(() => expect(states(root()).length).toBeGreaterThan(0))
  const run = states(root())[0]!
  const frames = (run.effect as KeyframeEffect).getKeyframes()
  expect(frames.map((k) => k.offset)).toEqual([0, 0.4, 0.7, 1])
  expect(frames[0]!.easing).toBe('ease-out')
  expect(run.effect!.getTiming().iterations).toBe(2)
  await settle()

  pressed.value = true
  await vi.waitFor(() =>
    expect(states(root()).some((a) => a.effect!.getTiming().iterations === Infinity)).toBe(true),
  )
  await new Promise((r) => setTimeout(r, 300))
  expect(states(root()).some((a) => a.playState === 'running')).toBe(true)
  pressed.value = false
  await vi.waitFor(() =>
    expect(states(root()).some((a) => a.effect!.getTiming().iterations === Infinity)).toBe(false),
  )
  await settle()
  expect(getComputedStyle(root()).translate).toBe('none')
})

test('keyframes take one easing per step from a list: a rise, then a bounce', async () => {
  const invalid = shallowRef(false)
  const motion: InputMotion = {
    states: {
      invalid: {
        root: { y: { value: [0, -20, 0], easing: ['ease-out', 'ease-in'], duration: 400 } },
      },
    },
  }
  render({ setup: () => () => h(Input, { invalid: invalid.value, motion }) })
  const root = () => document.querySelector<HTMLElement>('.ui-input')!
  await vi.waitFor(() => expect(root()).not.toBeNull())
  for (let i = 0; i < 5; i++) await frame()
  invalid.value = true
  await vi.waitFor(() => expect(states(root()).length).toBeGreaterThan(0))
  const run = states(root())[0]!
  const frames = (run.effect as KeyframeEffect).getKeyframes()
  expect(frames.slice(0, 2).map((k) => k.easing)).toEqual(['ease-out', 'ease-in'])
  expect(run.effect!.getTiming().easing).toBe('linear')
  expect(run.effect!.getTiming().duration).toBe(400)
})

test('a verification code shakes when it turns invalid, and a complete code plays its look', async () => {
  const invalid = shallowRef(false)
  const code = shallowRef('')
  const motion: OtpInputMotion = {
    states: {
      invalid: { root: { x: [0, -6, 6, 0] } },
      complete: { root: { scale: [1, 1.02, 1] } },
    },
  }
  render({
    setup: () => () =>
      h(OtpInput, { modelValue: code.value, length: 4, invalid: invalid.value, motion }),
  })
  const root = () => document.querySelector('.ui-otp')
  await vi.waitFor(() => expect(root()).not.toBeNull())
  for (let i = 0; i < 5; i++) await frame()
  expect(states(root())).toHaveLength(0)

  invalid.value = true
  await vi.waitFor(() => expect(states(root()).some((a) => a.playState === 'running')).toBe(true))
  // Evenly timed: a third of the way through [0, -6, 6, 0], it's at -6.
  const run = states(root())[0]!
  run.pause()
  run.currentTime = Number(run.effect!.getComputedTiming().duration) / 3
  expect(getComputedStyle(root()!).translate).toBe('-6px')
  run.cancel()

  invalid.value = false
  code.value = '1234'
  await vi.waitFor(() => expect(states(root()).some((a) => a.playState === 'running')).toBe(true))
})

test("an accordion's timing reaches its panel's height, not only the chevron", async () => {
  render({
    setup: () => () =>
      h(Accordion as never, { motion: { duration: 1000, easing: 'linear' } }, () =>
        h(AccordionItem, { value: 'a', title: 'A' }, () => 'Body'),
      ),
  })
  const panel = () => document.querySelector<HTMLElement>('.ui-accordion-panel')
  await vi.waitFor(() => expect(panel()).not.toBeNull())
  await vi.waitFor(() =>
    expect(getComputedStyle(panel()!).getPropertyValue('--ui-duration-enter').trim()).toBe(
      '1000ms',
    ),
  )
})

test("an accordion's chevron holds its open look while open and eases back when closed", async () => {
  const open = shallowRef<string | undefined>(undefined)
  const motion: AccordionMotion = { states: { open: { chevron: { rotate: '90deg' } } } }
  render({
    setup: () => () =>
      h(
        Accordion as never,
        { value: open.value, 'onUpdate:value': (v: string) => (open.value = v), motion },
        () => h(AccordionItem, { value: 'a', title: 'A' }, () => 'Body'),
      ),
  })
  const chevron = () => document.querySelector<SVGElement>('.ui-accordion-chevron')!
  await vi.waitFor(() => expect(chevron()).not.toBeNull())
  open.value = 'a'
  await vi.waitFor(() => expect(states(chevron()).length).toBeGreaterThan(0))
  await settle()
  expect(getComputedStyle(chevron()).rotate).toBe('90deg')
  // Held by an animation, never by rewriting the component's own transition.
  expect(chevron().style.transition).toBe('')

  open.value = undefined
  const seen = new Set<string>()
  await nextTick()
  while (states(chevron()).some((a) => a.playState === 'running')) {
    seen.add(getComputedStyle(chevron()).rotate)
    await frame()
  }
  // Eased back through values on the way, and nothing left holding it.
  expect(seen.size).toBeGreaterThan(2)
  expect(states(chevron())).toHaveLength(0)
  expect(getComputedStyle(chevron()).rotate).not.toBe('90deg')
})

test('a button presses by pointer and by keyboard, and hovers only for a mouse', async () => {
  const motion: ButtonMotion = {
    states: { active: { label: { scale: '0.8' } }, hover: { root: { opacity: 0.5 } } },
  }
  render({ setup: () => () => h(Button, { motion }, () => 'Save') })
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  const label = () => document.querySelector<HTMLElement>('.ui-button-label')!
  await vi.waitFor(() => expect(button()).not.toBeNull())
  // The player loads on mount; a press before it arrives shows the built-in look.
  await new Promise((r) => setTimeout(r, 300))
  const pointer = (type: string, pointerType = 'mouse') =>
    button().dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType }))

  pointer('pointerdown')
  await vi.waitFor(() => expect(getComputedStyle(label()).scale).toBe('0.8'), { timeout: 2000 })
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
  await vi.waitFor(() => expect(states(label())).toHaveLength(0), { timeout: 2000 })

  button().focus()
  button().dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  await vi.waitFor(() => expect(getComputedStyle(label()).scale).toBe('0.8'), { timeout: 2000 })
  button().dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }))
  await vi.waitFor(() => expect(states(label())).toHaveLength(0), { timeout: 2000 })

  // A touch never hovers.
  pointer('pointerenter', 'touch')
  for (let i = 0; i < 5; i++) await frame()
  expect(states(button())).toHaveLength(0)
  pointer('pointerenter')
  await vi.waitFor(() => expect(getComputedStyle(button()).opacity).toBe('0.5'), { timeout: 2000 })
})

// The lift carries the button off a still cursor; hover must hold rather than flicker on and off.
test('a hover that lifts the element off a cursor at its edge stays on, without flickering', async () => {
  const motion: ButtonMotion = { states: { hover: { root: { y: -8 } } } }
  render({ setup: () => () => h(Button, { motion, style: 'margin: 40px' }, () => 'Save') })
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  await vi.waitFor(() => expect(button()).not.toBeNull())
  await frame()
  // Page coordinates: relative to the button, the cursor would ride up with the lift.
  const rest = button().getBoundingClientRect()
  const at = (x: number, y: number) =>
    userEvent.hover(document.documentElement, { position: { x, y } })
  const lifts = new Set<string>()
  const start = performance.now()
  // A hand is never still: the cursor wobbles a pixel in place, and each wobble asks again.
  for (let i = 0; performance.now() - start < 1500; i++) {
    await at(rest.left + rest.width / 2 + (i % 2), rest.bottom - 2)
    if (performance.now() - start > 700) lifts.add(getComputedStyle(button()).translate)
    await frame()
  }
  expect([...lifts]).toEqual(['0px -8px'])
  // Off the resting box: it settles back.
  await at(rest.left + rest.width / 2, rest.bottom + 20)
  await vi.waitFor(
    () => expect(getComputedStyle(button()).translate).toMatch(/^(none|0px( 0px)?)$/),
    {
      timeout: 2000,
    },
  )
})

test('with nothing customised, states never run: the built-in look is the CSS', async () => {
  render({ setup: () => () => h(Button, null, () => 'Save') })
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  await vi.waitFor(() => expect(button()).not.toBeNull())
  button().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
  for (let i = 0; i < 5; i++) await frame()
  expect(document.getAnimations().filter((a) => a.id === 'ui-state')).toHaveLength(0)
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})

test("a shared style's press.active reaches every button; motion false opts one out", async () => {
  render({
    setup: () => () =>
      h(
        ConfigProvider as never,
        { motion: { version: 1, press: { active: { opacity: 0.4 } } } },
        () => [
          h(Button, { 'data-testid': 'styled' }, () => 'A'),
          h(Button, { 'data-testid': 'off', motion: false }, () => 'B'),
        ],
      ),
  })
  const get = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!
  await vi.waitFor(() => expect(get('styled')).not.toBeNull())
  await frame()
  for (const id of ['styled', 'off'])
    get(id).dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
    )
  await vi.waitFor(() => expect(getComputedStyle(get('styled')).opacity).toBe('0.4'), {
    timeout: 2000,
  })
  expect(states(get('off'))).toHaveLength(0)
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})

test("a repeated part plays its states element by element: only the step that's now current pops", async () => {
  const { default: Stepper } = await import('../src/components/Stepper/Stepper.vue')
  const step = shallowRef(0)
  render({
    setup: () => () =>
      h(Stepper as never, {
        items: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
        modelValue: step.value,
        motion: {
          states: {
            current: {
              circle: ({ index }: { index: number }) => ({ scale: [1, 1.2 + index / 10, 1] }),
            },
          },
        },
      }),
  })
  const circles = () => [...document.querySelectorAll<HTMLElement>('.ui-stepper-circle')]
  await vi.waitFor(() => expect(circles()).toHaveLength(3))
  for (let i = 0; i < 5; i++) await frame()
  // Mounted: shown as is.
  expect(circles().flatMap((c) => states(c))).toHaveLength(0)
  step.value = 1
  await vi.waitFor(() => expect(states(circles()[1]!).length).toBeGreaterThan(0))
  expect(states(circles()[0]!)).toHaveLength(0)
  expect(states(circles()[2]!)).toHaveLength(0)
  // Its own index reached its values.
  const peak = (states(circles()[1]!)[0]!.effect as KeyframeEffect).getKeyframes()[1]!.scale
  expect(peak).toBe('1.3')
})

test('a verification code ripples its shake cell by cell, each from its index', async () => {
  const invalid = shallowRef(false)
  const motion: OtpInputMotion = {
    states: {
      invalid: {
        cell: ({ index }) => ({ x: { value: [0, 7, 0], duration: 200, delay: index * 0.05 } }),
      },
    },
  }
  render({ setup: () => () => h(OtpInput, { length: 4, invalid: invalid.value, motion }) })
  const cells = () => [...document.querySelectorAll<HTMLElement>('.ui-otp-cell')]
  await vi.waitFor(() => expect(cells()).toHaveLength(4))
  for (let i = 0; i < 5; i++) await frame()
  invalid.value = true
  await vi.waitFor(() => expect(states(cells()[3]!).length).toBeGreaterThan(0))
  const delays = cells().map((c) => Math.round(Number(states(c)[0]?.effect?.getTiming().delay)))
  expect(delays).toEqual([0, 50, 100, 150])
})

test('Dock: picking an item plays its selected keyframes, again on the same item', async () => {
  const { default: Dock } = await import('../src/components/Dock/Dock.vue')
  render({
    setup: () => () =>
      h(Dock as never, {
        items: [{ label: 'Mail' }, { label: 'Notes' }],
        motion: { states: { selected: { item: { y: { value: [0, -20, 0], duration: 200 } } } } },
      }),
  })
  const items = () => [...document.querySelectorAll<HTMLElement>('.ui-dock-item')]
  await vi.waitFor(() => expect(items()).toHaveLength(2))
  for (let i = 0; i < 5; i++) await frame()
  items()[1]!.click()
  await vi.waitFor(() => expect(states(items()[1]!).length).toBeGreaterThan(0))
  expect(states(items()[0]!)).toHaveLength(0)
  await new Promise((r) => setTimeout(r, 300))
  expect(states(items()[1]!).filter((a) => a.playState === 'running')).toHaveLength(0)
  items()[1]!.click()
  await vi.waitFor(() =>
    expect(states(items()[1]!).some((a) => a.playState === 'running')).toBe(true),
  )
})

test('a motion rebuilt on every frame with the same values keeps its looping state running', async () => {
  const tick = shallowRef(0)
  const motion = (): ButtonMotion => {
    void tick.value
    return {
      states: {
        active: {
          root: {
            x: { value: [0, 2, 0], duration: 60, easing: 'linear', repeat: Infinity, delay: 0.1 },
          },
        },
      },
    }
  }
  render(() => h(Button as never, { motion: motion() }, () => 'Hold'))
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  await vi.waitFor(() => expect(button()).toBeTruthy())
  await new Promise((r) => setTimeout(r, 300))
  button().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  // A new but identical motion each frame, as a computed reading a live value makes.
  const moved: number[] = []
  for (let i = 0; i < 30; i++) {
    tick.value++
    await frame()
    moved.push(Math.abs(parseFloat(getComputedStyle(button()).translate) || 0))
  }
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
  expect(Math.max(...moved)).toBeGreaterThan(0.5)
})

test('what a state plays can change while it is on: a loop that starts mid-press plays, and stops when taken away', async () => {
  const progress = shallowRef(0)
  const loop = { x: { value: [0, 2, 0], duration: 60, easing: 'linear', repeat: Infinity } }
  const motion = (): ButtonMotion => ({
    states: { active: progress.value >= 0.6 && progress.value < 1 ? { root: loop } : {} },
  })
  render(() => h(Button as never, { motion: motion() }, () => 'Hold'))
  const button = () => document.querySelector<HTMLElement>('.ui-button')!
  await vi.waitFor(() => expect(button()).toBeTruthy())
  await new Promise((r) => setTimeout(r, 300))
  button().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  const sample = async (frames: number) => {
    const out: number[] = []
    for (let i = 0; i < frames; i++) {
      progress.value = Math.min(1, progress.value + 0.02)
      await frame()
      out.push(Math.abs(parseFloat(getComputedStyle(button()).translate) || 0))
    }
    return out
  }
  // 0 to 0.5: still; 0.6 to 0.98: trembling; at 1, home again.
  const before = await sample(25)
  const during = await sample(20)
  const after = await sample(20)
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
  expect(Math.max(...before)).toBe(0)
  expect(Math.max(...during)).toBeGreaterThan(0.5)
  expect(after.at(-1)).toBe(0)
})
