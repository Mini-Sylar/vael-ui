/**
 * Verifies the brief's riskiest assumption: a Vapor-compiled parent rendering
 * the library's slot-heavy VDOM components through vaporInteropPlugin.
 * The library itself ships normal compiled output (dist) — only this host
 * app is Vapor.
 */
import { expect, test, vi } from 'vitest'
import { createVaporApp, vaporInteropPlugin } from 'vue'
import App from '../src/App.vue'

function mountApp() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(App)
  app.use(vaporInteropPlugin)
  app.mount(host)
  return { app, host }
}

const byId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

test('the host component really is vapor-compiled', () => {
  // Guard against the `vapor` attr being silently ignored — that would turn
  // this whole suite into a meaningless VDOM-in-VDOM test.
  expect((App as { __vapor?: boolean }).__vapor).toBe(true)
})

test('vapor host renders all five primitives with working scoped slots', async () => {
  const { app } = mountApp()
  try {
    // Button: default scoped slot content + auto loading through run()
    expect(byId('save')!.textContent).toContain('Save')
    byId('save')!.click()
    await vi.waitFor(() => expect(byId('save')!.textContent).toContain('Saving…'))
    await vi.waitFor(() => expect(byId('save')!.textContent).toContain('Save'), {
      timeout: 2000,
    })

    // Tabs: scoped slot rendering + select() from a vapor-rendered child
    expect(document.querySelectorAll('[role="tab"]').length).toBe(2)
    byId('tab-beta')!.click()
    await vi.waitFor(() => expect(byId('active-tab')!.textContent).toBe('beta'))

    // Dialog: v-model open from vapor parent, teleported slot content, close()
    byId('open-dialog')!.click()
    await vi.waitFor(() => expect(byId('dialog-content')).not.toBeNull())
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true')
    byId('dialog-done')!.click()
    await vi.waitFor(() => expect(byId('dialog-state')!.textContent).toBe('closed'))
    await vi.waitFor(() => expect(byId('dialog-content')).toBeNull())

    // Popover: the #trigger slot's function ref (setTriggerEl) crossing the
    // Vapor/VDOM boundary is the riskiest part — a callback ref, not a plain
    // string ref, bound from Vapor-compiled template code onto a VDOM slot's
    // own markup. Floating-ui positioning depends on that ref resolving to a
    // real element for computePosition() to have anything to anchor to.
    byId('popover-trigger')!.click()
    await vi.waitFor(() => expect(byId('popover-content')).not.toBeNull())
    await vi.waitFor(() => expect(byId('popover-state')!.textContent).toBe('open'))
    const positioner = document.querySelector<HTMLElement>('.ui-popover-positioner')
    expect(positioner?.style.position).toBe('absolute')
    byId('popover-done')!.click()
    await vi.waitFor(() => expect(byId('popover-state')!.textContent).toBe('closed'))
    await vi.waitFor(() => expect(byId('popover-content')).toBeNull())

    // Menu: auto-wired #trigger click (no consumer-bound function ref, unlike
    // Popover) opens a data-driven, floating-ui-positioned list; selecting a
    // row fires @select back across the interop boundary and closes it.
    byId('menu-trigger')!.click()
    await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull())
    const menuPositioner = document.querySelector<HTMLElement>('.ui-menu-positioner')
    expect(menuPositioner?.style.position).toBe('absolute')
    document.querySelector<HTMLElement>('[role="menuitem"]')!.click()
    await vi.waitFor(() => expect(byId('menu-selected')!.textContent).toBe('rename'))
    await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull())
  } finally {
    app.unmount()
  }
})

test('vapor host: Toolbar roves tabindex and moves focus with arrow keys over Vapor-rendered buttons', async () => {
  const { app } = mountApp()
  try {
    const first = byId('toolbar-first')!
    const second = byId('toolbar-second')!
    expect(first.tabIndex).toBe(0)
    expect(second.tabIndex).toBe(-1)

    first.focus()
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    )
    await vi.waitFor(() => expect(document.activeElement).toBe(second))
    expect(second.tabIndex).toBe(0)
    expect(first.tabIndex).toBe(-1)
  } finally {
    app.unmount()
  }
})

test('vapor host: Select opens, virtualizes 1000 rows, scrolls, and selects a row through Vapor', async () => {
  const { app } = mountApp()
  try {
    const trigger = document.querySelector<HTMLElement>('[role="combobox"]')!
    trigger.click()
    await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).not.toBeNull())

    // Virtualized: nowhere near 1000 rows exist in the DOM at once.
    await vi.waitFor(() => {
      const rendered = document.querySelectorAll('[role="option"]').length
      expect(rendered).toBeGreaterThan(0)
      expect(rendered).toBeLessThan(100)
    })

    const body = document.querySelector<HTMLElement>('.ui-select-body')!
    body.scrollTop = body.scrollHeight
    body.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => {
      const indices = [...document.querySelectorAll('[data-virtual-index]')].map((el) =>
        Number(el.getAttribute('data-virtual-index')),
      )
      expect(Math.max(...indices)).toBeGreaterThan(900)
    })

    const option = document.querySelector<HTMLElement>('[role="option"]')!
    option.click()
    await vi.waitFor(() => expect(byId('select-value')!.textContent).not.toBe('(none)'))
    await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).toBeNull())
  } finally {
    app.unmount()
  }
})

test('vapor host: Select invokes a Vapor-authored #item scoped slot per virtualized row, not just the library default', async () => {
  const { app } = mountApp()
  try {
    const trigger = document.querySelector<HTMLElement>('[role="combobox"]')!
    trigger.click()
    await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).not.toBeNull())

    // The rendered rows must carry content from the Vapor-compiled #item
    // template (App.vue's own markup + "(vapor #N)" suffix) — proving
    // SelectListBody, a VDOM internal, actually invokes the Vapor-authored
    // slot per row rather than falling back to its own default row markup.
    await vi.waitFor(() => {
      const labels = [...document.querySelectorAll<HTMLElement>('[data-testid="vapor-item-label"]')]
      expect(labels.length).toBeGreaterThan(0)
      expect(labels[0]!.textContent).toMatch(/^Item \d+ \(vapor #\d+\)$/)
    })

    const body = document.querySelector<HTMLElement>('.ui-select-body')!
    body.scrollTop = body.scrollHeight
    body.dispatchEvent(new Event('scroll'))

    // As virtualization swaps the windowed row set, freshly mounted rows
    // must ALSO carry the Vapor-authored content — not just the first batch
    // rendered at open time. This is the part a stale/no-slot mount would
    // silently pass despite being wrong.
    await vi.waitFor(() => {
      const labels = [...document.querySelectorAll<HTMLElement>('[data-testid="vapor-item-label"]')]
      expect(labels.length).toBeGreaterThan(0)
      const indices = labels.map((el) => Number(el.textContent!.match(/#(\d+)\)$/)![1]))
      expect(Math.max(...indices)).toBeGreaterThan(900)
    })

    const option = document.querySelector<HTMLElement>('[role="option"]')!
    option.click()
    await vi.waitFor(() => expect(byId('select-value')!.textContent).not.toBe('(none)'))
  } finally {
    app.unmount()
  }
})

test('vapor host: Slider exposes an ordered array of template refs (thumbEls) through a Vapor component ref', async () => {
  const { app } = mountApp()
  try {
    // Range mode (two thumbs): the Vapor host's `ref="sliderRef"` must
    // resolve to Slider's component instance THROUGH vaporInteropPlugin,
    // and its defineExpose()'d `thumbEls` array — collected via v-for
    // inside Slider.vue, a VDOM internal — must surface across the
    // boundary in DOM order. OtpInput had a real v-for/useTemplateRef
    // ordering bug in Phase 3 (cellEls); this is the same ref-collection
    // shape, read externally through a cross-boundary component ref for
    // the first time in this suite.
    const thumbs = [...document.querySelectorAll<HTMLElement>('[role="slider"]')]
    expect(thumbs.length).toBe(2)
    expect(thumbs.map((el) => el.dataset.index)).toEqual(['0', '1'])
    await vi.waitFor(() => expect(byId('slider-thumb-order')!.textContent).toBe('0,1'))

    // End-to-end: dragging the resolved thumb element via a real
    // PointerEvent still updates the model and reaches the Vapor host's
    // own output — the exposed ref isn't just readable, it's the live DOM
    // node the rest of the interop chain (pointer capture, keyboard) acts on.
    const track = document.querySelector<HTMLElement>('.ui-slider-track')!
    const rect = track.getBoundingClientRect()
    const pointerId = 1
    thumbs[1]!.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: rect.left + rect.width * 0.8,
        pointerId,
        bubbles: true,
      }),
    )
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: rect.left + rect.width * 0.95,
        pointerId,
        bubbles: true,
      }),
    )
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: rect.left + rect.width * 0.95,
        pointerId,
        bubbles: true,
      }),
    )
    await vi.waitFor(() => {
      const [, high] = byId('slider-value')!.textContent!.split(',').map(Number)
      expect(high).toBeGreaterThan(80)
    })
    // Ref order stays stable through the drag/re-render cycle.
    expect(byId('slider-thumb-order')!.textContent).toBe('0,1')
  } finally {
    app.unmount()
  }
})

test('vapor host: useFileDrop (a headless composable, not a component) attaches directly to a Vapor-rendered element', async () => {
  const { app } = mountApp()
  try {
    const dropzone = byId('vapor-dropzone')!

    // `useFileDrop` is called straight from the Vapor host's own <script
    // vapor> block and wired onto a <div> the Vapor host itself renders —
    // no VDOM component sits in between. `isDragOver`'s reactivity must
    // still drive the Vapor-compiled template's `data-drag-over` binding.
    const dataTransfer = new DataTransfer()
    const file = new File(['hello'], 'vapor-note.txt', { type: 'text/plain' })
    dataTransfer.items.add(file)
    const dragEnter = new Event('dragenter', { bubbles: true, cancelable: true })
    Object.defineProperty(dragEnter, 'dataTransfer', { value: dataTransfer })
    dropzone.dispatchEvent(dragEnter)
    await vi.waitFor(() => expect(dropzone.getAttribute('data-drag-over')).toBe('true'))

    const dragLeave = new Event('dragleave', { bubbles: true, cancelable: true })
    Object.defineProperty(dragLeave, 'dataTransfer', { value: dataTransfer })
    dropzone.dispatchEvent(dragLeave)
    await vi.waitFor(() => expect(dropzone.getAttribute('data-drag-over')).toBeNull())

    // Full drop: the composable's onFiles callback (a plain closure in the
    // Vapor host's own script) must fire and its write into a Vapor-local
    // ref must reach the Vapor-compiled <output>.
    const dragEnter2 = new Event('dragenter', { bubbles: true, cancelable: true })
    Object.defineProperty(dragEnter2, 'dataTransfer', { value: dataTransfer })
    dropzone.dispatchEvent(dragEnter2)
    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer })
    dropzone.dispatchEvent(drop)
    await vi.waitFor(() => expect(byId('dropzone-files')!.textContent).toBe('vapor-note.txt'))
    expect(dropzone.getAttribute('data-drag-over')).toBeNull()
  } finally {
    app.unmount()
  }
})

test('vapor host: Accordion provide/inject + scoped #default slot open/close a panel rendered through Vapor', async () => {
  const { app } = mountApp()
  try {
    expect(byId('accordion-one-content')!.textContent).toContain('Open: false')
    byId('accordion-one-toggle')!.click()
    await vi.waitFor(() => expect(byId('accordion-value')!.textContent).toBe('one'))
    await vi.waitFor(() =>
      expect(byId('accordion-one-content')!.textContent).toContain('Open: true'),
    )

    byId('accordion-one-toggle')!.click()
    await vi.waitFor(() => expect(byId('accordion-value')!.textContent).toBe(''))
    await vi.waitFor(() =>
      expect(byId('accordion-one-content')!.textContent).toContain('Open: false'),
    )
  } finally {
    app.unmount()
  }
})
