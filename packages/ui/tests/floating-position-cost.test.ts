// A placed panel only re-renders when a layout pass moves it.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef, watch } from 'vue'
import Popover from '../src/components/Popover/Popover.vue'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const trigger = () => h('button', { type: 'button' }, 'Open')

test('an open lands its position once, however many layout passes agree on it', async () => {
  const open = shallowRef(false)
  const popover = shallowRef<{ positionerStyle: Record<string, string> }>()
  await render(() =>
    h(
      Popover as never,
      { ref: popover, open: open.value, motion: false, openOnTriggerClick: true },
      { trigger, default: () => 'Body' },
    ),
  )
  await nextTick()
  const styles: Record<string, string>[] = []
  watch(
    () => popover.value!.positionerStyle,
    (style) => styles.push(style),
    { flush: 'sync' },
  )
  for (let round = 0; round < 2; round++) {
    styles.length = 0
    open.value = true
    await vi.waitFor(() => expect(styles.at(-1)?.visibility).toBe('visible'))
    for (let i = 0; i < 10; i++) await frame()
    // Was one per autoUpdate pass, plus a fresh hidden style on the first open.
    expect(styles).toHaveLength(1)
    open.value = false
    await nextTick()
    await frame()
  }
})
