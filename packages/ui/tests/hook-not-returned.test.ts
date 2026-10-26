// A hook that starts a style-writing animation (as GSAP does) but doesn't return it warns in development.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('an enter hook that animates by writing styles, without returning it, is named in a warning', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  // As GSAP does: inline styles written frame by frame, nothing returned.
  const enter = (el: HTMLElement) => {
    let frame = 0
    const step = () => {
      el.style.opacity = String(Math.min(1, ++frame / 10))
      if (frame < 10) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  await render(() => withDirectives(h('p', 'Hello'), [[vAnimate, { enter }]]))
  await vi.waitFor(() =>
    expect(
      warn.mock.calls
        .map((c) => String(c[0]))
        .some((m) => m.includes('still animating when the hook returned')),
    ).toBe(true),
  )
  warn.mockRestore()
})
