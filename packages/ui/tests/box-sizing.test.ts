// The test page has no box-sizing reset, so these sizes come from vael-ui alone.
import '../src/style.css'
import { h } from 'vue'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import Input from '../src/components/Input/Input.vue'
import Loader from '../src/components/Loader/Loader.vue'
import Textarea from '../src/components/Textarea/Textarea.vue'
import TreeFixture from './fixtures/TreeFixture.vue'
import TimelineFixture from './fixtures/TimelineFixture.vue'

const rect = (el: Element) => el.getBoundingClientRect()

test('a width you give an Input includes its border and padding', async () => {
  const screen = await render(() => h(Input as never, { style: 'max-inline-size: 200px' }))
  expect(rect(screen.container.querySelector('.ui-input')!).width).toBeLessThanOrEqual(200.5)
})

test('Loader is 1em across, border included', async () => {
  const screen = await render(() => h('div', { style: 'font-size: 14px' }, [h(Loader as never)]))
  expect(getComputedStyle(screen.container.querySelector('.ui-loader')!).width).toBe('14px')
  expect(getComputedStyle(screen.container.querySelector('.ui-loader')!).boxSizing).toBe(
    'border-box',
  )
})

test('an auto-grow Textarea stays inside its frame border', async () => {
  const screen = await render(() =>
    h('div', { style: 'width: 240px' }, [h(Textarea as never, { autoGrow: true })]),
  )
  const frame = rect(screen.container.querySelector('.ui-textarea')!)
  const el = rect(screen.container.querySelector('.ui-textarea-el')!)
  expect(el.right).toBeLessThanOrEqual(frame.right - 0.5)
})

test('Tree rows fit the tree, so it never scrolls sideways', async () => {
  const screen = await render(TreeFixture)
  await vi.waitFor(() => expect(screen.container.querySelector('.ui-tree-row')).toBeTruthy())
  for (const row of screen.container.querySelectorAll('.ui-tree-row')) {
    expect(rect(row).right).toBeLessThanOrEqual(rect(row.parentElement!).right + 0.5)
  }
})

test('Timeline dots are their designed size, border included', async () => {
  const screen = await render(TimelineFixture, {})
  const dot = screen.container.querySelector('.ui-timeline-dot')!
  expect(rect(dot).width).toBeCloseTo(12, 0)
})

test('the rule stays off elements that are not vael-ui', async () => {
  const screen = await render(() => h('div', { class: 'my-ui-card', 'data-testid': 'own' }))
  expect(getComputedStyle(screen.getByTestId('own').element()).boxSizing).toBe('content-box')
})
