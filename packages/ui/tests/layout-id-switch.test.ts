// A detail that stays open while another card is picked: its layoutId changes, so the open one
// shrinks back into its card and the picked card grows into the detail, as on a first open.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

const travelling = (el: Element | null) =>
  !!el?.getAnimations().some((run) => run.id === 'ui-layout')

test('picking another card while one is open: both travel, the detail never just swaps', async () => {
  const picked = shallowRef(0)
  const card = (id: number) =>
    picked.value === id
      ? null
      : withDirectives(h('article', { class: `card card-${id}`, style: 'height: 80px' }), [
          [vAnimate, { layoutId: `card-${id}`, duration: 2000 }],
        ])
  const screen = await render(() =>
    h('div', [
      picked.value
        ? withDirectives(h('section', { class: 'detail', style: 'height: 200px' }), [
            [vAnimate, { layoutId: `card-${picked.value}`, duration: 2000 }],
          ])
        : null,
      h('div', { style: 'display: grid; grid-template-columns: 100px 100px; gap: 10px' }, [
        card(1),
        card(2),
        card(3),
      ]),
    ]),
  )
  const $ = (selector: string) => screen.container.querySelector(selector)
  await new Promise((resolve) => setTimeout(resolve, 100))
  picked.value = 3
  await nextTick()
  await vi.waitFor(() => expect(travelling($('.detail'))).toBe(true))
  for (const run of document.getAnimations()) run.finish()
  await new Promise((resolve) => setTimeout(resolve, 100))

  picked.value = 1
  await nextTick()
  await vi.waitFor(() => {
    expect(travelling($('.detail')), 'the detail grows out of card 1').toBe(true)
    expect(travelling($('.card-3')), 'card 3 comes back out of the detail').toBe(true)
  })
  expect($('.detail')!.getAttribute('data-layout-id')).toBe('card-1')
})
