// `exitOrder: 'reverse'` with a dialog's own parts animated: they close before the panel, last first.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

test('a Dialog’s header, body and footer leave before its panel, footer first', async () => {
  const open = shallowRef(true)
  await render(
    () =>
      h(
        Dialog as never,
        {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          title: 'Profile',
          motion: {
            initial: { header: { opacity: 0 }, body: { opacity: 0 }, footer: { opacity: 0 } },
            exitOrder: 'reverse',
            duration: 200,
          },
        },
        { default: () => 'Body', footer: () => h('button', 'Done') },
      ),
    { global: { stubs: { transition: false } } },
  )
  await new Promise((resolve) => setTimeout(resolve, 600))
  open.value = false
  await nextTick()
  const op = (sel: string) => {
    const el = document.querySelector(sel)
    return el ? Number(getComputedStyle(el).opacity) : -1
  }
  const frames: Record<string, number>[] = []
  for (let frame = 0; frame < 40; frame++) {
    await new Promise(requestAnimationFrame)
    frames.push({
      panel: op('.ui-dialog-panel'),
      header: op('.ui-dialog-header'),
      footer: op('.ui-dialog-footer'),
    })
  }
  const firstBelow = (key: string) => frames.findIndex((f) => f[key]! >= 0 && f[key]! < 0.95)
  // The footer goes first, the header after it, the panel last.
  expect(firstBelow('footer')).toBeLessThan(firstBelow('header'))
  expect(firstBelow('header')).toBeLessThan(firstBelow('panel'))
})
