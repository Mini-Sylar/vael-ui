import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Button from '../src/components/Button/Button.vue'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function holdButton(onClick: () => void, hold: boolean | number = 150) {
  const screen = await render({ render: () => h(Button, { hold, onClick }, () => 'Delete') })
  return screen.container.querySelector<HTMLButtonElement>('button')!
}
function press(button: HTMLElement) {
  button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
}
function release(button: HTMLElement) {
  button.dispatchEvent(new PointerEvent('pointerup', { button: 0, bubbles: true }))
  button.click()
}

test('a quick click does nothing', async () => {
  const onClick = vi.fn()
  const button = await holdButton(onClick)
  press(button)
  await wait(40)
  release(button)
  await wait(200)
  expect(onClick).not.toHaveBeenCalled()
  expect(button.dataset.hold).toBe('')
})

test('holding fires click once when the fill completes, and letting go adds nothing', async () => {
  const onClick = vi.fn()
  const button = await holdButton(onClick)
  press(button)
  await vi.waitFor(() => expect(button.dataset.hold).toBe('holding'))
  await vi.waitFor(() => expect(onClick).toHaveBeenCalledTimes(1))
  expect(button.dataset.hold).toBe('done')
  release(button)
  await wait(20)
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(button.dataset.hold).toBe('')
})

test('Space holds from the keyboard; letting go early cancels', async () => {
  const onClick = vi.fn()
  const button = await holdButton(onClick)
  button.focus()
  await userEvent.keyboard('{Space>}')
  await wait(40)
  await userEvent.keyboard('{/Space}')
  await wait(200)
  expect(onClick).not.toHaveBeenCalled()
  await userEvent.keyboard('{Space>}')
  await vi.waitFor(() => expect(onClick).toHaveBeenCalledTimes(1))
  await userEvent.keyboard('{/Space}')
})

test('the fill takes the hold duration, true means 1200ms, and screen readers hear the hint', async () => {
  const button = await holdButton(() => {}, true)
  const fill = button.querySelector<HTMLElement>('.ui-button-hold')!
  expect(fill.style.getPropertyValue('--ui-hold-duration')).toBe('1200ms')
  const hint = document.getElementById(button.getAttribute('aria-describedby')!)!
  expect(hint.textContent).toBe('Press and hold to confirm')
  expect(hint.hidden).toBe(true)
  expect(button.contains(hint)).toBe(true)
})

test('without hold, a click acts at once and nothing extra renders', async () => {
  const onClick = vi.fn()
  const screen = await render({ render: () => h(Button, { onClick }, () => 'Save') })
  const button = screen.container.querySelector('button')!
  button.click()
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(button.querySelector('.ui-button-hold')).toBeNull()
  expect(button.hasAttribute('data-hold')).toBe(false)
})

test('holdProgress rises to 1 for your own stages, and resets when you let go', async () => {
  const seen: number[] = []
  const screen = await render({
    render: () =>
      h(
        Button,
        { hold: 300 },
        {
          default: ({ holdProgress }: { holdProgress: number }) => {
            seen.push(holdProgress)
            return holdProgress >= 1 ? 'Done' : holdProgress > 0.5 ? 'Almost' : 'Hold'
          },
        },
      ),
  })
  const button = screen.container.querySelector<HTMLButtonElement>('button')!
  const label = button.querySelector('.ui-button-label')!
  press(button)
  await vi.waitFor(() => expect(label.textContent).toBe('Almost'))
  expect(parseFloat(button.style.getPropertyValue('--ui-hold-progress'))).toBeGreaterThan(0.5)
  await vi.waitFor(() => expect(label.textContent).toBe('Done'))
  release(button)
  await vi.waitFor(() => expect(label.textContent).toBe('Hold'))
  expect(button.style.getPropertyValue('--ui-hold-progress')).toBe('0')
  expect(seen.some((value) => value > 0 && value < 0.5)).toBe(true)
})

test('the hold hint joins your own aria-describedby and stays out of the accessible name', async () => {
  const screen = await render({
    render: () => [
      h('p', { id: 'mine' }, 'Deletes every file'),
      h(Button, { hold: true, 'aria-describedby': 'mine' }, () => 'Delete'),
    ],
  })
  const button = screen.getByRole('button', { name: 'Delete', exact: true })
  await expect.element(button).toBeInTheDocument()
  await expect
    .element(button)
    .toHaveAccessibleDescription('Deletes every file Press and hold to confirm')
})
