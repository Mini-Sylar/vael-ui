import { expect, test } from 'vitest'

const sources = import.meta.glob('../src/components/**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// A `motion` prop typed with `boolean` is cast to `false` when absent, which reads as "motion off"
// and silently drops shared styles. Every public component declaring it gives it a default
// (`undefined` for unset). Internal components always receive it from their parent.
test('every motion prop has a default, so an absent one never reads as off', () => {
  const missing = Object.entries(sources)
    .filter(([path]) => !path.includes('/internal/'))
    .filter(([, source]) => /^\s+motion\?:/m.test(source))
    .filter(([, source]) => !/\bmotion: (undefined|true|false)\b/.test(source))
    .map(([path]) => path.split('/components/')[1])
  expect(missing).toEqual([])
})
