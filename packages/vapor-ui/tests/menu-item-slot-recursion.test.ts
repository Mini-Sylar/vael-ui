/**
 * The built Vapor <Menu> forwarding a custom #item slot down through nested
 * submenus. A bare `<slot name="item">` in that forward compiles, under the
 * Vapor compiler, to a `createSlot('item')` that re-resolves against the
 * SUBMENU instance — whose own #item is that same forward — so it recurses
 * until the stack blows and nothing renders. The fix relays the parent's
 * captured slot through `<component :is>` instead. Consumes ../ui/dist/vapor,
 * so run `pnpm build` first.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import MenuItemSlotRoot from './fixtures/MenuItemSlotRoot.vue'

function mount() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(MenuItemSlotRoot)
  app.mount(host)
  return {
    app,
    host,
    cleanup() {
      app.unmount()
      host.remove()
      for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
    },
  }
}

function rowByText(text: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (el) => el.textContent?.trim() === text,
    ) ?? null
  )
}

/** Opens a submenu by activating its trigger row, the way a real click does. */
async function expandRow(text: string) {
  const row = await vi.waitFor(() => {
    const el = rowByText(text)
    if (!el) throw new Error(`row "${text}" not found`)
    return el
  })
  row.click()
}

test('a custom #item slot survives being forwarded through nested submenus (no recursion, no fallback)', async () => {
  const { host, cleanup } = mount()
  try {
    host.querySelector<HTMLElement>('[data-testid="vapor-menu-trigger"]')!.click()

    // Level 0 — root list, rendered through the custom slot.
    await vi.waitFor(() => expect(rowByText('mark:Cut')).not.toBeNull())
    expect(rowByText('mark:Share')).not.toBeNull()

    // Level 1 — opening "Share" forces the first forwarded submenu to render
    // its rows. The old Vapor build blew the stack right here.
    await expandRow('mark:Share')
    await vi.waitFor(() => expect(rowByText('mark:Copy Link')).not.toBeNull())
    expect(rowByText('mark:Social')).not.toBeNull()

    // Level 2 — still the consumer's markup, not a reverted default row.
    await expandRow('mark:Social')
    await vi.waitFor(() => expect(rowByText('mark:Twitter')).not.toBeNull())
    expect(rowByText('mark:Mastodon')).not.toBeNull()

    // A deep leaf still selects and bubbles its value.
    rowByText('mark:Twitter')!.click()
    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="vapor-menu-selected"]')!.textContent).toBe(
        'twitter',
      ),
    )
  } finally {
    cleanup()
  }
})
