// Run `pnpm build` first. A choice that moves focus elsewhere (a field, a popover, one anchored to the
// menu's own trigger) keeps it there as the Menu closes.
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import Root from './fixtures/MenuFocusVaporRoot.vue'

const rowByText = (text: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (el) => el.textContent?.trim() === text,
  )

test.each([
  ['Rename', '.field', 'key'],
  ['Later', '.field', 'key'],
  ['Save view', '.pfield', 'key'],
  ['Rename', '.field', 'click'],
  ['Later', '.field', 'click'],
  ['Save view', '.pfield', 'click'],
  ['Anchored', '.afield', 'key'],
  ['Anchored', '.afield', 'click'],
])('Vapor Menu: %s by %s keeps the focus it moved', async (label, target, how) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(Root)
  app.mount(host)
  try {
    await userEvent.click(host.querySelector('.trig')!)
    await vi.waitFor(() => expect(rowByText(label)).toBeTruthy())
    await vi.waitFor(() => expect(document.activeElement?.closest('[role="menu"]')).toBeTruthy())
    if (how === 'key') {
      rowByText(label)!.focus()
      await userEvent.keyboard('{Enter}')
    } else await userEvent.click(rowByText(label)!)
    await new Promise((r) => setTimeout(r, 700))
    expect(document.activeElement).toBe(document.querySelector(target))
  } finally {
    app.unmount()
    host.remove()
    for (const el of document.querySelectorAll('.ui-menu-positioner, .ui-popover-positioner'))
      el.remove()
  }
})
