// v-hover-indicator written without a row selector says so in development; `false` stays quiet.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, withDirectives } from 'vue'
import { vHoverIndicator } from '../src/directives/vHoverIndicator'

test('bare v-hover-indicator warns; v-hover-indicator="false" does not', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  await render(() =>
    h('div', [
      withDirectives(h('ul', [h('li', 'One')]), [[vHoverIndicator, undefined]]),
      withDirectives(h('ul', [h('li', 'Two')]), [[vHoverIndicator, false as never]]),
    ]),
  )
  const said = warn.mock.calls
    .map((c) => String(c[0]))
    .filter((m) => m.includes('v-hover-indicator needs a selector'))
  expect(said).toHaveLength(1)
  warn.mockRestore()
})
