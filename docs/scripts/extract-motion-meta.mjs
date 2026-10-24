#!/usr/bin/env node
// Each component's `motion`, read from packages/ui/src/motion/types.ts: the type its prop takes,
// what that type says about itself, its parts, its states and what kind of motion it has. The
// docs' Motion tables come from here, so they can't drift from the source.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const types = readFileSync(join(here, '../../packages/ui/src/motion/types.ts'), 'utf8')
const meta = JSON.parse(readFileSync(join(here, '../src/generated/component-meta.json'), 'utf8'))
const OUT = join(here, '../src/generated/motion-meta.json')

// Every `export type Name …` with its doc comment, up to the next declaration.
const decls = new Map()
const re =
  /(\/\*\*([\s\S]*?)\*\/\s*)?export (?:type|interface) (\w+)([\s\S]*?)(?=\n(?:\/\*\*|\/\/|export |type |interface |const |function )|$)/g
for (const m of types.matchAll(re)) {
  const doc = (m[2] ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)
    .join(' ')
  decls.set(m[3], { doc, body: m[4] })
}

const strings = (text) => [...text.matchAll(/'([\w-]+)'/g)].map((m) => m[1])
function partsOf(ref) {
  const name = ref.trim()
  if (name.startsWith("'")) return strings(name)
  const d = decls.get(name)
  return d ? strings(d.body.split('\n\n')[0]) : []
}
const KINDS = ['overlay', 'list', 'indicator', 'swap', 'value']

// Keys of its own beside the parts: CommandPalette's `items`, a select's `chips`.
function extrasOf(body) {
  const own = [...body.matchAll(/\/\*\*\s*([\s\S]*?)\s*\*\/\s*(\w+)\?:\s*(\w+)/g)].map((m) => ({
    key: m[2],
    type: m[3],
    doc: m[1].replace(/\s*\*\s?/g, ' ').trim(),
  }))
  if (/WithChips</.test(body))
    own.push({ key: 'chips', type: 'ChipsMotion', doc: decls.get('ChipsMotion')?.doc ?? '' })
  return own
}

function describe(typeName, seen = new Set()) {
  if (seen.has(typeName)) return undefined
  seen.add(typeName)
  const d = decls.get(typeName)
  if (!d) return undefined
  const extras = extrasOf(d.body)
  const spec = d.body.match(/ComponentMotion<\s*\{([\s\S]*?)\}/)
  if (spec) {
    const s = spec[1]
    const p = s.match(/parts:\s*([^;\n]+(?:\n\s*\|[^;\n]+)*)/)
    const st = s.match(/states:\s*([^;\n}]+(?:\n\s*\|[^;\n}]+)*)/)
    return {
      type: typeName,
      doc: d.doc,
      parts: p ? partsOf(p[1].replace(/\s+/g, ' ')) : [],
      states: st ? strings(st[1]) : [],
      kinds: KINDS.filter((k) => new RegExp(`\\b${k}:\\s*true`).test(s)),
      extras,
    }
  }
  // An alias of another component's motion (Tooltip's box is Popover's), maybe wrapped (WithChips).
  const alias = d.body.match(/=\s*(?:\w+<\s*)*?(\w+Motion)\b/)
  if (alias && alias[1] !== typeName) {
    const base = describe(alias[1], seen)
    if (base)
      return {
        ...base,
        type: typeName,
        doc: d.doc || base.doc,
        extras: [...base.extras, ...extras],
      }
  }
  // Written out by hand: parts from its PartValues.
  const parts = d.body.match(/PartValues<(\w+)>/)
  return {
    type: typeName,
    doc: d.doc,
    parts: parts ? partsOf(parts[1]) : [],
    states: [],
    kinds: [],
    extras,
  }
}

const out = {}
for (const [name, component] of Object.entries(meta)) {
  const prop = component.props?.find((p) => p.name === 'motion')
  const typeName = prop?.type.match(/\b(\w+Motion)\b/)?.[1]
  if (!typeName || name === 'ConfigProvider') continue
  const info = describe(typeName)
  if (info) out[name] = info
}
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`)
console.log(`wrote docs/src/generated/motion-meta.json (${Object.keys(out).length} component(s))`)
