import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, withDirectives } from 'vue'
import { vScrollMask } from '../src/directives/vScrollMask'

afterEach(() => {
  vi.restoreAllMocks()
})

function mountScroller(
  axis: 'x' | 'y',
  extra: { style?: string; dir?: string; class?: string } = {},
) {
  const Scroller = defineComponent({
    setup: () => () =>
      withDirectives(
        h(
          'div',
          {
            'data-testid': 'scroller',
            dir: extra.dir,
            class: extra.class,
            style:
              (axis === 'x'
                ? 'width: 200px; overflow-x: auto; white-space: nowrap'
                : 'height: 200px; overflow-y: auto') + (extra.style ?? ''),
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

test('content that grows inside a child component turns the fade on, and off again when it shrinks', async () => {
  const rows = shallowRef(2)
  // The rows live in a child, so the scroller's own component never re-renders.
  const Rows = defineComponent({
    setup: () => () =>
      Array.from({ length: rows.value }, (_, i) => h('div', { key: i, style: 'height: 40px' })),
  })
  const Scroller = defineComponent({
    setup: () => () =>
      withDirectives(
        h('div', { 'data-testid': 'scroller', style: 'height: 200px; overflow-y: auto' }, h(Rows)),
        [[vScrollMask, 'y']],
      ),
  })
  const screen = await render(Scroller)
  const el = screen.container.querySelector<HTMLElement>('[data-testid="scroller"]')!
  expect(el.classList.contains('scroll-fade')).toBe(false)

  rows.value = 20
  await vi.waitFor(() => expect(el.classList.contains('scroll-fade')).toBe(true))
  rows.value = 2
  await vi.waitFor(() => expect(el.classList.contains('scroll-fade')).toBe(false))
})

test('a child that grows through its style turns the fade on', async () => {
  const Scroller = defineComponent({
    setup: () => () =>
      withDirectives(
        h('div', { 'data-testid': 'scroller', style: 'height: 200px; overflow-y: scroll' }, [
          h('div', { style: 'height: 10px' }),
        ]),
        [[vScrollMask, 'y']],
      ),
  })
  const screen = await render(Scroller)
  const el = screen.container.querySelector<HTMLElement>('[data-testid="scroller"]')!
  expect(el.classList.contains('scroll-fade')).toBe(false)
  // Past the ResizeObserver's first callback, which would otherwise catch the change by chance.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  // A scrollbar that's always there keeps the box from resizing, so only the content changes.
  // Change the child's style directly, as a child component's own re-render would.
  el.firstElementChild!.setAttribute('style', 'height: 600px')
  await vi.waitFor(() => expect(el.classList.contains('scroll-fade')).toBe(true))
})

test("the scrollbar's strip stays out of the fade: at least 12px, none when hidden, on the left right to left", async () => {
  const scroller = (screen: { container: Element }) =>
    screen.container.querySelector<HTMLElement>('[data-testid="scroller"]')!
  {
    // A border is not a scrollbar.
    const bordered = await mountScroller('y', {
      style: '; border: 30px solid; scrollbar-width: thin',
    })
    await nextTick()
    const own = scroller(bordered)
    const bar = own.offsetWidth - own.clientWidth - 60
    expect(own.style.getPropertyValue('--ui-scroll-bar-y')).toBe(`${Math.max(bar, 12)}px`)
    bordered.unmount()
    expect(own.style.getPropertyValue('--ui-scroll-bar-y')).toBe('')

    const hidden = await mountScroller('x', { style: '; scrollbar-width: none' })
    await nextTick()
    expect(scroller(hidden).style.getPropertyValue('--ui-scroll-bar-x')).toBe('0px')
    hidden.unmount()

    // Right to left, the vertical scrollbar (and its strip) sits on the left.
    const rtl = await mountScroller('y', { dir: 'rtl' })
    await nextTick()
    expect(getComputedStyle(scroller(rtl)).maskPosition).toBe('100% 0%, 0% 0%')
    rtl.unmount()
  }
})
