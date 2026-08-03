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
