import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Badge from '../src/components/Badge/Badge.vue'

const content = (root: HTMLElement) => root.querySelector<HTMLElement>('.ui-badge-content')

test.each([
  [{ count: 3 }, '3'],
  [{ count: 150, max: 99 }, '99+'],
  [{ count: 12, max: 9 }, '9+'],
])('%o renders "%s"', async (props, text) => {
  const screen = await render(Badge, { props })
  await expect.element(content(screen.container)!).toHaveTextContent(text)
})

test('dot and variant render as root modifier classes, with no content span', async () => {
  const screen = await render(Badge, { props: { dot: true, count: 5, variant: 'success' } })
  const el = screen.container.querySelector<HTMLElement>('.ui-badge')!
  expect(el).toHaveClass('ui-badge--dot', 'ui-badge--success')
  expect(el.querySelector('.ui-badge-content')).toBeNull()
})

test('default slot content wins over count', async () => {
  const screen = await render(Badge, { props: { count: 3 }, slots: { default: 'New' } })
  await expect.element(content(screen.container)!).toHaveTextContent('New')
})

test('count change replaces the content node (keyed re-render replays the pop)', async () => {
  const screen = await render(Badge, { props: { count: 1 } })
  const before = content(screen.container)
  await screen.rerender({ count: 2 })
  const after = content(screen.container)
  expect(after).not.toBe(before)
  await expect.element(after!).toHaveTextContent('2')
})

test('animated=false never applies the pop class, on mount or on change', async () => {
  const screen = await render(Badge, { props: { count: 1, animated: false } })
  expect(content(screen.container)).not.toHaveClass('ui-badge-content--animated')
  await screen.rerender({ count: 2, animated: false })
  expect(content(screen.container)).not.toHaveClass('ui-badge-content--animated')
})

test('animated (default) applies the pop class, but suppresses its duration on the very first paint', async () => {
  const screen = await render(Badge, { props: { count: 1 } })
  const first = content(screen.container)!
  expect(first).toHaveClass('ui-badge-content--animated')
  // Initial mount: nothing changed yet, so the pop must not visibly play.
  expect(first.style.animationDuration).toBe('0s')

  await screen.rerender({ count: 2 })
  const second = content(screen.container)!
  expect(second).not.toBe(first)
  // A genuine change: the pop is allowed to play at its real duration.
  expect(second.style.animationDuration).toBe('')
})
