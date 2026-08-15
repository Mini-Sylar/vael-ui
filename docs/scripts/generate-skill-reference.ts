// One-off generator: turns docs/src's real data sources (component-meta.json,
// taxonomy.ts, composablesContent.ts, locales/en.json) into markdown reference
// files for the vael-ui-skills repo, one file per component/composable. Not
// part of the docs build; run manually with `npx tsx` when the skill needs
// regenerating after real API changes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { categories } from '../src/taxonomy'
import { composableCategories } from '../src/composablesTaxonomy'
import { composablesContent } from '../src/composablesContent'
import type { ComponentMetaEntry, MetaRow } from '../src/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = join(__dirname, '..')
const OUT_DIR =
  process.argv[2] ?? join(__dirname, '../../../vael-ui-skills/skills/vael-ui/references')

const componentMeta: Record<string, ComponentMetaEntry> = JSON.parse(
  readFileSync(join(DOCS_DIR, 'src/generated/component-meta.json'), 'utf8'),
)
const en = JSON.parse(readFileSync(join(DOCS_DIR, 'src/locales/en.json'), 'utf8'))
const descriptions: Record<string, string> = en.descriptions ?? {}

function mdEscape(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function rowsTable(rows: MetaRow[], cols: ('name' | 'type' | 'default' | 'description')[]): string {
  if (rows.length === 0) return '_None._\n'
  const header = cols.map((c) => c[0].toUpperCase() + c.slice(1)).join(' | ')
  const sep = cols.map(() => '---').join(' | ')
  const lines = rows.map((r) =>
    cols
      .map((c) => {
        const v = r[c]
        if (c === 'name' || c === 'type') return v ? `\`${mdEscape(String(v))}\`` : ''
        return v ? mdEscape(String(v)) : ''
      })
      .join(' | '),
  )
  return [`${header}`, sep, ...lines].join('\n') + '\n'
}

function componentMarkdown(name: string): string {
  const meta = componentMeta[name]
  const desc = descriptions[name]
  const lines: string[] = [`# ${name}`, '']
  if (desc) lines.push(desc, '')
  lines.push(`\`\`\`ts\nimport { ${name} } from 'vael-ui' // or 'vael-ui/vapor'\n\`\`\``, '')
  if (!meta) {
    lines.push('_No component-level API (documented on its parent component’s page)._')
    return lines.join('\n')
  }
  lines.push('## Props', '', rowsTable(meta.props, ['name', 'type', 'default', 'description']))
  lines.push('## Slots', '', rowsTable(meta.slots, ['name', 'type', 'description']))
  lines.push('## Events', '', rowsTable(meta.events, ['name', 'type', 'description']))
  lines.push('## Exposed', '', rowsTable(meta.exposed, ['name', 'type', 'description']))
  return lines.join('\n')
}

function composableMarkdown(name: string): string {
  const c = composablesContent[name]
  const lines: string[] = [`# ${name}`, '']
  if (!c) return lines.concat('_No documented entry._').join('\n')
  lines.push(c.description, '')
  if (c.exampleCode) lines.push('## Example', '', '```ts', c.exampleCode, '```', '')
  lines.push('## Parameters', '', rowsTable(c.params as MetaRow[], ['name', 'type', 'description']))
  lines.push('## Returns', '', rowsTable(c.returns as MetaRow[], ['name', 'type', 'description']))
  return lines.join('\n')
}

// --- Components ---
const compDir = join(OUT_DIR, 'docs')
mkdirSync(compDir, { recursive: true })
const indexLines: string[] = ['# Component reference index', '']
for (const cat of categories) {
  indexLines.push(`## ${cat.name}`, '')
  for (const name of cat.components) {
    const desc = descriptions[name] ?? ''
    indexLines.push(`- [${name}](./${name}.md)${desc ? `: ${desc}` : ''}`)
    writeFileSync(join(compDir, `${name}.md`), componentMarkdown(name) + '\n')
  }
  indexLines.push('')
}
writeFileSync(join(compDir, '_INDEX.md'), indexLines.join('\n'))

// --- Composables ---
const compsDir = join(OUT_DIR, 'composables')
mkdirSync(compsDir, { recursive: true })
const compsIndexLines: string[] = ['# Composable reference index', '']
for (const cat of composableCategories) {
  compsIndexLines.push(`## ${cat.name}`, '')
  for (const name of cat.items) {
    const desc = composablesContent[name]?.description?.split('. ')[0] ?? ''
    compsIndexLines.push(`- [${name}](./${name}.md)${desc ? `: ${desc}.` : ''}`)
    writeFileSync(join(compsDir, `${name}.md`), composableMarkdown(name) + '\n')
  }
  compsIndexLines.push('')
}
writeFileSync(join(compsDir, '_INDEX.md'), compsIndexLines.join('\n'))

console.log(
  `Generated ${categories.flatMap((c) => c.components).length} component docs and ${composableCategories.flatMap((c) => c.items).length} composable docs into ${OUT_DIR}`,
)
