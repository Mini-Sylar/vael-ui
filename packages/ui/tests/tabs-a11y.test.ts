import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, useTemplateRef, defineComponent } from 'vue'
import Tabs from '../src/components/Tabs/Tabs.vue'

const items = ['one', 'two', 'three']

async function renderTabs(activation: 'automatic' | 'manual' = 'automatic') {
  const active = shallowRef('one')
  const Host = defineComponent({
    setup() {
      const tabs = useTemplateRef<any>('tabs')
      return () => [
        h('button', { 'data-testid': 'before' }, 'before'),
        h(
          Tabs as any,
          {
            ref: 'tabs',
            items,
            activation,
            idBase: 't',
            active: active.value,
            'onUpdate:active': (next: string) => (active.value = next),
          },
          {
            default: ({ items: list, itemProps }: any) =>
              list.map((item: string) => h('button', itemProps(item), item)),
          },
        ),
        ...items.map((item) =>
          h('div', { key: item, ...tabs.value?.panelProps(item), 'data-panel': item }, item),
        ),
      ]
    },
  })
  const screen = await render(Host)
  return { screen, active }
}
const tab = (name: string) => document.getElementById(`t-tab-${name}`)!

test('only the selected panel is a tab stop', async () => {
  const { active } = await renderTabs()
  const panel = (name: string) => document.querySelector(`[data-panel="${name}"]`)!
  await vi.waitFor(() => expect(panel('one').getAttribute('tabindex')).toBe('0'))
  expect(panel('two').hasAttribute('tabindex')).toBe(false)
  active.value = 'two'
  await vi.waitFor(() => expect(panel('two').getAttribute('tabindex')).toBe('0'))
  expect(panel('one').hasAttribute('tabindex')).toBe(false)
})

test('manual activation: tabbing back into the list lands on the selected tab', async () => {
  await renderTabs('manual')
  tab('one').focus()
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  await vi.waitFor(() => expect(document.activeElement).toBe(tab('three')))
  // Leave without selecting, then come back.
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
  await vi.waitFor(() => expect(tab('one').tabIndex).toBe(0))
  await userEvent.keyboard('{Tab}')
  expect(document.activeElement).toBe(tab('one'))
})

test('manual activation: a programmatic selection moves the tab stop', async () => {
  const { active } = await renderTabs('manual')
  active.value = 'three'
  await vi.waitFor(() => expect(tab('three').tabIndex).toBe(0))
  expect(tab('one').tabIndex).toBe(-1)
})
