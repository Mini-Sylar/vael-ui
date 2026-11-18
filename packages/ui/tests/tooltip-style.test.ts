// The panel's box is its ::before, so its colours come from --ui-tooltip-bg and --ui-tooltip-color.
import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import Tooltip from '../src/components/Tooltip/Tooltip.vue'
import TooltipHost from '../src/components/TooltipHost/TooltipHost.vue'
import { vTooltip } from '../src/directives/vTooltip'

test('--ui-tooltip-bg and --ui-tooltip-color on the panel recolour it', async () => {
  const screen = await render(() =>
    h(
      'div',
      { style: 'padding: 80px' },
      h(
        Tooltip,
        {
          openDelay: 0,
          ui: {
            panel: {
              style: {
                '--ui-tooltip-bg': 'rgb(255, 0, 0)',
                '--ui-tooltip-color': 'rgb(0, 0, 255)',
              },
            },
          },
        },
        {
          trigger: ({ setTriggerEl }: { setTriggerEl: (el: unknown) => void }) =>
            h('button', { ref: setTriggerEl, 'data-testid': 'b' }, 'Open'),
          default: () => 'Hello',
        },
      ),
    ),
  )
  await userEvent.hover(screen.getByTestId('b').element())
  await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull())
  const panel = document.querySelector('[role="tooltip"]')!
  expect(getComputedStyle(panel, '::before').backgroundColor).toBe('rgb(255, 0, 0)')
  expect(getComputedStyle(panel).color).toBe('rgb(0, 0, 255)')
})

test('a v-tooltip target takes its own ui over the host, and the others keep the host look', async () => {
  const screen = await render(() =>
    h('div', { style: 'padding: 80px; display: flex; gap: 40px' }, [
      h(TooltipHost, {
        ui: { panel: { style: { '--ui-tooltip-bg': 'rgb(0, 128, 0)' } } },
      }),
      withDirectives(h('button', { 'data-testid': 'plain' }, 'Plain'), [[vTooltip, 'Host look']]),
      withDirectives(h('button', { 'data-testid': 'own' }, 'Own'), [
        [
          vTooltip,
          {
            content: 'Own look',
            ui: { panel: { style: { '--ui-tooltip-bg': 'rgb(255, 0, 0)' } } },
          },
        ],
      ]),
    ]),
  )
  const bg = () =>
    getComputedStyle(document.querySelector('[role="tooltip"]')!, '::before').backgroundColor
  await userEvent.hover(screen.getByTestId('plain').element())
  await vi.waitFor(() => expect(bg()).toBe('rgb(0, 128, 0)'))
  await userEvent.hover(screen.getByTestId('own').element())
  await vi.waitFor(() => expect(bg()).toBe('rgb(255, 0, 0)'))
  await userEvent.hover(screen.getByTestId('plain').element())
  await vi.waitFor(() => expect(bg()).toBe('rgb(0, 128, 0)'))
})
