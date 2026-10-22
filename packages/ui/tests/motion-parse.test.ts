import { afterEach, expect, test, vi } from 'vitest'
import { parseMotionStyle } from '../src/motion/parse'

const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {})
afterEach(() => vi.restoreAllMocks())

test('a good style comes through unchanged, with no issues', () => {
  const good = {
    version: 1,
    spring: { damping: 0.7, response: 0.35 },
    filters: { goo: { blur: 8, contrast: [18, -7] } },
    overlay: {
      initial: { opacity: 0, y: { value: 12, spring: { damping: 0.5, response: 0.4 } } },
      exitOrder: 'reverse',
    },
    list: { stagger: 0.04, leaving: 'pop', initial: { opacity: 0, x: -8 } },
    content: { initial: { opacity: 0, blur: 4 }, after: 'panel:40%', stagger: 0.05 },
    presets: {
      rise: {
        initial: { opacity: 0, y: 8 },
        duration: 300,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
    dialog: {
      initial: { panel: { opacity: 0, scale: '0.94' } },
      targets: { rows: { initial: { opacity: 0 }, after: 'title' } },
    },
  }
  const { style, issues } = parseMotionStyle(JSON.parse(JSON.stringify(good)))
  expect(issues).toEqual([])
  expect(style).toEqual(good)
})

test('not a style at all: the built-in motion, never a throw', () => {
  quiet()
  for (const input of [null, 'calm', 42, [], { version: 2 }, { overlay: {} }])
    expect(parseMotionStyle(input).style).toEqual({ version: 1 })
})

test('no tracking requests, no breaking out of a declaration, no markup', () => {
  quiet()
  const { style, issues } = parseMotionStyle({
    version: 1,
    overlay: {
      initial: {
        backgroundColor: 'url(https://evil.example/pixel.png)',
        filter: 'blur(2px)} body{display:none',
        boxShadow: '0 0 1px red; background: url(x)',
        opacity: 0,
      },
    },
    filters: { '<script>': { blur: 4 }, goo: { blur: 4, href: 'javascript:alert(1)' } },
    content: { select: 'li}{', easing: 'expression(alert(1))' },
  })
  expect(style.overlay?.initial).toEqual({ opacity: 0 })
  expect(Object.keys(style.filters ?? {})).toEqual(['goo'])
  expect(style.filters?.goo).toEqual({ blur: 4 })
  expect(style.content).toEqual({})
  expect(issues.length).toBeGreaterThanOrEqual(6)
})

test('functions never come from data: hooks live only in code you review', () => {
  quiet()
  const { style, issues } = parseMotionStyle({
    version: 1,
    dialog: { enter: () => {}, leave: () => {}, initial: { panel: { opacity: 0 } } },
  })
  expect(style.dialog).toEqual({ initial: { panel: { opacity: 0 } } })
  expect(issues.filter((i) => i.includes('functions'))).toHaveLength(2)
})

test('JSON __proto__ keys never reach a prototype', () => {
  quiet()
  const { style } = parseMotionStyle(
    JSON.parse(
      '{"version":1,"__proto__":{"polluted":true},"overlay":{"__proto__":{"polluted":true}}}',
    ),
  )
  expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  expect(Object.getPrototypeOf(style)).toBe(Object.prototype)
  expect((style as unknown as Record<string, unknown>).polluted).toBeUndefined()
})

test('numbers stay in sane ranges; layout properties and unknown keys are dropped', () => {
  quiet()
  const { style, issues } = parseMotionStyle({
    version: 1,
    spring: { damping: 50, response: 0.3 },
    list: { stagger: 30, duration: 99999 },
    overlay: { initial: { width: '9999px', opacity: Number.NaN, scale: '0.9' } },
    content: { delay: 10, after: 'a'.repeat(100) },
    mystery: true,
  })
  expect(style.spring).toBeUndefined()
  expect(style.list).toEqual({})
  expect(style.overlay?.initial).toEqual({ scale: '0.9' })
  expect(style.content).toEqual({})
  expect(issues.some((i) => i.startsWith('mystery'))).toBe(true)
})

test("morph's object form comes through; anything else in it is dropped", () => {
  quiet()
  const ok = parseMotionStyle({ version: 1, overlay: { morph: { from: 'trigger', hide: false } } })
  expect(ok.style.overlay).toEqual({ morph: { from: 'trigger', hide: false } })
  expect(ok.issues).toEqual([])
  for (const morph of [
    { from: 'body' },
    { from: 'trigger', hide: 'no' },
    { from: 'trigger', x: 1 },
  ]) {
    const { style, issues } = parseMotionStyle({ version: 1, overlay: { morph } })
    expect(style.overlay?.morph).toBeUndefined()
    expect(issues).toHaveLength(1)
  }
})

test('overlay swap and resize come through; bad values are dropped', () => {
  quiet()
  const ok = parseMotionStyle({ version: 1, overlay: { swap: 'wait', resize: false } })
  expect(ok.style.overlay).toEqual({ swap: 'wait', resize: false })
  const bad = parseMotionStyle({ version: 1, overlay: { swap: 'later', resize: 'no' } })
  expect(bad.style.overlay).toEqual({})
  expect(bad.issues).toHaveLength(2)
})

test('every component key survives, with its states and nested chips', () => {
  quiet()
  const { style, issues } = parseMotionStyle({
    version: 1,
    switch: { states: { checked: { thumb: { scale: 1.1 } } } },
    select: { chips: { initial: { chip: { opacity: 0 } }, stagger: 0.03 } },
    separator: { initial: { line: { opacity: 0 } } },
  })
  expect(issues).toEqual([])
  expect(style.switch).toEqual({ states: { checked: { thumb: { scale: 1.1 } } } })
  expect(style.select).toEqual({ chips: { initial: { chip: { opacity: 0 } }, stagger: 0.03 } })
  expect(style.separator).toEqual({ initial: { line: { opacity: 0 } } })
})

test('an engine is code, never data', () => {
  quiet()
  const { style, issues } = parseMotionStyle({ version: 1, engine: () => {} })
  expect(style.engine).toBeUndefined()
  expect(issues.some((i) => i.includes('engine'))).toBe(true)
})
