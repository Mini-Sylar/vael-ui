// Run `pnpm build` before this test — it consumes the built output, not source.
// The Create row is rendered through a conditional slot with fallback content
// inside a slot forwarded to SelectListBody: the same shape that broke Menu's
// nested #item under vaporInteropPlugin (vuejs/core#15596). Each case runs as a
// pure Vapor app, as a Vapor subtree of a vdom app, and with a plain vdom
// parent supplying the slots, to cover every interop path.
import { afterEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, createVaporApp, vaporInteropPlugin } from 'vue'
import { Combobox } from 'vael-ui/vapor'
import type { ComboboxTabBehavior } from 'vael-ui/vapor'
import ComboboxCreateRoot from './fixtures/ComboboxCreateRoot.vue'
import ComboboxCreateVdomRoot from './fixtures/ComboboxCreateVdomRoot.vue'

// 'vdom-parent': a plain (non-vapor) SFC hands its slots to the vapor Combobox.
type Mode = 'vapor' | 'interop' | 'vdom-parent'
let cleanup: (() => void) | undefined

afterEach(() => {
  cleanup?.()
  cleanup = undefined
})

function mount(mode: Mode, props: { withSlots?: boolean; tabBehavior?: ComboboxTabBehavior } = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app =
    mode === 'vapor'
      ? createVaporApp(ComboboxCreateRoot, props)
      : createApp(mode === 'interop' ? ComboboxCreateRoot : ComboboxCreateVdomRoot, props).use(
          vaporInteropPlugin,
        )
  app.mount(host)
  cleanup = () => {
    app.unmount()
    host.remove()
    for (const el of document.querySelectorAll('.ui-select-positioner')) el.remove()
  }
  return {
    input: host.querySelector<HTMLInputElement>('input[role="combobox"]')!,
    next: host.querySelector<HTMLInputElement>('[data-testid="next-field"]')!,
    value: () => host.querySelector('[data-testid="value"]')!.textContent,
    reasons: () => host.querySelector('[data-testid="reasons"]')!.textContent,
  }
}

function options() {
  return [...document.querySelectorAll('[role="option"]')].map((el) => el.textContent?.trim())
}
function activeOption() {
  return document.querySelector('[role="option"][data-active]')?.textContent?.trim()
}
function panelOpen() {
  return document.querySelectorAll('.ui-select-positioner').length > 0
}

test('the built Combobox is explicitly marked Vapor', () => {
  expect((Combobox as { __vapor?: boolean }).__vapor).toBe(true)
})

for (const mode of ['vapor', 'interop', 'vdom-parent'] as const) {
  test(`[${mode}] default Create row renders its localized text and commits via the keyboard`, async () => {
    const { input, value, reasons } = mount(mode)
    await userEvent.click(input)
    await userEvent.type(input, 'tu')
    await expect.poll(options).toEqual(['feature', 'Create "tu"'])
    expect(document.body.textContent).not.toContain('[object Object]')
    expect(activeOption()).toBe('feature')
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(activeOption).toBe('Create "tu"')
    await userEvent.keyboard('{Enter}')
    await expect.poll(value).toBe('"tu"')
    expect(reasons()).toBe('option')
    expect(input.value).toBe('tu')
  })

  test(`[${mode}] #create and #item slots render the consumer's content`, async () => {
    const { input, value } = mount(mode, { withSlots: true })
    await userEvent.click(input)
    await userEvent.type(input, 'tu')
    await expect.poll(options).toEqual(['feature (tu)', 'new tu'])
    expect(document.body.textContent).not.toContain('[object Object]')
    await userEvent.keyboard('{ArrowDown}')
    await expect
      .poll(() =>
        document.querySelector('[data-testid="custom-create"]')?.hasAttribute('data-active'),
      )
      .toBe(true)
    await userEvent.keyboard('{Enter}')
    await expect.poll(value).toBe('"tu"')
  })

  test(`[${mode}] Tab by default only moves focus, reverts the text and closes the panel`, async () => {
    const { input, next, value } = mount(mode)
    await userEvent.click(input)
    await userEvent.type(input, 'tu')
    await expect.poll(panelOpen).toBe(true)
    await userEvent.tab()
    expect(document.activeElement).toBe(next)
    await expect.poll(panelOpen).toBe(false)
    expect(value()).toBe('null')
    expect(input.value).toBe('')
  })

  test(`[${mode}] tabBehavior="select" picks the highlighted option`, async () => {
    const { input, next, value } = mount(mode, { tabBehavior: 'select' })
    await userEvent.click(input)
    await userEvent.type(input, 'tu')
    await expect.poll(activeOption).toBe('feature')
    await userEvent.tab()
    expect(document.activeElement).toBe(next)
    await expect.poll(value).toBe('"feature"')
  })

  test(`[${mode}] tabBehavior="create" keeps the typed text`, async () => {
    const { input, value, reasons } = mount(mode, { tabBehavior: 'create' })
    await userEvent.click(input)
    await userEvent.type(input, 'tu')
    await userEvent.tab()
    await expect.poll(value).toBe('"tu"')
    expect(reasons()).toBe('tab')
    expect(input.value).toBe('tu')
  })

  test(`[${mode}] Escape discards uncommitted typing`, async () => {
    const { input, value } = mount(mode)
    await userEvent.click(input)
    await userEvent.type(input, 'tu')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => input.value).toBe('')
    expect(value()).toBe('null')
  })
}
