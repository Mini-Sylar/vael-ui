import '../src/style.css'
import { expect, test } from 'vitest'
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

test("with before-close, the box shrinks alongside the consumer's own exit", async () => {
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
  // The dismiss button goes through before-close; flipping `open` from outside does not.
  screen.container.querySelector<HTMLButtonElement>('.ui-message-close')!.click()
  await nextTick()
  await frame()
  await frame()
  await frame()
  // The consumer's tween is still running (done not called), and the box is already shrinking.
  expect(below()).toBeLessThan(start)
  expect(screen.container.querySelector('.ui-message')).not.toBeNull()
  finish!()
  await new Promise((resolve) => setTimeout(resolve, 400))
  expect(screen.container.querySelector('.ui-message')).toBeNull()
})
