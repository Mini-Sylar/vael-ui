// A layoutId element that leaves while it's being dragged (it waits hidden in its place while a
// copy floats under the pointer) starts its trip from the copy: what was on screen.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef, withDirectives } from 'vue'
import { vAnimate } from '../src/motion/vAnimate'

test('the trip starts where the floating copy is, not the hidden row', async () => {
  const inTray = shallowRef(false)
  const screen = await render(() =>
    h('div', { style: 'display: flex; gap: 200px' }, [
      h('div', { class: 'bench', style: 'width: 120px' }, [
        inTray.value
          ? null
          : withDirectives(
              h('div', {
                class: 'card',
                style: 'height: 40px; visibility: hidden',
                'data-sortable-source': '',
              }),
              [[vAnimate, { layoutId: 'tech-1', duration: 400, easing: 'linear' }]],
            ),
      ]),
      h('div', { class: 'tray', style: 'width: 120px' }, [
        inTray.value
          ? withDirectives(h('div', { class: 'member', style: 'height: 40px' }), [
              [vAnimate, { layoutId: 'tech-1', duration: 400, easing: 'linear' }],
            ])
          : null,
      ]),
    ]),
  )
  await new Promise((r) => setTimeout(r, 300))
  // The copy the drag floats, over the tray.
  const copy = document.createElement('div')
  copy.setAttribute('data-sortable-preview', '')
  copy.style.cssText = 'position: fixed; left: 300px; top: 100px; width: 120px; height: 40px'
  document.body.append(copy)
  inTray.value = true
  await new Promise(requestAnimationFrame)
  copy.remove()
  const member = screen.container.querySelector('.member')!.getBoundingClientRect()
  // From the copy (300, 100), not from the bench (0, 0).
  expect(member.left).toBeGreaterThan(250)
  expect(member.top).toBeGreaterThan(60)
})
