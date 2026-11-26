// Vapor: closed Accordion panels mount findable (not inert, not aria-hidden), and a match opens one.
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import AccordionFindRoot from './fixtures/AccordionFindRoot.vue'

test('closed panels are findable once mounted, and a match opens one', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(AccordionFindRoot)
  app.mount(host)
  try {
    const panels = [...host.querySelectorAll<HTMLElement>('.ui-accordion-panel')]
    await vi.waitFor(() =>
      panels.forEach((panel) => expect(panel.getAttribute('hidden')).toBe('until-found')),
    )
    for (const panel of panels) {
      expect(panel.inert).toBe(false)
      expect(panel.hasAttribute('aria-hidden')).toBe(false)
      expect(panel.style.visibility).toBe('')
    }
    panels[1]!.removeAttribute('hidden')
    panels[1]!.dispatchEvent(new Event('beforematch'))
    await vi.waitFor(() =>
      expect(host.querySelector('[data-testid="value"]')!.textContent).toBe('b'),
    )
    expect(panels[1]!.dataset.state).toBe('open')
  } finally {
    app.unmount()
    host.remove()
  }
})
