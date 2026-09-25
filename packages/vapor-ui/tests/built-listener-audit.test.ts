// Run `pnpm build` before this test — it consumes the built output, not source.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createVaporApp, nextTick } from 'vue'
import ListenerAuditRoot from './fixtures/ListenerAuditRoot.vue'

let host: HTMLElement
let unmount: () => void
const events: string[] = []
const count = (name: string) => events.filter((e) => e === name).length

beforeEach(() => {
  events.length = 0
  host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ListenerAuditRoot, { events: () => events })
  app.mount(host)
  unmount = () => app.unmount()
})
afterEach(async () => {
  await userEvent.keyboard('{Escape}')
  unmount()
  host.remove()
})

const el = (testid: string) => host.querySelector<HTMLElement>(`[data-testid="${testid}"]`)!

test('CascadeSelect trigger keeps the consumer @click and @keydown on real input', async () => {
  const trigger = el('audit-cascade')
  await userEvent.click(trigger)
  await userEvent.click(trigger)
  expect(count('cascade-click')).toBe(2)
  trigger.focus()
  await userEvent.keyboard('x')
  // ArrowDown opens the menu, which is what re-bound the trigger's spread listeners mid-event.
  await userEvent.keyboard('{ArrowDown}')
  await nextTick()
  expect(count('cascade-keydown')).toBe(2)
})

test('Rating keeps the consumer @pointerdown, @pointermove and @keydown on real input', async () => {
  const rating = el('audit-rating')
  const box = rating.getBoundingClientRect()
  await userEvent.hover(rating, { position: { x: 4, y: box.height / 2 } })
  await userEvent.hover(rating, { position: { x: box.width - 4, y: box.height / 2 } })
  expect(count('rating-pointermove')).toBeGreaterThanOrEqual(2)
  await userEvent.click(rating, { position: { x: box.width / 2, y: box.height / 2 } })
  expect(count('rating-pointerdown')).toBe(1)
  rating.focus()
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  expect(count('rating-keydown')).toBe(2)
})

test('Dock keeps the consumer @pointermove on real input', async () => {
  const dock = el('audit-dock')
  const box = dock.getBoundingClientRect()
  await userEvent.hover(dock, { position: { x: 6, y: box.height / 2 } })
  await userEvent.hover(dock, { position: { x: box.width / 2, y: box.height / 2 } })
  await userEvent.hover(dock, { position: { x: box.width - 6, y: box.height / 2 } })
  expect(count('dock-pointermove')).toBeGreaterThanOrEqual(3)
})

test('Tabs, Toolbar and MenuList keep the consumer @keydown on real input', async () => {
  el('audit-tab-one').focus()
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  expect(count('tabs-keydown')).toBe(2)

  el('audit-bold').focus()
  await userEvent.keyboard('{ArrowRight}{ArrowLeft}')
  expect(count('toolbar-keydown')).toBe(2)

  host
    .querySelector<HTMLElement>(
      '[data-testid="audit-menulist"] [tabindex="0"], [data-testid="audit-menulist"] a, [data-testid="audit-menulist"] button',
    )!
    .focus()
  await userEvent.keyboard('{ArrowDown}{ArrowDown}')
  expect(count('menulist-keydown')).toBe(2)
})

test('Switch and Checkbox keep the consumer @click/@keydown while toggling on real input', async () => {
  await userEvent.click(el('audit-switch'))
  await userEvent.click(el('audit-switch'))
  expect(count('switch-click')).toBe(2)
  el('audit-switch').focus()
  await userEvent.keyboard(' ')
  expect(count('switch-keydown')).toBe(1)
  await userEvent.click(el('audit-checkbox'))
  await userEvent.click(el('audit-checkbox'))
  expect(count('checkbox-click')).toBe(2)
})

test('Slider and Knob keep the consumer @pointerdown/@keydown while changing value on real input', async () => {
  const slider = el('audit-slider')
  const sliderBox = slider.getBoundingClientRect()
  await userEvent.click(slider, { position: { x: 4, y: sliderBox.height / 2 } })
  expect(count('slider-pointerdown')).toBe(1)
  const thumb = slider.querySelector<HTMLElement>('[role="slider"]') ?? slider
  thumb.focus()
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  expect(count('slider-keydown')).toBe(2)
  const knob = el('audit-knob')
  ;(knob.querySelector<HTMLElement>('[role="slider"]') ?? knob).focus()
  await userEvent.keyboard('{ArrowUp}{ArrowUp}')
  expect(count('knob-keydown')).toBe(2)
})

test('SelectButton keeps the consumer @click while switching on real input', async () => {
  const buttons = el('audit-selectbutton').querySelectorAll<HTMLElement>('label')
  await userEvent.click(buttons[1]!)
  await userEvent.click(buttons[0]!)
  expect(count('selectbutton-click')).toBe(2)
})
