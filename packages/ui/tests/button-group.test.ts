import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import ButtonGroupFixture from './fixtures/ButtonGroupFixture.vue'

test('has an accessible group role and name', async () => {
  const screen = render(ButtonGroupFixture)
  try {
    await expect.element(page.getByRole('group', { name: 'Actions' })).toBeVisible()
  } finally {
    screen.unmount()
  }
})

test('every button keeps its own native tab order — no roving tabindex', async () => {
  const screen = render(ButtonGroupFixture)
  try {
    const buttons = Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-button'))
    expect(buttons.map((b) => b.tabIndex)).toEqual([0, 0, 0])
  } finally {
    screen.unmount()
  }
})

test('horizontal: only the first/last button keep outer-corner radius, shared inner edges are square', async () => {
  const screen = render(ButtonGroupFixture)
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
    screen.unmount()
  }
})

test('vertical orientation applies the vertical modifier class', async () => {
  const screen = render(ButtonGroupFixture, { props: { orientation: 'vertical' } })
  try {
    const group = screen.container.querySelector('[role="group"]')
    expect(group?.classList.contains('ui-button-group--vertical')).toBe(true)
  } finally {
    screen.unmount()
  }
})

test('a disabled button in the group is still disabled', async () => {
  const screen = render(ButtonGroupFixture)
  try {
    const snooze = screen.container.querySelector<HTMLButtonElement>('.ui-button[disabled]')
    expect(snooze).not.toBeNull()
    expect(snooze?.textContent?.trim()).toBe('Snooze')
  } finally {
    screen.unmount()
  }
})
