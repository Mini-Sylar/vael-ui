import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, onMounted } from 'vue'
import DialogHost from '../src/components/DialogHost/DialogHost.vue'
import PopoverHost from '../src/components/PopoverHost/PopoverHost.vue'
import { confirmAction } from '../src/composables/confirmAction'
import { openDialog, useDialogQueue } from '../src/composables/useDialogService'
import { openPopover, usePopoverQueue } from '../src/composables/usePopoverService'

// The opener unmounts while its overlay is open; the service must not live in its effect scope.

const Body = defineComponent({ render: () => h('p', 'Body') })

function opener<T>(open: () => T) {
  let handle: T | undefined
  const Opener = defineComponent({
    setup() {
      onMounted(() => {
        handle = open()
      })
      return () => h('span', 'Opener')
    },
  })
  return { Opener, handle: () => handle! }
}

test('openDialog from an unmounted opener still settles and leaves the queue (handle.close)', async () => {
  const queue = useDialogQueue()
  const before = queue.length
  await render({ render: () => h(DialogHost) })
  const { Opener, handle } = opener(() => openDialog(Body, { title: 'Orphan' }))
  const screen = await render(Opener)
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog')).not.toBeNull())
  screen.unmount()

  handle().close('done')
  await expect(handle().result).resolves.toBe('done')
  await vi.waitFor(() => expect(queue.length).toBe(before))
})

test('openDialog from an unmounted opener still settles and leaves the queue (Escape)', async () => {
  const queue = useDialogQueue()
  const before = queue.length
  await render({ render: () => h(DialogHost) })
  const { Opener, handle } = opener(() => openDialog(Body, { title: 'Orphan' }))
  const screen = await render(Opener)
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog')).not.toBeNull())
  screen.unmount()

  await userEvent.keyboard('{Escape}')
  await expect(handle().result).resolves.toBeUndefined()
  await vi.waitFor(() => expect(queue.length).toBe(before))
})

test('openPopover from an unmounted opener still settles and leaves the queue', async () => {
  const queue = usePopoverQueue()
  const before = queue.length
  await render({ render: () => [h(PopoverHost), h('button', { id: 'orphan-anchor' }, 'Anchor')] })
  const { Opener, handle } = opener(() =>
    openPopover(Body, { triggerEl: document.getElementById('orphan-anchor')! }),
  )
  const screen = await render(Opener)
  await vi.waitFor(() => expect(document.querySelector('.ui-popover-positioner')).not.toBeNull())
  screen.unmount()

  await userEvent.keyboard('{Escape}')
  await expect(handle().result).resolves.toBeUndefined()
  await vi.waitFor(() => expect(queue.length).toBe(before))
})

test('confirmAction from an unmounted opener still settles and leaves the queue', async () => {
  const queue = useDialogQueue()
  const before = queue.length
  await render({ render: () => h(DialogHost) })
  const { Opener, handle } = opener(() => confirmAction({ title: 'Leave?' }))
  const screen = await render(Opener)
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog')).not.toBeNull())
  screen.unmount()

  handle().close(true)
  await expect(handle().result).resolves.toBe(true)
  await vi.waitFor(() => expect(queue.length).toBe(before))
})
