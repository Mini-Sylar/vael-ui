import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, withDirectives } from 'vue'
import { vScrollMask } from '../src/directives/vScrollMask'

afterEach(() => {
  vi.restoreAllMocks()
})

function mountScroller(axis: 'x' | 'y') {
  const Scroller = defineComponent({
    setup: () => () =>
      withDirectives(
        h(
          'div',
          {
            'data-testid': 'scroller',
            style:
              axis === 'x'
                ? 'width: 200px; overflow-x: auto; white-space: nowrap'
                : 'height: 200px; overflow-y: auto',
          },
          axis === 'x'
            ? h('div', { style: 'display: inline-block; width: 1000px; height: 20px' })
            : h('div', { style: 'height: 1000px' }),
        ),
        [[vScrollMask, axis]],
      ),
  })
  return render(Scroller)
}

test('without scroll-driven animation support, the fade follows scroll position via inline variables', async () => {
  vi.spyOn(CSS, 'supports').mockReturnValue(false)
  const screen = await mountScroller('x')
  await nextTick()
  const el = screen.container.querySelector<HTMLElement>('[data-testid="scroller"]')!

  expect(el.classList.contains('scroll-fade-x')).toBe(true)
  expect(el.classList.contains('scroll-fade-manual')).toBe(true)
  expect(el.style.getPropertyValue('--fade-left-end')).toBe('0%')
  expect(el.style.getPropertyValue('--fade-right-start')).toBe('91%')

  el.scrollLeft = el.scrollWidth
  el.dispatchEvent(new Event('scroll'))
  expect(el.style.getPropertyValue('--fade-left-end')).toBe('9%')
  expect(el.style.getPropertyValue('--fade-right-start')).toBe('100%')

  screen.unmount()
  expect(el.style.getPropertyValue('--fade-left-end')).toBe('')
  expect(el.classList.contains('scroll-fade-manual')).toBe(false)
})

test('with scroll-driven animation support, no scroll listener or inline variables are used', async () => {
  const screen = await mountScroller('y')
  await nextTick()
  const el = screen.container.querySelector<HTMLElement>('[data-testid="scroller"]')!
  expect(el.classList.contains('scroll-fade')).toBe(true)
  expect(el.classList.contains('scroll-fade-manual')).toBe(false)
  expect(el.style.getPropertyValue('--fade-top-end')).toBe('')
})
