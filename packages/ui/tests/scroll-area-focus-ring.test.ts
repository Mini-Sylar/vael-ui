// The scroller's focus ring sits on the root, where the viewport's own scroll fade can't mask it.
import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import ScrollArea from '../src/components/ScrollArea/ScrollArea.vue'

test('a focused viewport draws its ring on the root, outside its fade', async () => {
  const screen = await render(() =>
    h(ScrollArea, { style: 'height: 120px; width: 200px' }, () =>
      h('p', { style: 'height: 600px; margin: 0' }, 'Long text'),
    ),
  )
  const root = screen.container.querySelector<HTMLElement>('.ui-scroll-area')!
  const viewport = root.querySelector<HTMLElement>('.ui-scroll-area-viewport')!
  expect(getComputedStyle(root).outlineStyle).toBe('none')
  await userEvent.tab()
  expect(document.activeElement).toBe(viewport)
  expect(getComputedStyle(viewport).outlineStyle).toBe('none')
  expect(getComputedStyle(root).outlineStyle).toBe('solid')
  expect(getComputedStyle(root).outlineWidth).toBe('2px')
})
