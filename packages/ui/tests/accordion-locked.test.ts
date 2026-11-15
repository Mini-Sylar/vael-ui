import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Accordion from '../src/components/Accordion/Accordion.vue'
import AccordionItem from '../src/components/AccordionItem/AccordionItem.vue'

function renderAccordion(props: Record<string, unknown>, initial: unknown) {
  const value = shallowRef(initial)
  return render(() =>
    h(
      Accordion as any,
      {
        ...props,
        value: value.value,
        'onUpdate:value': (next: unknown) => (value.value = next),
      },
      () => [
        h(AccordionItem, { value: 'a', title: 'First' }, () => 'A'),
        h(AccordionItem, { value: 'b', title: 'Second' }, () => 'B'),
      ],
    ),
  )
}
const trigger = (name: string) => page.getByRole('button', { name })

test('collapsible=false marks the open trigger aria-disabled, and it stays focusable', async () => {
  await renderAccordion({ collapsible: false }, 'a')
  await expect.element(trigger('First')).toHaveAttribute('aria-disabled', 'true')
  await expect.element(trigger('Second')).not.toHaveAttribute('aria-disabled')
  ;(trigger('First').element() as HTMLElement).focus()
  expect(document.activeElement).toBe(trigger('First').element())

  await trigger('Second').click()
  await expect.element(trigger('Second')).toHaveAttribute('aria-disabled', 'true')
  await expect.element(trigger('First')).not.toHaveAttribute('aria-disabled')
})

test('multiple: only the last open item is locked', async () => {
  await renderAccordion({ collapsible: false, multiple: true }, ['a', 'b'])
  await expect.element(trigger('First')).not.toHaveAttribute('aria-disabled')
  await trigger('First').click()
  await expect.element(trigger('Second')).toHaveAttribute('aria-disabled', 'true')
})

test('a collapsible accordion never sets aria-disabled', async () => {
  await renderAccordion({}, 'a')
  await expect.element(trigger('First')).not.toHaveAttribute('aria-disabled')
})
