import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import ScrollArea from '../src/components/ScrollArea/ScrollArea.vue'

test('vertical (default): viewport overflow classes match orientation', async () => {
  const screen = render(ScrollArea, { slots: { default: '<p>content</p>' } })
  const viewport = screen.container.querySelector('.ui-scroll-area-viewport')!
  expect(viewport).toHaveClass('ui-scroll-area-viewport--vertical')
})

test('orientation prop switches the viewport modifier class', async () => {
  const screen = render(ScrollArea, {
    props: { orientation: 'horizontal' },
    slots: { default: '<p>content</p>' },
  })
  expect(screen.container.querySelector('.ui-scroll-area-viewport')).toHaveClass(
    'ui-scroll-area-viewport--horizontal',
  )
})

test('scroll-fade class is applied when content overflows', async () => {
  const screen = render(ScrollArea, {
    props: { ui: { viewport: { style: 'block-size: 40px' } } },
    slots: { default: '<div style="block-size: 400px">tall content</div>' },
  })
  const viewport = screen.container.querySelector<HTMLElement>('.ui-scroll-area-viewport')!
  await expect.element(viewport).toHaveClass('scroll-fade')
})

test('scrollFade=false never applies the fade class', async () => {
  const screen = render(ScrollArea, {
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
  const screen = render(ScrollArea, {
    props: { ui: { root: { style: 'max-height: 100px' } } },
    slots: { default: '<div style="block-size: 400px">tall content</div>' },
  })
  const viewport = screen.container.querySelector<HTMLElement>('.ui-scroll-area-viewport')!
  expect(viewport.getBoundingClientRect().height).toBeLessThanOrEqual(100)
})
