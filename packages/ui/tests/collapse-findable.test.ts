// Closed Collapsible and Accordion content can be found with the browser's find, which opens it.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Collapsible from '../src/components/Collapsible/Collapsible.vue'
import Accordion from '../src/components/Accordion/Accordion.vue'
import AccordionItem from '../src/components/AccordionItem/AccordionItem.vue'

// What the browser does on a find match in `hidden="until-found"` content: shows it, then tells it.
// (Find in page itself can't be driven from a test.)
const match = (el: Element) => {
  el.removeAttribute('hidden')
  el.dispatchEvent(new Event('beforematch'))
}

test('a closed Collapsible stays findable, and a match opens it', async () => {
  const open = shallowRef(false)
  render(() =>
    h(
      Collapsible,
      { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) },
      { trigger: () => h('button', 'Troubleshooting'), default: () => 'Reset the breaker twice' },
    ),
  )
  const panel = await vi.waitFor(() =>
    document.querySelector<HTMLElement>('.ui-collapsible-panel')!,
  )
  await vi.waitFor(() => expect(panel.getAttribute('hidden')).toBe('until-found'))
  // Out of the tab order and the accessibility tree while closed, without inert.
  expect(panel.inert).toBe(false)
  match(panel)
  await vi.waitFor(() => expect(open.value).toBe(true))
  expect(panel.hasAttribute('hidden')).toBe(false)
  expect(panel.getBoundingClientRect().height).toBeGreaterThan(0)
})

test('a match opens its Accordion item', async () => {
  const value = shallowRef<string | null>(null)
  render(() =>
    h(
      Accordion as never,
      { value: value.value, 'onUpdate:value': (v: string | null) => (value.value = v) },
      () => [
        h(AccordionItem, { value: 'a', title: 'Billing' }, () => 'Invoices go out monthly'),
        h(AccordionItem, { value: 'b', title: 'Safety' }, () => 'Wear gloves near the panel'),
      ],
    ),
  )
  await vi.waitFor(() => expect(document.querySelectorAll('[hidden="until-found"]').length).toBe(2))
  match(document.querySelectorAll('.ui-accordion-panel')[1]!)
  await vi.waitFor(() => expect(value.value).toBe('b'))
})
