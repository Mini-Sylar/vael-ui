import '../src/style.css'
import { h } from 'vue'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ScrollArea from '../src/components/ScrollArea/ScrollArea.vue'
import Stepper from '../src/components/Stepper/Stepper.vue'
import Timeline from '../src/components/Timeline/Timeline.vue'
import PullToRefresh from '../src/components/PullToRefresh/PullToRefresh.vue'

// A scrolling region takes a tab stop while it overflows with nothing tabbable inside.
const lines = (button: boolean) =>
  Array.from({ length: 30 }, (_, i) =>
    button && i === 0 ? h('button', { type: 'button' }, 'Act') : h('p', `Line ${i}`),
  )

test.each([
  [
    'ScrollArea',
    '.ui-scroll-area-viewport',
    (button: boolean) => h(ScrollArea, { style: 'block-size: 80px' }, () => lines(button)),
  ],
  [
    'PullToRefresh',
    '.ui-pull-to-refresh-root',
    (button: boolean) =>
      h(PullToRefresh as never, { style: 'block-size: 80px' }, () => lines(button)),
  ],
  [
    'Stepper',
    '.ui-stepper',
    (button: boolean) =>
      h('div', { style: 'inline-size: 120px' }, [
        h(Stepper as never, {
          modelValue: 0,
          clickable: button,
          items: Array.from({ length: 6 }, (_, i) => ({ label: `Step number ${i}` })),
        }),
      ]),
  ],
  [
    'Timeline',
    '.ui-timeline',
    (button: boolean) =>
      h('div', { style: 'inline-size: 120px' }, [
        h(
          Timeline as never,
          {
            orientation: 'horizontal',
            items: Array.from({ length: 8 }, (_, i) => `Event number ${i}`),
          },
          button ? { item: () => h('button', { type: 'button' }, 'Open') } : undefined,
        ),
      ]),
  ],
])(
  '%s takes a tab stop while it scrolls with nothing focusable inside',
  async (_, selector, view) => {
    const plain = await render({ render: () => view(false) })
    const region = plain.container.querySelector<HTMLElement>(selector)!
    await vi.waitFor(() => expect(region.getAttribute('tabindex')).toBe('0'))
    plain.unmount()

    const withButton = await render({ render: () => view(true) })
    await new Promise((r) => setTimeout(r, 50))
    expect(withButton.container.querySelector(selector)!.hasAttribute('tabindex')).toBe(false)
    withButton.unmount()
  },
)
