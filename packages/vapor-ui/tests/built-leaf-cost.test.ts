// Run `pnpm build` before this test — it consumes the built output, not source.
// The per-instance savings in the small components keep their behavior in Vapor.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp } from 'vue'
import LeafCostRoot from './fixtures/LeafCostRoot.vue'

let host: HTMLElement
let unmount: () => void
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(LeafCostRoot)
  app.mount(host)
  unmount = () => app.unmount()
})
afterEach(() => {
  unmount()
  host.remove()
})

const get = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!

test('a slot that reads `el` gets the button once mounted', async () => {
  await expect.poll(() => get('leaf-el').textContent).toBe('BUTTON')
})

test('a plain tag clicks on Enter, and a hold clicks once it completes', async () => {
  get('leaf-div').focus()
  await userEvent.keyboard('{Enter}')
  await expect.poll(() => get('leaf-counts').textContent).toBe('1|0')
  const hold = get('leaf-hold')
  await userEvent.click(hold)
  expect(get('leaf-counts').textContent).toBe('1|0')
  hold.focus()
  await userEvent.keyboard('[Space>]')
  await expect.poll(() => get('leaf-counts').textContent, { timeout: 2000 }).toBe('1|1')
  await userEvent.keyboard('[/Space]')
})

test('a Field shows what its control reports, and a switch clears its first-paint guard', async () => {
  const field = get('leaf-field')
  await expect.poll(() => field.getAttribute('data-filled')).toBe('true')
  expect(field.getAttribute('data-frame-size')).toBe('lg')
  const input = field.querySelector('input')!
  input.focus()
  await expect.poll(() => field.getAttribute('data-focused')).toBe('true')
  input.blur()
  await expect.poll(() => field.hasAttribute('data-focused')).toBe(false)
  await expect.poll(() => get('leaf-switch').hasAttribute('data-fresh')).toBe(false)
})

test('clearable added later shows its button; autoGrow added later sizes the textarea', async () => {
  expect(get('leaf-clear').closest('.ui-input')!.querySelector('.ui-input-clear')).toBeNull()
  await userEvent.click(get('leaf-clearable'))
  await expect
    .poll(() => get('leaf-clear').closest('.ui-input')!.querySelector('.ui-input-clear'))
    .not.toBeNull()
  const textarea = host.querySelector('.ui-textarea')!
  await userEvent.click(get('leaf-grow'))
  await expect.poll(() => textarea.getAttribute('data-multiline')).toBe('true')
})
