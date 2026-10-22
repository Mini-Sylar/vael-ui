import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, defineComponent } from 'vue'
import Message from '../src/components/Message/Message.vue'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

// A message that appears or leaves after mount takes what's below with it, instead of snapping.
test('the box grows in and shrinks out with the fade', async () => {
  const open = shallowRef(false)
  const Fixture = defineComponent({
    setup: () => () => [
      h(Message, { open: open.value, title: 'Saved', variant: 'success' }),
      h('p', { class: 'below' }, 'Below'),
    ],
  })
  const screen = await render(Fixture, { global: { stubs: { transition: false } } })
  const below = () =>
    screen.container.querySelector<HTMLElement>('.below')!.getBoundingClientRect().top
  const message = () => screen.container.querySelector<HTMLElement>('.ui-message')
  const start = below()

  open.value = true
  await nextTick()
  await frame()
  await frame()
  const partway = below()
  expect(message()!.style.blockSize).toMatch(/px$/)
  expect(partway).toBeGreaterThan(start)
  await new Promise((resolve) => setTimeout(resolve, 400))
  const settled = below()
  expect(settled).toBeGreaterThan(partway)
  expect(message()!.style.blockSize).toBe('')

  open.value = false
  await nextTick()
  await frame()
  await frame()
  const shrinking = below()
  expect(shrinking).toBeLessThan(settled)
  expect(shrinking).toBeGreaterThan(start)
  await new Promise((resolve) => setTimeout(resolve, 400))
  expect(message()).toBeNull()
  expect(below()).toBe(start)
})

test('while before-close decides, the box holds as it is; it leaves once allowed', async () => {
  const open = shallowRef(true)
  let finish: (() => void) | null = null
  const Fixture = defineComponent({
    setup: () => () => [
      h(Message, {
        open: open.value,
        'onUpdate:open': (value: boolean) => (open.value = value),
        title: 'Saved',
        closable: true,
        beforeClose: () => new Promise<boolean>((allow) => (finish = () => allow(true))),
      }),
      h('p', { class: 'below' }, 'Below'),
    ],
  })
  const screen = await render(Fixture, { global: { stubs: { transition: false } } })
  const below = () =>
    screen.container.querySelector<HTMLElement>('.below')!.getBoundingClientRect().top
  const start = below()
  screen.container.querySelector<HTMLButtonElement>('.ui-message-close')!.click()
  await nextTick()
  for (let i = 0; i < 4; i++) await frame()
  // Still deciding (a confirm, say): nothing moves.
  expect(below()).toBe(start)
  finish!()
  await vi.waitFor(() => expect(screen.container.querySelector('.ui-message')).toBeNull())
})

function renderMessage(motion: unknown) {
  const open = shallowRef(false)
  const Fixture = defineComponent({
    setup: () => () => [
      h(Message as never, { open: open.value, title: 'Saved', motion }),
      h('p', { class: 'below' }, 'Below'),
    ],
  })
  const screen = render(Fixture, { global: { stubs: { transition: false } } })
  return { open, screen }
}

test('your leave plays first, then the space closes; nothing below jumps', async () => {
  const left: HTMLElement[] = []
  const { open, screen } = renderMessage({
    leave: ({ root }: { root: HTMLElement }) => {
      left.push(root)
      return root.animate([{ translate: '0' }, { translate: '24px', opacity: 0 }], {
        duration: 200,
        fill: 'forwards',
      })
    },
  })
  const container = (await screen).container
  open.value = true
  await vi.waitFor(() => expect(container.querySelector('.ui-message')).not.toBeNull())
  await new Promise((resolve) => setTimeout(resolve, 400))
  const below = () => container.querySelector<HTMLElement>('.below')!.getBoundingClientRect().top
  const start = below()
  open.value = false
  await vi.waitFor(() => expect(left).toHaveLength(1))
  // Your exit runs with the space held.
  await frame()
  await frame()
  expect(below()).toBe(start)
  // Then the space closes, through every frame in between.
  const tops: number[] = []
  while (container.querySelector('.ui-message')) {
    tops.push(below())
    await frame()
  }
  expect(tops.some((top) => top < start && top > below())).toBe(true)
})

test('`false` shows and hides it at once', async () => {
  const { open, screen } = renderMessage(false)
  const container = (await screen).container
  open.value = true
  await nextTick()
  expect(container.querySelector('.ui-message')!.getAnimations()).toHaveLength(0)
  open.value = false
  await nextTick()
  await nextTick()
  expect(container.querySelector('.ui-message')).toBeNull()
})
