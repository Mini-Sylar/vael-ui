// Skeleton `loading`: your content, drawn as bones of itself, then brought in.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import type { Component } from 'vue'
import Skeleton from '../src/components/Skeleton/Skeleton.vue'

const AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="teal"/></svg>'

function card(width = 260) {
  return h(
    'div',
    { class: 'card', style: `inline-size: ${width}px; padding: 12px; border: 1px solid #ddd` },
    [
      h('img', {
        src: AVATAR,
        alt: '',
        style: 'inline-size: 40px; block-size: 40px; border-radius: 50%',
      }),
      h('div', { class: 'name', style: 'font-weight: 600' }, 'Ama Mensah'),
      h(
        'p',
        { class: 'bio', style: 'margin: 0; line-height: 20px' },
        'Leads the platform team, and keeps every release on time for the people who rely on it.',
      ),
      h('button', { type: 'button' }, 'Follow'),
    ],
  )
}

async function mount(props: Record<string, unknown>, width?: number) {
  const loading = shallowRef(true)
  const size = shallowRef(width ?? 260)
  const screen = await render(() =>
    h(Skeleton as Component, { loading: loading.value, ...props }, () => card(size.value)),
  )
  const group = document.querySelector<HTMLElement>('.ui-skeleton-group')!
  const bones = () => [...document.querySelectorAll<HTMLElement>('.ui-skeleton-bone')]
  await vi.waitFor(() => expect(bones().length).toBeGreaterThan(3))
  return { screen, loading, size, group, bones }
}

test('while loading, the content is drawn as bones in its own shapes', async () => {
  const { group, bones } = await mount({})
  const bio = group.querySelector<HTMLElement>('.bio')!
  const range = document.createRange()
  range.selectNodeContents(bio.firstChild!)
  const lines = range.getClientRects().length
  expect(lines).toBeGreaterThan(1)
  // The avatar keeps its round corners.
  const img = group.querySelector('img')!.getBoundingClientRect()
  const top = group.getBoundingClientRect()
  const avatar = bones().find(
    (b) =>
      Math.abs(b.offsetLeft - (img.left - top.left)) < 1 && Math.abs(b.offsetWidth - img.width) < 1,
  )
  expect(avatar?.style.borderRadius).toBe('50%')
  // One bar per line of the bio, inside the bio's box.
  const bio_ = bio.getBoundingClientRect()
  const bars = bones().filter((b) => {
    const r = b.getBoundingClientRect()
    return r.top >= bio_.top - 1 && r.bottom <= bio_.bottom + 1
  })
  expect(bars.length).toBe(lines)
  // Hidden from people and pointers while it loads.
  expect(group.getAttribute('aria-busy')).toBe('true')
  expect(group.querySelector('.ui-skeleton-group-content')!.hasAttribute('inert')).toBe(true)
  expect(getComputedStyle(bio).color).toBe('rgba(0, 0, 0, 0)')
})

test('the bones follow the content when it resizes', async () => {
  const { size, group, bones } = await mount({})
  const before = bones().length
  size.value = 140
  await vi.waitFor(() => expect(bones().length).toBeGreaterThan(before))
  const right = group.querySelector('.card')!.getBoundingClientRect().right
  for (const bone of bones())
    expect(bone.getBoundingClientRect().right).toBeLessThanOrEqual(right + 1)
})

test('loading false brings the content in and clears the bones', async () => {
  const { loading, group, bones } = await mount({})
  loading.value = false
  await vi.waitFor(() => expect(group.hasAttribute('data-loading')).toBe(false))
  expect(group.hasAttribute('aria-busy')).toBe(false)
  expect(group.querySelector('.ui-skeleton-group-content')!.hasAttribute('inert')).toBe(false)
  await vi.waitFor(() => expect(bones()).toHaveLength(0), { timeout: 2000 })
  expect(getComputedStyle(group.querySelector('.bio')!).color).not.toBe('rgba(0, 0, 0, 0)')
})

test('with motion off the content comes in at once', async () => {
  const { loading, bones } = await mount({ motion: false })
  loading.value = false
  await new Promise(requestAnimationFrame)
  expect(bones()).toHaveLength(0)
})

test("a wrapper with no corners of its own (Avatar) gets its frame's", async () => {
  const loading = shallowRef(true)
  await render(() =>
    h(Skeleton as Component, { loading: loading.value }, () =>
      h(
        'span',
        { class: 'wrap', style: 'display: inline-block; inline-size: 40px; block-size: 40px' },
        [
          h('span', {
            style:
              'display: block; inline-size: 40px; block-size: 40px; border-radius: 50%; background: teal',
          }),
          h('span', { style: 'display: none' }, 'x'),
        ],
      ),
    ),
  )
  // The wrapper isn't a block on its own; mark it one, as an Avatar's root is.
  document.querySelector('.wrap')!.setAttribute('data-skeleton-block', '')
  await vi.waitFor(() =>
    expect(document.querySelector<HTMLElement>('.ui-skeleton-bone')?.style.borderRadius).toBe(
      '50%',
    ),
  )
})

test('without loading it is one shape, as before', async () => {
  await render(() => h(Skeleton as Component, { variant: 'circle' }))
  const el = document.querySelector<HTMLElement>('.ui-skeleton--circle')!
  expect(el.getAttribute('aria-hidden')).toBe('true')
  expect(document.querySelector('.ui-skeleton-group')).toBeNull()
})
