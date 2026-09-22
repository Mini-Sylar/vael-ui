/**
 * Same nested-submenu #item forward as menu-item-slot-recursion.test.ts, but
 * mounted through `vaporInteropPlugin` instead of a pure `createVaporApp`
 * root. The relay that forwards a captured slot into a nested instance (see
 * useSlotRelay.ts) is a plain functional component under vdom's own patch
 * logic; when a Vapor-marked ancestor is embedded via vaporInteropPlugin,
 * vdom treats an unmarked function component as vdom and stringifies the
 * Vapor block the relay's render returns — https://github.com/vuejs/core/issues/15596.
 * Consumes ../ui/dist/vapor, so run `pnpm build` first.
 */
import { expect, test, vi } from 'vitest'
import { createApp, vaporInteropPlugin } from 'vue'
import MenuItemSlotRoot from './fixtures/MenuItemSlotRoot.vue'

function mount() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(MenuItemSlotRoot)
  app.use(vaporInteropPlugin)
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

async function expandRow(text: string) {
  const row = await vi.waitFor(() => {
    const el = rowByText(text)
    if (!el) throw new Error(`row "${text}" not found`)
    return el
  })
  row.click()
}

test('a custom #item slot forwarded through nested submenus renders correctly under vaporInteropPlugin', async () => {
  const { host, cleanup } = mount()
  try {
    host.querySelector<HTMLElement>('[data-testid="vapor-menu-trigger"]')!.click()

    // Level 0 — root list, rendered through the custom slot directly (never
    // went through the relay, so this passed even with the bug present).
    await vi.waitFor(() => expect(rowByText('mark:Cut')).not.toBeNull())
    expect(rowByText('mark:Share')).not.toBeNull()

    // Level 1 — the first forwarded submenu. Under the bug this rendered the
    // literal string "[object Object]" instead of the relayed slot output.
    await expandRow('mark:Share')
    await vi.waitFor(() => expect(rowByText('mark:Copy Link')).not.toBeNull())
    expect(rowByText('mark:Social')).not.toBeNull()
    expect(document.body.textContent).not.toContain('[object Object]')

    // Level 2 — a slot forwarded through a slot, the exact shape the bug needed.
    await expandRow('mark:Social')
    await vi.waitFor(() => expect(rowByText('mark:Twitter')).not.toBeNull())
    expect(rowByText('mark:Mastodon')).not.toBeNull()
    expect(document.body.textContent).not.toContain('[object Object]')

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
