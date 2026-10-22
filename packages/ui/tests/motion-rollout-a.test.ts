// Motion rollout: appearance, parts and states for the display components.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, type Component } from 'vue'
import AnimatedNumber from '../src/components/AnimatedNumber/AnimatedNumber.vue'
import AnimatedText from '../src/components/AnimatedText/AnimatedText.vue'
import Avatar from '../src/components/Avatar/Avatar.vue'
import AvatarGroup from '../src/components/AvatarGroup/AvatarGroup.vue'
import Badge from '../src/components/Badge/Badge.vue'
import Breadcrumb from '../src/components/Breadcrumb/Breadcrumb.vue'
import Button from '../src/components/Button/Button.vue'
import ButtonGroup from '../src/components/ButtonGroup/ButtonGroup.vue'
import Card from '../src/components/Card/Card.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Kbd from '../src/components/Kbd/Kbd.vue'
import Loader from '../src/components/Loader/Loader.vue'
import Skeleton from '../src/components/Skeleton/Skeleton.vue'
import type { CardMotion } from '../src/motion/types'

const frame = () => new Promise(requestAnimationFrame)
const states = (el: Element | null | undefined) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === 'ui-state')
const hidden = (parts: string[]) => ({
  initial: Object.fromEntries(parts.map((part) => [part, { opacity: 0 }])),
})
// The state player loads on demand; once it's here, a change plays instead of catching up.
const playerReady = async () => {
  await import('../src/motion/states')
  for (let i = 0; i < 3; i++) await frame()
}
type Exposed = { parts: Record<string, HTMLElement | HTMLElement[] | null> }
// A 1×1 PNG, so the avatar's image loads without the network.
const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

afterEach(() => {
  document.body.innerHTML = ''
})

const cases: {
  name: string
  component: Component
  props?: Record<string, unknown>
  slots?: () => Record<string, () => unknown>
  parts: string[]
  /** Parts that repeat, with how many. */
  many?: Record<string, number>
}[] = [
  { name: 'AnimatedNumber', component: AnimatedNumber, props: { value: 42 }, parts: ['root'] },
  { name: 'AnimatedText', component: AnimatedText, props: { value: 'Hi' }, parts: ['root'] },
  {
    name: 'Avatar',
    component: Avatar,
    props: { src: pixel, name: 'Ada Lovelace' },
    slots: () => ({ badge: () => h(Badge, { dot: true }) }),
    parts: ['root', 'image', 'fallback', 'badge'],
  },
  {
    name: 'AvatarGroup',
    component: AvatarGroup,
    props: { overflowCount: 2 },
    slots: () => ({ default: () => [h(Avatar, { name: 'A B' }), h(Avatar, { name: 'C D' })] }),
    parts: ['root', 'avatar'],
    many: { avatar: 3 },
  },
  { name: 'Badge', component: Badge, props: { count: 3 }, parts: ['root'] },
  {
    name: 'Breadcrumb',
    component: Breadcrumb as never,
    props: { items: [{ label: 'Home' }, { label: 'Docs' }, { label: 'Motion' }] },
    parts: ['root', 'item'],
    many: { item: 3 },
  },
  {
    name: 'ButtonGroup',
    component: ButtonGroup,
    slots: () => ({ default: () => [h(Button, null, () => 'A'), h(Button, null, () => 'B')] }),
    parts: ['root'],
  },
  {
    name: 'Card',
    component: Card,
    props: { title: 'Title', description: 'Description' },
    slots: () => ({ default: () => 'Body', footer: () => 'Footer' }),
    parts: ['root', 'header', 'title', 'description', 'body', 'footer'],
  },
  { name: 'Kbd', component: Kbd, slots: () => ({ default: () => 'K' }), parts: ['root'] },
  { name: 'Loader', component: Loader, parts: ['root'] },
  // Its pulse owns opacity while it runs, so an opacity appearance shows only without it.
  { name: 'Skeleton', component: Skeleton, props: { animated: false }, parts: ['root'] },
]

for (const c of cases)
  test(`${c.name}: exposes its parts and plays their appearance`, async () => {
    const instance = shallowRef<Exposed>()
    render({
      setup: () => () =>
        h(
          c.component as never,
          { ...c.props, motion: hidden(c.parts), ref: instance },
          c.slots?.(),
        ),
    })
    await vi.waitFor(() => expect(instance.value).toBeDefined())
    const parts = instance.value!.parts
    for (const part of c.parts) {
      const el = parts[part]
      if (c.many?.[part]) {
        expect(el, part).toBeInstanceOf(Array)
        expect((el as HTMLElement[]).length, part).toBe(c.many[part])
      } else expect(el, part).toBeInstanceOf(HTMLElement)
    }
    const root = parts.root as HTMLElement
    // Not its own CSS keyframes: Loader spins and Skeleton pulses regardless.
    await vi.waitFor(() =>
      expect(root.getAnimations().some((a) => !(a instanceof CSSAnimation))).toBe(true),
    )
  })

test('an interactive card plays its press state', async () => {
  const motion: CardMotion = { states: { active: { root: { scale: '0.9' } } } }
  render({ setup: () => () => h(Card, { interactive: true, motion }, () => 'Body') })
  const card = () => document.querySelector<HTMLElement>('.ui-card')!
  await vi.waitFor(() => expect(card()).not.toBeNull())
  await playerReady()
  card().dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
  )
  await vi.waitFor(() => expect(getComputedStyle(card()).scale).toBe('0.9'), { timeout: 2000 })
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
  await vi.waitFor(() => expect(states(card())).toHaveLength(0), { timeout: 2000 })
})

test("a shared style's press look reaches an interactive card, not a plain one", async () => {
  render({
    setup: () => () =>
      h(
        ConfigProvider as never,
        { motion: { version: 1, press: { active: { opacity: 0.4 } } } },
        () => [
          h(Card, { interactive: true, 'data-testid': 'interactive' }, () => 'A'),
          h(Card, { 'data-testid': 'plain' }, () => 'B'),
        ],
      ),
  })
  const get = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!
  await vi.waitFor(() => expect(get('plain')).not.toBeNull())
  await playerReady()
  for (const id of ['interactive', 'plain'])
    get(id).dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
    )
  await vi.waitFor(() => expect(getComputedStyle(get('interactive')).opacity).toBe('0.4'), {
    timeout: 2000,
  })
  expect(states(get('plain'))).toHaveLength(0)
  expect(getComputedStyle(get('plain')).opacity).toBe('1')
  window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }))
})

test("AnimatedNumber: `when: 'visible'` still rolls in view alongside an appearance", async () => {
  render({
    setup: () => () =>
      h(AnimatedNumber, {
        value: 7,
        locale: 'en-US',
        motion: { when: 'visible', initial: { root: { opacity: 0 } } },
      }),
  })
  const digit = () => document.querySelector<HTMLElement>('.ui-animated-number-digit')
  await vi.waitFor(() => expect(digit()?.style.getPropertyValue('--ui-digit')).toBe('7'))
})

test('`false` keeps AnimatedNumber and AnimatedText still', async () => {
  render({
    setup: () => () => [
      h(AnimatedNumber, { value: 1, motion: false }),
      h(AnimatedText, { value: 'a', motion: false }),
    ],
  })
  await vi.waitFor(() => expect(document.querySelector('.ui-animated-text')).not.toBeNull())
  for (const selector of ['.ui-animated-number', '.ui-animated-text'])
    expect(document.querySelector(selector)!.getAttribute('data-motion')).toBe('off')
})

test('`false` holds a Loader still and stops a Skeleton pulsing', async () => {
  const { default: Loader } = await import('../src/components/Loader/Loader.vue')
  const { default: Skeleton } = await import('../src/components/Skeleton/Skeleton.vue')
  const screen = await render(() => [
    h(Loader as never, { motion: false }),
    h(Skeleton as never, { motion: false }),
  ])
  const running = (el: Element) =>
    [el, ...el.querySelectorAll('*')]
      .flatMap((e) => e.getAnimations())
      .filter((a) => a.playState === 'running')
  expect(running(screen.container.querySelector('.ui-loader')!)).toHaveLength(0)
  expect(running(screen.container.querySelector('.ui-skeleton')!)).toHaveLength(0)
})
