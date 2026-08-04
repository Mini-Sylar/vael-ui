import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Badge from '../src/components/Badge/Badge.vue'

const content = (root: HTMLElement) => root.querySelector<HTMLElement>('.ui-badge-content')

test('count renders as text', async () => {
  const screen = render(Badge, { props: { count: 3 } })
  await expect.element(content(screen.container)!).toHaveTextContent('3')
})

test('count above max clamps to "max+"', async () => {
  const screen = render(Badge, { props: { count: 150, max: 99 } })
  await expect.element(content(screen.container)!).toHaveTextContent('99+')
})

test('custom max clamps accordingly', async () => {
  const screen = render(Badge, { props: { count: 12, max: 9 } })
  await expect.element(content(screen.container)!).toHaveTextContent('9+')
})

test('dot renders empty with the dot class, no content span', async () => {
  const screen = render(Badge, { props: { dot: true, count: 5 } })
  const el = screen.container.querySelector<HTMLElement>('.ui-badge')!
  expect(el).toHaveClass('ui-badge--dot')
  expect(el.querySelector('.ui-badge-content')).toBeNull()
})

test('variant classes render', async () => {
  const screen = render(Badge, { props: { variant: 'success' } })
  expect(screen.container.querySelector('.ui-badge')).toHaveClass('ui-badge--success')
})

test('default slot content wins over count', async () => {
  const screen = render(Badge, { props: { count: 3 }, slots: { default: 'New' } })
  await expect.element(content(screen.container)!).toHaveTextContent('New')
})

test('count change replaces the content node (keyed re-render replays the pop)', async () => {
  const screen = render(Badge, { props: { count: 1 } })
  const before = content(screen.container)
  await screen.rerender({ count: 2 })
  const after = content(screen.container)
  expect(after).not.toBe(before)
  await expect.element(after!).toHaveTextContent('2')
})

test('animated=false never applies the pop class, on mount or on change', async () => {
  const screen = render(Badge, { props: { count: 1, animated: false } })
  expect(content(screen.container)).not.toHaveClass('ui-badge-content--animated')
  await screen.rerender({ count: 2, animated: false })
  expect(content(screen.container)).not.toHaveClass('ui-badge-content--animated')
})

test('animated (default) applies the pop class, but suppresses its duration on the very first paint', async () => {
  const screen = render(Badge, { props: { count: 1 } })
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
