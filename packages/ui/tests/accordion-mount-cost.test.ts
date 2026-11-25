// What a closed Accordion costs per item once mounted: no re-render, no listener it doesn't need yet.
import '../src/style.css'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { ComponentPublicInstance } from 'vue'
import Accordion from '../src/components/Accordion/Accordion.vue'
import AccordionItem from '../src/components/AccordionItem/AccordionItem.vue'

let updates: string[] = []
const countUpdates = {
  updated(this: ComponentPublicInstance) {
    updates.push((this.$options as { __name?: string }).__name ?? '')
  },
}

let listeners: string[] = []
const addEventListener = EventTarget.prototype.addEventListener
beforeEach(() => {
  updates = []
  listeners = []
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest) {
    if (this instanceof HTMLElement && this.matches('.ui-accordion-panel')) listeners.push(type)
    return addEventListener.call(this, type, ...(rest as [EventListener]))
  } as typeof addEventListener
})
afterEach(() => {
  EventTarget.prototype.addEventListener = addEventListener
})

const settled = () => new Promise((resolve) => setTimeout(resolve, 50))

const accordion = (motion?: false) => () =>
  h(Accordion as never, { motion }, () => [
    h(AccordionItem, { value: 'a', title: 'Billing' }, () => 'Invoices go out monthly'),
    h(AccordionItem, { value: 'b', title: 'Safety' }, () => 'Wear gloves near the panel'),
    h(AccordionItem, { value: 'c', title: 'Hours' }, () => 'Open nine to five'),
  ])

for (const motion of [undefined, false] as const) {
  test(`closed items don't re-render once mounted (motion ${motion ?? 'on'})`, async () => {
    render(accordion(motion), { global: { mixins: [countUpdates] } })
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[hidden="until-found"]').length).toBe(3),
    )
    await settled()
    expect(updates).toEqual([])
    // Rendered findable from the start: not inert, not hidden from assistive tech.
    for (const panel of document.querySelectorAll<HTMLElement>('.ui-accordion-panel')) {
      expect(panel.inert).toBe(false)
      expect(panel.hasAttribute('aria-hidden')).toBe(false)
      expect(panel.style.visibility).toBe('')
    }
  })
}

test('a closed panel listens for find only; transitionend waits for its first animated toggle', async () => {
  render(accordion())
  await vi.waitFor(() => expect(document.querySelectorAll('[hidden="until-found"]').length).toBe(3))
  await settled()
  expect(listeners.sort()).toEqual(['beforematch', 'beforematch', 'beforematch'])
  const trigger = document.querySelector<HTMLButtonElement>('.ui-accordion-trigger')!
  trigger.click()
  await vi.waitFor(() => expect(listeners).toContain('transitionend'))
  const panel = document.querySelector<HTMLElement>('.ui-accordion-panel')!
  await vi.waitFor(() => expect(panel.dataset.state).toBe('open'))
  trigger.click()
  await vi.waitFor(() => expect(panel.dataset.state).toBe('closed'))
  // Added once, not per toggle.
  expect(listeners.filter((type) => type === 'transitionend')).toHaveLength(1)
})

test('hydrated, it starts as the server rendered it, then turns findable', async () => {
  const html = await renderToString(createSSRApp(accordion()))
  expect(html).toContain('aria-hidden="true"')
  expect(html).toContain('visibility:hidden')
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  const warn = vi.spyOn(console, 'warn')
  const app = createSSRApp(accordion())
  app.mount(host)
  const panels = [...host.querySelectorAll<HTMLElement>('.ui-accordion-panel')]
  expect(panels[0]!.inert).toBe(true)
  await vi.waitFor(() =>
    panels.forEach((panel) => expect(panel.getAttribute('hidden')).toBe('until-found')),
  )
  for (const panel of panels) {
    expect(panel.inert).toBe(false)
    expect(panel.hasAttribute('aria-hidden')).toBe(false)
    expect(panel.style.visibility).toBe('')
  }
  expect(warn.mock.calls.flat().join(' ')).not.toMatch(/mismatch/i)
  warn.mockRestore()
  app.unmount()
  host.remove()
})
