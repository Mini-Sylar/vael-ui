// Run `pnpm build` before this test — it consumes the built output, not source.
// Imports only from vael-ui/vapor, with no `vapor` resolve condition, like the README shows.
// toast(), openDialog() and the rest must reach the hosts, so both builds share one copy of
// their state.
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { createVaporApp } from 'vue'
import { confirmAction, openDialog, openPopover, toast } from 'vael-ui/vapor'
import SharedStateRoot from './fixtures/SharedStateRoot.vue'
import SharedStateDialogBody from './fixtures/SharedStateDialogBody.vue'
import SharedStateFieldProbe from './fixtures/SharedStateFieldProbe.vue'

const host = document.createElement('div')
document.body.append(host)
const root = createVaporApp(SharedStateRoot).mount(host) as unknown as { anchor: HTMLElement }

test('toast() reaches the Toaster', async () => {
  toast('Saved')
  await expect.element(page.getByText('Saved')).toBeVisible()
})

test('openDialog() reaches the DialogHost, and useDialogRef() works in the body', async () => {
  const handle = openDialog(SharedStateDialogBody, { title: 'Rename', data: 'from data' })
  await expect.element(page.getByTestId('dialog-body')).toHaveTextContent('from data')
  handle.close('done')
  await expect(handle.result).resolves.toBe('done')
})

test('openPopover() reaches the PopoverHost', async () => {
  const handle = openPopover(SharedStateFieldProbe, { triggerEl: root.anchor })
  await expect.element(page.getByRole('dialog')).toBeVisible()
  handle.close()
  await handle.result
})

test('confirmAction() opens', async () => {
  const { result } = confirmAction({ title: 'Delete it?' })
  await expect.element(page.getByText('Delete it?')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(result).resolves.toBe(false)
})

test('a custom control inside Field reads fieldKey', async () => {
  await expect.element(page.getByTestId('field-probe').first()).toHaveTextContent('in field')
})
