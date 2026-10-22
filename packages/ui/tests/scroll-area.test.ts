import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ScrollArea from '../src/components/ScrollArea/ScrollArea.vue'

test('orientation sets the viewport modifier class, vertical by default', async () => {
  const screen = await render(ScrollArea, { slots: { default: '<p>content</p>' } })
  const viewport = screen.container.querySelector('.ui-scroll-area-viewport')!
  expect(viewport).toHaveClass('ui-scroll-area-viewport--vertical')
  await screen.rerender({ orientation: 'horizontal' })
  expect(viewport).toHaveClass('ui-scroll-area-viewport--horizontal')
})

test('scroll-fade class is applied when content overflows', async () => {
  const screen = await render(ScrollArea, {
    props: { ui: { viewport: { style: 'block-size: 40px' } } },
    slots: { default: '<div style="block-size: 400px">tall content</div>' },
  })
  const viewport = screen.container.querySelector<HTMLElement>('.ui-scroll-area-viewport')!
  await expect.element(viewport).toHaveClass('scroll-fade')
})

test('scrollFade=false never applies the fade class', async () => {
  const screen = await render(ScrollArea, {
    props: { scrollFade: false, ui: { viewport: { style: 'block-size: 40px' } } },
    slots: { default: '<div style="block-size: 400px">tall content</div>' },
  })
  const viewport = screen.container.querySelector<HTMLElement>('.ui-scroll-area-viewport')!
  expect(viewport.classList.contains('scroll-fade')).toBe(false)
})

// Regression test: the viewport used `block-size: 100%`, which only resolves against an ancestor
// with an explicitly specified height — a bare `max-height` on the root (the intuitive way to cap
// the whole component) never counted, so the viewport grew to fit all content regardless.
test('max-height on the root actually caps the rendered viewport', async () => {
  const screen = await render(ScrollArea, {
    props: { ui: { root: { style: 'max-height: 100px' } } },
    slots: { default: '<div style="block-size: 400px">tall content</div>' },
  })
  const viewport = screen.container.querySelector<HTMLElement>('.ui-scroll-area-viewport')!
  expect(viewport.getBoundingClientRect().height).toBeLessThanOrEqual(100)
})

test('autoHide hides the thumb via standard scrollbar-color, revealing it on hover and while scrolling', async () => {
  const screen = await render(ScrollArea, {
    props: { autoHide: true, ui: { root: { style: 'max-height: 80px' } } },
    slots: { default: '<div style="height: 400px">tall</div>' },
  })
  const viewport = screen.container.querySelector<HTMLElement>('.ui-scroll-area-viewport')!
  const thumbColor = () => getComputedStyle(viewport).scrollbarColor.split(/ (?![^(]*\))/)[0]
  // An earlier test can leave the pointer resting over this spot; park it elsewhere.
  const parking = document.createElement('div')
  parking.style.cssText =
    'position: fixed; inset-block-end: 0; inset-inline-end: 0; inline-size: 4px; block-size: 4px'
  document.body.append(parking)
  await userEvent.hover(parking)
  await vi.waitFor(() => expect(thumbColor()).toBe('rgba(0, 0, 0, 0)'))

  viewport.scrollTop = 60
  await vi.waitFor(() => expect(viewport.hasAttribute('data-scrolling')).toBe(true))
  await vi.waitFor(() => expect(thumbColor()).not.toBe('rgba(0, 0, 0, 0)'))
  await vi.waitFor(() => expect(viewport.hasAttribute('data-scrolling')).toBe(false), {
    timeout: 2000,
  })
  await vi.waitFor(() => expect(thumbColor()).toBe('rgba(0, 0, 0, 0)'))

  await userEvent.hover(viewport)
  await vi.waitFor(() => expect(thumbColor()).not.toBe('rgba(0, 0, 0, 0)'))
  parking.remove()
})

test('orientation both fades on both axes at once, not only the last one', async () => {
  const { h } = await import('vue')
  const { default: ScrollArea } = await import('../src/components/ScrollArea/ScrollArea.vue')
  await render(() =>
    h(ScrollArea as never, { orientation: 'both', style: 'width: 120px; height: 120px' }, () =>
      h('div', { style: 'width: 400px; height: 400px' }),
    ),
  )
  const faded = document.querySelector<HTMLElement>('.scroll-fade.scroll-fade-x')!
  const style = getComputedStyle(faded)
  // Two fades, plus the two solid strips that keep the scrollbars out of them.
  expect(style.maskImage.match(/linear-gradient/g)).toHaveLength(4)
  expect(style.maskComposite).toContain('intersect')
})
