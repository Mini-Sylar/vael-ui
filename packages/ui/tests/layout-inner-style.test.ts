// `layout: true` rows: a style animating inside a row costs no layout reads; a row that really
// grows still slides the rows below it.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

const frame = () => new Promise(requestAnimationFrame)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const rows = (layout: true | 'position' = true) =>
  render(() =>
    h(
      'ul',
      { style: 'margin: 0; padding: 0; list-style: none' },
      [1, 2, 3].map((n) =>
        withDirectives(
          h('li', { key: n, class: `row-${n}` }, [
            h('span', { class: 'dot', style: 'display: block; height: 30px' }, `Row ${n}`),
          ]),
          [[vAnimate, { layout, duration: 300 }]],
        ),
      ),
    ),
  )

test('a style changing inside a row on every frame reads no places', async () => {
  await rows()
  await wait(300)
  const dot = document.querySelector<HTMLElement>('.row-1 .dot')!
  const reads = vi.spyOn(window, 'getComputedStyle')
  for (let i = 0; i < 10; i++) {
    dot.style.opacity = String(1 - i / 20)
    await frame()
  }
  expect(reads).not.toHaveBeenCalled()
})

test('a row growing from inside still slides the rows below it', async () => {
  await rows('position')
  await wait(300)
  document.querySelector<HTMLElement>('.row-1 .dot')!.style.height = '80px'
  await vi.waitFor(() =>
    expect(document.querySelector('.row-2')!.getAnimations().length).toBeGreaterThan(0),
  )
})

test('a size-followed box: a style changing deep inside it on every frame measures nothing', async () => {
  render(() =>
    withDirectives(h('div', { class: 'box' }, [h('p', [h('span', { class: 'deep' }, 'Deep')])]), [
      [vAnimate, { duration: 300 }, undefined, { size: true }],
    ]),
  )
  await wait(300)
  const deep = document.querySelector<HTMLElement>('.deep')!
  const reads = vi.spyOn(Element.prototype, 'getClientRects')
  for (let i = 0; i < 10; i++) {
    deep.style.opacity = String(1 - i / 20)
    await frame()
  }
  expect(reads).not.toHaveBeenCalled()
})
