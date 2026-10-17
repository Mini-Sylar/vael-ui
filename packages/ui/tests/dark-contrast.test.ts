import '../src/style.css'
import { afterEach, expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'
import Badge from '../src/components/Badge/Badge.vue'
import Tag from '../src/components/Tag/Tag.vue'

// Resolves any CSS color (including color-mix) to sRGB through a canvas.
function rgb(css: string): [number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r!, g!, b!]
}
function luminance([r, g, b]: [number, number, number]) {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
function contrast(fg: string, bg: string) {
  const [a, b] = [luminance(rgb(fg)), luminance(rgb(bg))]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
const style = (el: Element) => getComputedStyle(el)

afterEach(() => {
  delete document.documentElement.dataset.theme
})

test('dark: success and info badges and info tag text reach 4.5:1', async () => {
  document.documentElement.dataset.theme = 'dark'
  const screen = await render(() =>
    h('div', [
      h(Badge, { variant: 'success', 'data-testid': 'success' }, () => 'Paid'),
      h(Badge, { variant: 'info', 'data-testid': 'info' }, () => 'Draft'),
      h(Tag, { variant: 'info', 'data-testid': 'tag' }, () => 'Draft'),
    ]),
  )
  for (const id of ['success', 'info', 'tag']) {
    const el = screen.getByTestId(id).element()
    expect(contrast(style(el).color, style(el).backgroundColor), id).toBeGreaterThanOrEqual(4.5)
  }
})

test('light keeps its original badge and tag colors', async () => {
  document.documentElement.dataset.theme = 'light'
  const screen = await render(() =>
    h('div', [
      h(Badge, { variant: 'success', 'data-testid': 'success' }, () => 'Paid'),
      h(Badge, { variant: 'info', 'data-testid': 'info' }, () => 'Draft'),
      h(Tag, { variant: 'info', 'data-testid': 'tag' }, () => 'Draft'),
    ]),
  )
  const root = getComputedStyle(document.documentElement)
  expect(rgb(style(screen.getByTestId('success').element()).color)).toEqual([255, 255, 255])
  expect(rgb(style(screen.getByTestId('info').element()).backgroundColor)).toEqual(
    rgb(root.getPropertyValue('--ui-info')),
  )
  expect(rgb(style(screen.getByTestId('tag').element()).color)).toEqual(
    rgb(root.getPropertyValue('--ui-info')),
  )
})
