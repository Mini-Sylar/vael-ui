import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
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
