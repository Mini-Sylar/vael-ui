import '../src/style.css'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ContextMenuFixture from './fixtures/ContextMenuFixture.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

const touch = { pointerType: 'touch', pointerId: 3, bubbles: true, isPrimary: true }
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function contextMenu(el: Element, clientX: number, clientY: number) {
  el.dispatchEvent(
    new MouseEvent('contextmenu', { clientX, clientY, bubbles: true, cancelable: true }),
  )
}

// Android fires contextmenu on a long press, alongside the component's own long-press timer.
test.each([
  ['before', 100],
  ['after', 600],
])(
  'a long press that also fires contextmenu (%s the timer) opens the menu once',
  async (_, contextAt) => {
    const screen = await render(ContextMenuFixture)
    const target = screen.container.querySelector('.ui-context-menu-trigger')!
    target.dispatchEvent(new PointerEvent('pointerdown', { ...touch, clientX: 80, clientY: 60 }))
    await wait(contextAt)
    contextMenu(target, 80, 60)
    await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull())
    const positioner = document.querySelector('.ui-menu-positioner')

    await wait(700 - contextAt)
    target.dispatchEvent(new PointerEvent('pointerup', touch))
    await wait(100)
    expect(document.querySelectorAll('.ui-menu-positioner')).toHaveLength(1)
    expect(document.querySelector('.ui-menu-positioner')).toBe(positioner)
  },
)
