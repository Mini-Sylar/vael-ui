// An overlay's `stagger`: the parts given an `initial` come in one after another, in page order.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

const opacity = (sel: string) => {
  let o = 1
  for (let n = document.querySelector(sel); n; n = n.parentElement)
    o *= Number(getComputedStyle(n).opacity)
  return o
}

for (const engine of ['css', 'runtime'] as const) {
  test(`header, body and footer come in one after another (${engine})`, async () => {
    const hidden = { opacity: 0 }
    await render(
      () =>
        h(
          Dialog as never,
          {
            open: true,
            title: 'Invite',
            motion: {
              stagger: 0.15,
              duration: 150,
              initial: { header: hidden, body: hidden, footer: hidden },
              // A hook on another part hands the opening to the runtime.
              ...(engine === 'runtime'
                ? { steps: undefined, targets: { x: { after: 'panel' } } }
                : {}),
            },
          },
          { default: () => 'Body', footer: () => 'Footer' },
        ),
      { global: { stubs: { transition: false } } },
    )
    // When each first shows past half.
    const shown: Record<string, number> = {}
    const t0 = performance.now()
    while (performance.now() - t0 < 1500 && Object.keys(shown).length < 3) {
      for (const part of ['header', 'body', 'footer'])
        if (!(part in shown) && opacity(`.ui-dialog-${part}`) > 0.5)
          shown[part] = performance.now() - t0
      await new Promise(requestAnimationFrame)
    }
    expect(Object.keys(shown)).toHaveLength(3)
    expect(shown.body! - shown.header!).toBeGreaterThan(80)
    expect(shown.footer! - shown.body!).toBeGreaterThan(80)
  })
}
