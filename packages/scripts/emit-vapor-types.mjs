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

const outPath = join(__dirname, '../ui/dist/vapor/index.d.ts')
const lines = [
  `export { ${componentNames.join(', ')}, vTooltipVapor as vTooltip, vScrollMaskVapor as vScrollMask } from '../index'`,
]
const directiveTypeNames = ['TooltipDirectiveOptions', 'TooltipDirectiveValue']
const allTypeNames = [...typeNames, ...directiveTypeNames]
if (allTypeNames.length > 0) lines.push(`export type { ${allTypeNames.join(', ')} } from '../index'`)
writeFileSync(outPath, lines.join('\n') + '\n')
console.log(
  `generated dist/vapor/index.d.ts (${componentNames.length} component(s), ${allTypeNames.length} type(s))`,
)
