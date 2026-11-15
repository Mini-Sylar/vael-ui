// v-scroll-mask right to left: the horizontal fade runs from the inline start, on the right.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vScrollMask } from '../src/directives/vScrollMask'

afterEach(() => vi.restoreAllMocks())

const mount = (axis: 'x' | 'both') =>
  render(() =>
    withDirectives(
      h(
        'div',
        { dir: 'rtl', class: 'box', style: 'width: 200px; height: 100px; overflow: auto' },
        h('div', { style: 'width: 1000px; height: 1000px' }),
      ),
      [[vScrollMask, axis]],
    ),
  )

test.each(['x', 'both'] as const)('axis %s: the gradient runs to the left', async (axis) => {
  const screen = await mount(axis)
  const box = screen.container.querySelector<HTMLElement>('.box')!
  await vi.waitFor(() => expect(box.classList.contains('scroll-fade-x')).toBe(true))
  expect(getComputedStyle(box).maskImage).toContain('to left')
  expect(getComputedStyle(box).maskImage).not.toContain('to right')
})

test('scroll timelines without percentage ranges fall back to the manual fade', async () => {
  const supports = CSS.supports.bind(CSS)
  vi.spyOn(CSS, 'supports').mockImplementation((query: string) =>
    query.startsWith('animation-range') ? false : supports(query),
  )
  const screen = await mount('x')
  const box = screen.container.querySelector<HTMLElement>('.box')!
  expect(box.classList.contains('scroll-fade-manual')).toBe(true)
})
