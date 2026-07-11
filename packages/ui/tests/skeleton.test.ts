import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Skeleton from '../src/components/Skeleton.vue'

test('default variant is text, animated, and aria-hidden', async () => {
  const screen = render(Skeleton)
  const el = screen.container.querySelector('.ui-skeleton')!
  expect(el).toHaveClass('ui-skeleton--text')
  expect(el).toHaveClass('ui-skeleton--animated')
  expect(el.getAttribute('aria-hidden')).toBe('true')
})

test('variant prop sets the matching part class', async () => {
  const screen = render(Skeleton, { props: { variant: 'circle' } })
  expect(screen.container.querySelector('.ui-skeleton')).toHaveClass('ui-skeleton--circle')
})

test('animated=false drops the animation class', async () => {
  const screen = render(Skeleton, { props: { animated: false } })
  const el = screen.container.querySelector('.ui-skeleton')!
  expect(el).not.toHaveClass('ui-skeleton--animated')
})

test('slotted content stays in the DOM (sizing the box) but is hidden', async () => {
  const screen = render(Skeleton, { slots: { default: 'Real content' } })
  const content = screen.container.querySelector<HTMLElement>('.ui-skeleton-content')!
  expect(content.textContent).toBe('Real content')
  expect(getComputedStyle(content).visibility).toBe('hidden')
})

test('ui.root merges onto the root class', async () => {
  const screen = render(Skeleton, { props: { ui: { root: 'my-skeleton' } } })
  expect(screen.container.querySelector('.ui-skeleton')).toHaveClass('my-skeleton')
})
