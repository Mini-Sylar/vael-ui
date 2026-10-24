/// <reference types="vite/client" />
import { expect, test } from 'vitest'
import manifest from '../src/style.css?raw'

// `vael-ui/style.css` is built from this hand-kept list, so a stylesheet missing here ships unstyled.
const stylesheets = Object.keys(import.meta.glob('../src/components/**/*.css'))

test('the full bundle imports every component stylesheet', () => {
  const missing = stylesheets
    .map((path) => path.replace('../src/', './'))
    .filter((path) => !manifest.includes(`'${path}'`))
  expect(missing).toEqual([])
})
