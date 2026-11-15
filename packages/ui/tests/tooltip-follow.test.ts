// v-tooltip `follow` and component `content`; Tooltip's #trigger with a component of your own.
import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import TooltipFollowFixture from './fixtures/TooltipFollowFixture.vue'
import Tooltip from '../src/components/Tooltip/Tooltip.vue'
import { __resetTooltipWarmth } from '../src/composables/useTooltip'

beforeEach(() => {
  __resetTooltipWarmth()
  for (const el of document.querySelectorAll('.ui-tooltip-positioner')) el.remove()
})

const centreX = (el: Element) => {
  const box = el.getBoundingClientRect()
  return box.left + box.width / 2
}

test('follow: the panel tracks the pointer along the target, clamped to it', async () => {
  const screen = await render(TooltipFollowFixture)
  const bar = screen.getByTestId('bar').element()
  const panel = () => document.querySelector('[role="tooltip"]')!
  const near = (x: number) => Math.abs(centreX(panel()) - (bar.getBoundingClientRect().left + x))
  await userEvent.hover(bar, { position: { x: 60, y: 12 } })
  await vi.waitFor(() => expect(document.querySelector('[data-testid="rich"]')).not.toBeNull())
  await vi.waitFor(() => expect(near(60)).toBeLessThan(2))
  await userEvent.hover(bar, { position: { x: 250, y: 12 } })
  await vi.waitFor(() => expect(near(250)).toBeLessThan(2))
  // Rich content, from a component and its props.
  expect(document.querySelector('[data-testid="rich"]')!.textContent).toBe('Rich content')
})

test('a component of your own in #trigger attaches', async () => {
  const Own = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('a', { href: '#', 'data-testid': 'own' }, slots.default?.()),
  })
  const screen = await render(() =>
    h(
      'div',
      { style: 'padding: 80px' },
      h(
        Tooltip,
        { openDelay: 0 },
        {
          trigger: ({ setTriggerEl }: { setTriggerEl: (el: unknown) => void }) =>
            h(Own, { ref: setTriggerEl }, () => 'Own'),
          default: () => 'Own tip',
        },
      ),
    ),
  )
  const own = screen.getByTestId('own')
  await own.hover()
  await vi.waitFor(() => expect(own.element().getAttribute('aria-describedby')).toBeTruthy())
})
