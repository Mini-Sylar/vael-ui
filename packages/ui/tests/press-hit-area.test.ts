import { expect, test } from 'vitest'

const sheets = import.meta.glob('../src/components/**/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// `.x:active` rules that shrink `.x` itself, not a layer inside it.
function selfScalingPresses(css: string): string[] {
  const found: string[] = []
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, selectors, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/\b(?:scale\s*:\s*0|transform\s*:[^;]*scale\(0)/.test(body!)) continue
    for (const raw of selectors!.split(',')) {
      const last = raw.trim().split(/\s+/).at(-1) ?? ''
      const match = last.match(/^(\.[\w-]+)[^:]*:active(?!.*::)/)
      if (match) found.push(match[1]!)
    }
  }
  return found
}

test('a control that shrinks while pressed keeps its full box clickable', () => {
  const all = Object.values(sheets).join('\n')
  const missing = new Set<string>()
  for (const css of Object.values(sheets)) {
    for (const cls of selfScalingPresses(css)) {
      const guard = new RegExp(`\\${cls}:active::after[^{]*\\{[^}]*inset:\\s*-`)
      if (!guard.test(all)) missing.add(cls)
    }
  }
  expect([...missing]).toEqual([])
})
