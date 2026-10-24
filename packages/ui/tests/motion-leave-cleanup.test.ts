import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/directives/vAnimate'
import Dialog from '../src/components/Dialog/Dialog.vue'
import DialogHost from '../src/components/DialogHost/DialogHost.vue'
import { openDialog } from '../src/composables/useDialogService'

const real = { global: { stubs: { transition: false } } }
const frame = () => new Promise(requestAnimationFrame)

afterEach(() => {
  document.body.innerHTML = ''
})

test('a closed openDialog leaves the page once its exit has played, not before, not never', async () => {
  render({ setup: () => () => h(DialogHost) }, real)
  const handle = openDialog(defineComponent({ render: () => h('p', 'Body') }), { title: 'Service' })
  const panel = () => document.querySelector('.ui-dialog-panel')
  await vi.waitFor(() => expect(panel()?.hasAttribute('data-ui-m')).toBe(false), { timeout: 3000 })
  // A long exit, so a removal on a timer instead of on `after-leave` would show.
  document.documentElement.style.setProperty('--ui-duration-exit', '600ms')
  try {
    handle.close()
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(panel()).not.toBeNull()
    await vi.waitFor(() => expect(panel()).toBeNull(), { timeout: 2000 })
    expect(document.querySelector('.ui-dialog')).toBeNull()
  } finally {
    document.documentElement.style.removeProperty('--ui-duration-exit')
  }
})

test('a component unmounted in the middle of its exit leaves nothing behind', async () => {
  const shown = shallowRef(true)
  const open = shallowRef(true)
  render(
    {
      setup: () => () =>
        shown.value ? h(Dialog as never, { open: open.value, title: 'Going' }) : null,
    },
    real,
  )
  const panel = () => document.querySelector('.ui-dialog-panel')
  await vi.waitFor(() => expect(panel()?.hasAttribute('data-ui-m')).toBe(false), { timeout: 3000 })
  open.value = false
  await nextTick()
  await frame()
  // Its parent goes while the exit is still running.
  shown.value = false
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog')).toBeNull(), {
    timeout: 1000,
  })
})

// The same render grows a sibling: by the time it's removed, the row has already moved it.
test('an element leaves from where it was painted, even when the same render moves it', async () => {
  const wide = shallowRef(false)
  render({
    setup: () => () =>
      h('div', { style: 'display: flex; justify-content: center; width: 400px' }, [
        h('div', { style: { width: wide.value ? '200px' : '100px', height: '20px' } }),
        wide.value
          ? null
          : withDirectives(h('div', { class: 'leaving', style: 'width: 40px; height: 20px' }), [
              [vAnimate, { exit: { opacity: 0 }, duration: 400 }],
            ]),
      ]),
  })
  await vi.waitFor(() => expect(document.querySelector('.leaving')).not.toBeNull())
  await frame()
  const before = document.querySelector('.leaving')!.getBoundingClientRect().left
  wide.value = true
  await nextTick()
  await frame()
  const leaving = document.querySelector<HTMLElement>('.leaving')
  expect(leaving?.getAnimations()).toHaveLength(1)
  expect(leaving!.getBoundingClientRect().left).toBeCloseTo(before, 0)
})

// Inside a slot the owner doesn't re-render; the component around it does.
test('in a slot, an element leaves from where it was painted when a sibling grows', async () => {
  const wide = shallowRef(false)
  const Row = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h(
          'div',
          { style: 'display: flex; justify-content: center; width: 400px' },
          slots.default?.(),
        ),
  })
  render({
    setup: () => () =>
      h(Row, null, () => [
        withDirectives(
          h('div', { style: { width: wide.value ? '200px' : '100px', height: '20px' } }),
          [[vAnimate, {}]],
        ),
        wide.value
          ? null
          : withDirectives(h('div', { class: 'leaving', style: 'width: 40px; height: 20px' }), [
              [vAnimate, { exit: { opacity: 0 }, duration: 400 }],
            ]),
      ]),
  })
  await vi.waitFor(() => expect(document.querySelector('.leaving')).not.toBeNull())
  await frame()
  const before = document.querySelector('.leaving')!.getBoundingClientRect().left
  wide.value = true
  await nextTick()
  await frame()
  const leaving = document.querySelector<HTMLElement>('.leaving')
  expect(leaving?.getAnimations()).toHaveLength(1)
  expect(leaving!.getBoundingClientRect().left).toBeCloseTo(before, 0)
})
