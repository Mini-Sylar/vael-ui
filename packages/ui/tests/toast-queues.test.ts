import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import type { DeepReadonly } from 'vue'
import Toaster from '../src/components/Toaster/Toaster.vue'
import { toast, useToastQueue } from '../src/composables/useToast'
import type { ToastEntry } from '../src/composables/useToast'

// Generated Toaster names must not leave empty queues behind. A dropped queue comes back
// as a fresh array, so identity tells it from a kept one.

function mountToaster(name: string) {
  let held: DeepReadonly<ToastEntry[]> | undefined
  const Probe = defineComponent(() => {
    held = useToastQueue(name).toasts
    return () => null
  })
  return render({ render: () => [h(Toaster, { name }), h(Probe)] }).then((screen) => ({
    screen,
    held: () => held!,
  }))
}

test("an unmounted Toaster's queue is dropped once it's empty", async () => {
  const { screen, held } = await mountToaster('generated-1')
  const id = toast('Hello', { toaster: 'generated-1' })
  await expect.element(page.getByText('Hello')).toBeInTheDocument()
  toast.dismiss(id)
  screen.unmount()
  expect(useToastQueue('generated-1').toasts).not.toBe(held())
})

test('a queue still holding toasts outlives its Toaster, then goes once they are dismissed', async () => {
  const { screen, held } = await mountToaster('generated-2')
  const id = toast('Still here', { toaster: 'generated-2', duration: Infinity })
  screen.unmount()

  // Kept: the toast is still waiting for a Toaster with this name.
  const remount = await mountToaster('generated-2')
  expect(remount.held()).toBe(held())
  await expect.element(page.getByText('Still here')).toBeInTheDocument()
  remount.screen.unmount()

  toast.dismiss(id)
  expect(useToastQueue('generated-2').toasts).not.toBe(held())
})

test('a mounted Toaster keeps its queue while it is empty', async () => {
  const { screen, held } = await mountToaster('generated-3')
  const id = toast('Brief', { toaster: 'generated-3' })
  toast.dismiss(id)
  const again = toast('Again', { toaster: 'generated-3' })
  await expect.element(page.getByText('Again')).toBeInTheDocument()
  expect(held().some((t) => t.id === again)).toBe(true)
  toast.dismiss(again)
  screen.unmount()
})

test('a toast sent before its Toaster mounts still shows when it does', async () => {
  toast('Early bird', { toaster: 'generated-4' })
  const { screen } = await mountToaster('generated-4')
  await expect.element(page.getByText('Early bird')).toBeInTheDocument()
  toast.dismiss()
  screen.unmount()
})

test('a toast that times out under an unmounted Toaster drops the queue too', async () => {
  vi.useFakeTimers()
  try {
    const { screen, held } = await mountToaster('generated-5')
    screen.unmount()
    toast('Timed', { toaster: 'generated-5', duration: 1000 })
    vi.advanceTimersByTime(1500)
    expect(useToastQueue('generated-5').toasts).not.toBe(held())
  } finally {
    vi.useRealTimers()
  }
})
