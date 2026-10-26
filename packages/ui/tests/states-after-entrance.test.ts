// An element's held state looks wait for its own entrance: `states.inView` beside a
// `when: 'visible'` entrance never fades it in where it is and slides it afterwards.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('inView look and visible entrance on one element: it is never fully faded in while still offset', async () => {
  const section = (n: number) =>
    withDirectives(
      h('section', { class: `section s${n}`, style: 'opacity: 0.5; height: 60px' }, 'Report'),
      [
        [
          vAnimate,
          {
            when: 'visible',
            initial: { opacity: 0, y: 20 },
            duration: 300,
            stagger: 0.2,
            states: { inView: { opacity: 1 } },
            viewport: { amount: 0.5 },
          },
          'sections',
        ],
      ],
    )
  const screen = await render(() => h('div', [section(1), section(2)]))
  // The second: its entrance waits its turn in the stagger.
  const section2 = screen.container.querySelector<HTMLElement>('.s2')!
  const frames: { opacity: number; y: number }[] = []
  for (let frame = 0; frame < 50; frame++) {
    await new Promise(requestAnimationFrame)
    const cs = getComputedStyle(section2)
    frames.push({
      opacity: Number(cs.opacity),
      y: Number.parseFloat(cs.translate.split(' ')[1] ?? '0') || 0,
    })
  }
  // Faded in while still well below its place: the "lands, then readjusts" look.
  expect(frames.filter((f) => f.opacity > 0.9 && f.y > 10)).toEqual([])
  // Then its state's look on top, once it's in.
  expect(frames.at(-1)!.y).toBe(0)
  expect(frames.at(-1)!.opacity).toBeCloseTo(1, 2)
})
