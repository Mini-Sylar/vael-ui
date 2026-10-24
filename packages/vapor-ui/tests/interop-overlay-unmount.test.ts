// Run `pnpm build` before this test — it consumes the built output, not source.
// A vdom component inside a Vapor overlay's slot must run its unmount hooks, or whatever it
// holds (a motion library's element registry, timers, listeners) leaks with every use.
import { expect, test, vi } from 'vitest'
import { createApp, h, nextTick, shallowRef, vaporInteropPlugin } from 'vue'
import Parent from './fixtures/InteropOverlayVdomParent.vue'

async function run(which: string, forceMount: boolean, end: 'close' | 'remove' | 'app') {
  const gone = vi.fn()
  const show = shallowRef(true)
  const open = shallowRef(true)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: () =>
      h(Parent, {
        which,
        forceMount,
        onGone: gone,
        show: show.value,
        'onUpdate:show': (v: boolean) => (show.value = v),
        open: open.value,
        'onUpdate:open': (v: boolean) => (open.value = v),
      }),
  }).use(vaporInteropPlugin)
  app.mount(host)
  await nextTick()
  await vi.waitFor(() => expect(document.querySelector('[data-testid="probe"]')).not.toBeNull())
  if (end === 'close') open.value = false
  if (end === 'remove') show.value = false
  if (end === 'app') app.unmount()
  await vi.waitFor(() => expect(gone).toHaveBeenCalledTimes(1), { timeout: 2000 })
  if (end !== 'app') app.unmount()
  host.remove()
}

for (const which of ['popover', 'dialog', 'select']) {
  test(`${which}: closing unmounts vdom slot content`, () => run(which, false, 'close'))
  test(`${which}: removing the overlay unmounts vdom slot content`, () =>
    run(which, false, 'remove'))
  test(`${which}: unmounting the app unmounts vdom slot content`, () => run(which, false, 'app'))
}
test('popover with forceMount: removing it unmounts vdom slot content', () =>
  run('popover', true, 'remove'))
test('dialog with forceMount: removing it unmounts vdom slot content', () =>
  run('dialog', true, 'remove'))
