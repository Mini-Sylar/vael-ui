// An element of your own removed inside an open overlay: its exit plays, then its onAfterLeave runs.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, withDirectives } from 'vue'
import Drawer from '../src/components/Drawer/Drawer.vue'
import { vAnimate } from '../src/motion/vAnimate'

for (const named of [false, true]) {
  test(`removed inside an open Drawer${named ? ' (a named target)' : ''}: onAfterLeave runs`, async () => {
    const rows = shallowRef(['A', 'B', 'C'])
    const left = vi.fn()
    await render(
      () =>
        h(Drawer as never, { open: true, title: 'Cart' }, () =>
          rows.value.map((row) =>
            withDirectives(h('p', { key: row, class: 'row' }, row), [
              [
                vAnimate,
                { initial: { opacity: 0 }, onAfterLeave: () => left(row) },
                named ? 'rows' : undefined,
              ],
            ]),
          ),
        ),
      { global: { stubs: { transition: false } } },
    )
    await new Promise((resolve) => setTimeout(resolve, 800))
    rows.value = ['A', 'C']
    await nextTick()
    await vi.waitFor(() => expect(left).toHaveBeenCalledWith('B'), { timeout: 2000 })
  })
}
