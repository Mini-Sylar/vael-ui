import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import ButtonGroupFixture from './fixtures/ButtonGroupFixture.vue'
import ButtonGroup from '../src/components/ButtonGroup/ButtonGroup.vue'
import Button from '../src/components/Button/Button.vue'

test('has an accessible group role and name', async () => {
  const screen = await render(ButtonGroupFixture)
  try {
    await expect.element(page.getByRole('group', { name: 'Actions' })).toBeVisible()
  } finally {
    await screen.unmount()
  }
})

test('every button keeps its own native tab order — no roving tabindex', async () => {
  const screen = await render(ButtonGroupFixture)
  try {
    const buttons = Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-button'))
    expect(buttons.map((b) => b.tabIndex)).toEqual([0, 0, 0])
  } finally {
    await screen.unmount()
  }
})

test('horizontal: only the first/last button keep outer-corner radius, shared inner edges are square', async () => {
  const screen = await render(ButtonGroupFixture)
  try {
    const [first, middle, last] = Array.from(
      screen.container.querySelectorAll<HTMLButtonElement>('.ui-button'),
    )
    const firstStyle = getComputedStyle(first)
    const middleStyle = getComputedStyle(middle)
    const lastStyle = getComputedStyle(last)

    expect(firstStyle.borderStartStartRadius).not.toBe('0px')
    expect(firstStyle.borderEndStartRadius).not.toBe('0px')
    expect(firstStyle.borderStartEndRadius).toBe('0px')
    expect(firstStyle.borderEndEndRadius).toBe('0px')

    expect(middleStyle.borderStartStartRadius).toBe('0px')
    expect(middleStyle.borderStartEndRadius).toBe('0px')
    expect(middleStyle.borderEndStartRadius).toBe('0px')
    expect(middleStyle.borderEndEndRadius).toBe('0px')

    expect(lastStyle.borderStartEndRadius).not.toBe('0px')
    expect(lastStyle.borderEndEndRadius).not.toBe('0px')
    expect(lastStyle.borderStartStartRadius).toBe('0px')
    expect(lastStyle.borderEndStartRadius).toBe('0px')
  } finally {
    await screen.unmount()
  }
})

test('vertical orientation applies the vertical modifier class', async () => {
  const screen = await render(ButtonGroupFixture, { props: { orientation: 'vertical' } })
  try {
    const group = screen.container.querySelector('[role="group"]')
    expect(group?.classList.contains('ui-button-group--vertical')).toBe(true)
  } finally {
    await screen.unmount()
  }
})

test('a disabled button in the group is still disabled', async () => {
  const screen = await render(ButtonGroupFixture)
  try {
    const snooze = screen.container.querySelector<HTMLButtonElement>('.ui-button[disabled]')
    expect(snooze).not.toBeNull()
    expect(snooze?.textContent?.trim()).toBe('Snooze')
  } finally {
    await screen.unmount()
  }
})

test('small segments keep 24px uncovered by the 1px overlap, even on a 14px root', async () => {
  const root = document.documentElement
  const previous = root.style.fontSize
  root.style.fontSize = '14px'
  try {
    const screen = await render(() =>
      h('div', { style: 'display: grid; gap: 2rem; justify-items: start' }, [
        h(ButtonGroup, null, () => [
          h(Button, { size: 'sm', icon: true, 'aria-label': 'Out' }, () => '-'),
          h(Button, { size: 'sm', icon: true, 'aria-label': 'In' }, () => '+'),
        ]),
        h(ButtonGroup, { orientation: 'vertical' }, () => [
          h(Button, { size: 'sm' }, () => 'Up'),
          h(Button, { size: 'sm' }, () => 'Down'),
        ]),
      ]),
    )
    const [first, second, top, bottom] = screen.container.querySelectorAll('.ui-button')
    const a = first!.getBoundingClientRect()
    const b = second!.getBoundingClientRect()
    expect(b.left - a.left).toBeGreaterThanOrEqual(24)
    const c = top!.getBoundingClientRect()
    const d = bottom!.getBoundingClientRect()
    expect(d.top - c.top).toBeGreaterThanOrEqual(24)
  } finally {
    root.style.fontSize = previous
  }
})
