#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const barrel = readFileSync(join(__dirname, '../vapor-ui/src/generated/index.ts'), 'utf8')
const componentNames = [...barrel.matchAll(/^export \{ default as (\w+) \}/gm)].map((m) => m[1])

// Type-only exports (prop/emit unions etc.) carry no runtime bundle
// requirement, so it's safe to mirror any whose source component made it
// into the Vapor build — same scoping the component re-export above uses.
const uiIndex = readFileSync(join(__dirname, '../ui/src/index.ts'), 'utf8')
const typeNames = []
// The path's final segment (before .vue) is always the component name,
// whether it's still flat (./components/Foo.vue) or has migrated to a
// per-component folder (./components/Foo/Foo.vue) — see generate-vapor.mjs's
// resolveModuleId for the same flat-or-folder split.
for (const match of uiIndex.matchAll(
  /export type \{([^}]+)\} from '\.\/components\/(?:\w+\/)?(\w+)\.vue'/g,
)) {
  const [, namedClause, componentName] = match
  if (!componentNames.includes(componentName)) continue
  for (const raw of namedClause.split(',')) {
    const trimmed = raw.trim()
    if (trimmed) typeNames.push(trimmed)
  }
}

// A component's own .vue file can export more than its default (e.g. Tree.vue's
// findTreeNode/findTreeParent/removeTreeNode). The `export type {...}` loop above
// already mirrors that component's extra TYPE exports; this does the same for
// extra VALUE exports, restricted to components that actually made it into the
// Vapor build (same componentNames scoping used everywhere else in this file).
const componentExtraValueNames = []
for (const match of uiIndex.matchAll(
  /export \{([^}]+)\} from '\.\/components\/(?:\w+\/)?(\w+)\.vue'/g,
)) {
  const [, namedClause, componentName] = match
  if (!componentNames.includes(componentName)) continue
  for (const raw of namedClause.split(',')) {
    const trimmed = raw.trim()
    if (!trimmed || /^default(\s+as\s+\S+)?$/.test(trimmed)) continue
    componentExtraValueNames.push(trimmed)
  }
}

const outPath = join(__dirname, '../ui/dist/vapor/index.d.ts')
const lines = [
  `export { ${componentNames.join(', ')}, vTooltipVapor as vTooltip, vScrollMaskVapor as vScrollMask } from '../index'`,
]
if (componentExtraValueNames.length > 0) {
  lines.push(`export { ${componentExtraValueNames.join(', ')} } from '../index'`)
}
const allTypeNames = typeNames
if (allTypeNames.length > 0) lines.push(`export type { ${allTypeNames.join(', ')} } from '../index'`)

// Types only — safe to re-export from the sibling dist/index.d.ts (unlike the
// runtime .js side, see generate-vapor.mjs, types aren't subject to the circular-reexport issue).
const DIRECTIVE_ORIGINALS_EXCLUDED = new Set(['vTooltip', 'vScrollMask'])
const composableValues = new Set()
const composableTypes = new Set()
for (const match of uiIndex.matchAll(/export\s+(type\s+)?\{([^}]+)\}\s+from\s+'([^']+)'/g)) {
  const [, typeOnly, namedClause, specifier] = match
  if (specifier.endsWith('.vue')) continue
  for (const raw of namedClause.split(',')) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const isTypeMember = typeOnly || trimmed.startsWith('type ')
    const name = trimmed.replace(/^type\s+/, '')
    const asMatch = name.match(/\bas\s+(\S+)/)
    const exported = asMatch ? asMatch[1] : name
    if (DIRECTIVE_ORIGINALS_EXCLUDED.has(exported)) continue
    ;(isTypeMember ? composableTypes : composableValues).add(exported)
  }
}
if (composableValues.size > 0) lines.push(`export { ${[...composableValues].join(', ')} } from '../index'`)
if (composableTypes.size > 0) lines.push(`export type { ${[...composableTypes].join(', ')} } from '../index'`)
const composableCount = composableValues.size

writeFileSync(outPath, lines.join('\n') + '\n')
console.log(
  `generated dist/vapor/index.d.ts (${componentNames.length} component(s), ${allTypeNames.length} type(s), ${composableCount} composable(s)/utilit(y/ies))`,
)
