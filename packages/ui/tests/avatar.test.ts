// The fallback/image crossfade is opacity-driven CSS, so visibility
// assertions need the real stylesheet.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import Avatar from '../src/components/Avatar.vue'
import AvatarFixture from './fixtures/AvatarFixture.vue'

// 1x1 transparent PNG — guaranteed to load with zero network dependency.
const VALID_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const BROKEN_SRC = '/definitely-missing-avatar-image-404.png'

const image = () => document.querySelector<HTMLImageElement>('.ui-avatar-image')
const fallback = () => document.querySelector<HTMLElement>('.ui-avatar-fallback')!

test('initials computed from first + last word of name', async () => {
  const screen = render(Avatar, { props: { name: 'Jane Doe' } })
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-avatar-fallback')!)
    .toHaveTextContent('JD')
})

test('single-word name uses just its first letter', async () => {
  const screen = render(Avatar, { props: { name: 'Cher' } })
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-avatar-fallback')!)
    .toHaveTextContent('C')
})

test('no src: fallback shows immediately, no image rendered', async () => {
  render(Avatar, { props: { name: 'Ada Lovelace' } })
  expect(image()).toBeNull()
  expect(getComputedStyle(fallback()).visibility).not.toBe('hidden')
})

test('fallback swaps to the loaded image', async () => {
  render(AvatarFixture, { props: { src: VALID_SRC, name: 'Ada Lovelace' } })
  await vi.waitFor(() => expect(getComputedStyle(image()!).opacity).toBe('1'))
})

test('error keeps the fallback visible permanently for that src', async () => {
  const screen = render(AvatarFixture, { props: { src: BROKEN_SRC, name: 'Grace Hopper' } })
  await vi.waitFor(() => expect(getComputedStyle(image()!).opacity).toBe('0'))
  // Fallback stays the initials, never swaps in a broken image.
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-avatar-fallback')!)
    .toHaveTextContent('GH')
})

test('badge slot renders inside the positioned wrapper with data-placement', async () => {
  const screen = render(Avatar, {
    props: { name: 'Jane Doe', badgePlacement: 'top-start' },
    slots: { badge: '<span class="my-badge">●</span>' },
  })
  const badge = screen.container.querySelector('.ui-avatar-badge')!
  expect(badge.getAttribute('data-placement')).toBe('top-start')
  expect(badge.querySelector('.my-badge')).not.toBeNull()
})

test('size and shape render the matching part classes', async () => {
  const screen = render(Avatar, { props: { name: 'Jane Doe', size: 'lg', shape: 'square' } })
  const el = screen.container.querySelector('.ui-avatar')!
  expect(el).toHaveClass('ui-avatar--lg')
  expect(el).toHaveClass('ui-avatar--square')
})
