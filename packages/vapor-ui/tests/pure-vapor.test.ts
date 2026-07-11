/**
 * Verifies the OPPOSITE direction from vapor-interop.test.ts: not a Vapor
 * host consuming the library's VDOM components through vaporInteropPlugin,
 * but vael-ui's own composables (useAsyncLoading, useDialog, useVirtualizer)
 * reused inside genuinely Vapor-AUTHORED components (`<script setup vapor>`)
 * — no interop plugin installed at all, no VDOM anywhere in the tree. This
 * is the real question for shipping a Vapor-native build: does the
 * library's headless logic layer port, independent of any interop bridge.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import PureVaporRoot from './fixtures/PureVaporRoot.vue'

function mountApp() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(PureVaporRoot)
  app.mount(host)
  return { app, host }
}

const byId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

test('the root really is vapor-compiled, with no interop plugin installed', () => {
  expect((PureVaporRoot as { __vapor?: boolean }).__vapor).toBe(true)
})

test('useAsyncLoading reactivity works in a pure-Vapor component', async () => {
  const { app } = mountApp()
  try {
    expect(byId('vapor-spike-state')!.textContent).toContain('Save')
    byId('vapor-spike-button')!.click()
    await vi.waitFor(() => expect(byId('vapor-spike-state')!.textContent).toContain('Saving…'))
    expect(byId('vapor-spike-button')!.className).toContain('ui-button--loading')
    await vi.waitFor(() => expect(byId('vapor-spike-state')!.textContent).toContain('Save'), {
      timeout: 2000,
    })
    expect(byId('vapor-spike-button')!.className).not.toContain('ui-button--loading')
  } finally {
    app.unmount()
  }
})

test('useTemplateRef resolves for a plain Vapor-native element (rc.1)', async () => {
  const { app } = mountApp()
  try {
    // Previously documented as broken on 3.6.0-beta.17 (see App.vue's own
    // comment on `dropzoneEl`) — this is a regression guard in both
    // directions: catches it staying broken, and catches it breaking again.
    await vi.waitFor(() =>
      expect(byId('vapor-dialog-templateref-resolved')!.textContent).toBe('yes'),
    )
  } finally {
    app.unmount()
  }
})

test('Teleport + useDialog() work in a pure-Vapor component', async () => {
  const { app, host } = mountApp()
  try {
    expect(byId('vapor-dialog-overlay')).toBeNull()
    byId('vapor-dialog-open')!.click()
    await vi.waitFor(() => expect(byId('vapor-dialog-overlay')).not.toBeNull())
    const panel = byId('vapor-dialog-panel')!
    expect(document.body.contains(panel)).toBe(true)
    expect(host.contains(panel)).toBe(false)

    byId('vapor-dialog-close')!.click()
    await vi.waitFor(() => expect(byId('vapor-dialog-overlay')).toBeNull())
  } finally {
    app.unmount()
  }
})

test('useVirtualizer windows a 1000-row list in a pure-Vapor component', async () => {
  const { app } = mountApp()
  try {
    const initialCount = Number(byId('vapor-virtual-rendered-count')!.textContent)
    // Windowed, not all 1000 rows actually in the DOM.
    expect(initialCount).toBeGreaterThan(0)
    expect(initialCount).toBeLessThan(100)
    const firstRowBefore = document.querySelector('[data-testid="vapor-virtual-row"]')
    expect(firstRowBefore?.getAttribute('data-index')).toBe('0')

    const container = byId('vapor-virtual-container')!
    container.scrollTop = 5000
    container.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => {
      const firstRowAfter = document.querySelector('[data-testid="vapor-virtual-row"]')
      expect(firstRowAfter?.getAttribute('data-index')).not.toBe('0')
    })
  } finally {
    app.unmount()
  }
})

test("useAttrs()/useSlots() called from a Vapor component's OWN script work — Button.vue's exact pattern", async () => {
  const { app } = mountApp()
  try {
    // useAttrs(): the child manually intercepts and invokes attrs.onClick —
    // exactly how Button.vue's auto-loading wrapper works. If this only
    // worked via Vue's own native @click passthrough (not useAttrs()), the
    // manual interception pattern itself would be the thing broken.
    expect(byId('vapor-attrs-slots-parent-clicked')!.textContent).toBe('no')
    byId('vapor-attrs-slots-btn')!.click()
    await vi.waitFor(() =>
      expect(byId('vapor-attrs-slots-parent-clicked')!.textContent).toBe('yes'),
    )

    // useSlots(): both the template's implicit $slots.extra check and the
    // explicit useSlots() composable call must agree a slot was passed from
    // a genuine Vapor parent, and the slot's actual content must render.
    expect(byId('vapor-attrs-slots-has-extra')!.textContent).toBe('yes')
    expect(byId('vapor-attrs-slots-extra-wrapper')).not.toBeNull()
    expect(byId('vapor-attrs-slots-extra-content')!.textContent).toBe('Extra slot content')
  } finally {
    app.unmount()
  }
})
