// Pages, as RouterView renders them: the keyed page root with `v-animate:page`. By default the old
// one leaves while the new one comes in; with `swap: 'wait'` the new one waits for it to go.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

function pages(swap?: 'wait') {
  const page = (name: string) =>
    defineComponent({
      name,
      setup: () => () =>
        withDirectives(h('main', { class: 'page', style: 'height: 100px' }, name), [
          [
            vAnimate,
            {
              initial: { opacity: 0 },
              exit: { opacity: 0 },
              duration: 200,
              easing: 'linear',
              swap,
            },
            'page',
          ],
        ]),
    })
  return { home: page('home'), about: page('about') }
}

const opacity = (el: Element) => {
  let o = 1
  for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
  return o
}

async function swapAndWatch(swap?: 'wait') {
  const { home, about } = pages(swap)
  const view = shallowRef<ReturnType<typeof defineComponent>>(home)
  const screen = await render(() => h(view.value, { key: view.value.name }))
  await new Promise((r) => setTimeout(r, 300))
  view.value = about
  const frames: { home: number; about: number }[] = []
  const t0 = performance.now()
  while (performance.now() - t0 < 600) {
    await new Promise(requestAnimationFrame)
    const all = [...screen.container.ownerDocument.querySelectorAll('.page')]
    const of = (name: string) => {
      const el = all.find((p) => p.textContent === name)
      return el ? opacity(el) : 0
    }
    frames.push({ home: of('home'), about: of('about') })
  }
  return frames
}

test("swap: 'wait' — the new page comes in once the old one has gone", async () => {
  const frames = await swapAndWatch('wait')
  // Never both on screen: while the old one still shows, the new one is unseen.
  for (const f of frames) if (f.home > 0.05) expect(f.about).toBeLessThan(0.05)
  expect(frames.some((f) => f.home > 0.3)).toBe(true)
  expect(frames.at(-1)!.about).toBeCloseTo(1, 1)
})

test('by default the two cross', async () => {
  const frames = await swapAndWatch()
  expect(frames.some((f) => f.home > 0.2 && f.about > 0.2)).toBe(true)
  expect(frames.at(-1)!.about).toBeCloseTo(1, 1)
})
