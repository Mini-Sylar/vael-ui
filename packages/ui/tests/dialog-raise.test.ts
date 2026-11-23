import '../src/style.css'
import { defineComponent, h, shallowRef } from 'vue'
import type { DefineComponent } from 'vue'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

// Two open windows (`modal` off), the first behind the second.
const Windows = defineComponent(() => {
  const open = shallowRef(true)
  const win = (name: string) =>
    h(
      Dialog as unknown as DefineComponent,
      { open: open.value, modal: false, 'aria-label': name, class: name, motion: false },
      () => h('input', { 'data-testid': name }),
    )
  return () => [win('back'), win('front')]
})

const zOf = (name: string) =>
  Number(getComputedStyle(document.querySelector(`.${name}`)!.parentElement!).zIndex || 0)

test('pressing a non-modal dialog brings it in front of the others', async () => {
  await render(Windows)
  await vi.waitFor(() => expect(document.querySelectorAll('[role="dialog"]').length).toBe(2))
  expect(zOf('front')).toBeGreaterThan(zOf('back'))

  // The windows overlap, so press the back one directly rather than click through the front.
  document.querySelector('.back')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  await vi.waitFor(() => expect(zOf('back')).toBeGreaterThan(zOf('front')))
})

// A bound `v-model:maximized` flipped from outside eases like the built-in button does.
test('maximizing from outside eases the size', async () => {
  const maximized = shallowRef(false)
  await render(
    defineComponent(
      () => () =>
        h(Dialog as unknown as DefineComponent, {
          open: true,
          maximized: maximized.value,
          'aria-label': 'outer',
          class: 'outer',
          motion: false,
        }),
    ),
  )
  const panel = () => document.querySelector('.outer')!
  await vi.waitFor(() => expect(panel()).toBeTruthy())
  expect(panel().classList.contains('ui-dialog-panel--resizing')).toBe(false)
  maximized.value = true
  await vi.waitFor(() => expect(panel().classList.contains('ui-dialog-panel--resizing')).toBe(true))
})
