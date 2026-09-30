#!/usr/bin/env node
// Regenerates the vael-ui-skills component references
// (skills/vael-ui/references/docs/<Name>.md) from the same extracted metadata
// the docs site's API tables use, so the agent skill stays in step with the
// library. Each file keeps its hand-written header (title, summary, import);
// only the Props/Slots/Events/Exposed tables below it are rewritten.
//
// Usage: node scripts/sync-skill-references.mjs [path/to/vael-ui-skills]
// Run `pnpm gen` (or extract-component-meta.mjs) first.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const META_PATH = join(__dirname, '../src/generated/component-meta.json')
const skillsRepo = resolve(process.argv[2] ?? join(__dirname, '../../../vael-ui-skills'))
const REFS_DIR = join(skillsRepo, 'skills/vael-ui/references/docs')

// Same parent/child grouping as the docs site's ComponentPage `RELATED`.
const RELATED = {
  DataTable: ['Column'],
  Accordion: ['AccordionItem'],
  Breadcrumb: ['BreadcrumbItem', 'BreadcrumbSeparator'],
}

if (!existsSync(REFS_DIR)) {
  console.error(`No references folder at ${REFS_DIR}`)
  process.exit(1)
}
const meta = JSON.parse(readFileSync(META_PATH, 'utf8'))

const cell = (text) =>
  (text ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\|/g, '\\|')
    .trim()
const code = (text) => (text ? `\`${cell(text)}\`` : '')

function table(rows, { withDefault = false } = {}) {
  if (rows.length === 0) return '_None._\n'
  const head = withDefault
    ? 'Name | Type | Default | Description\n--- | --- | --- | ---'
    : 'Name | Type | Description\n--- | --- | ---'
  const body = rows.map((row) => {
    const text = row.defaultText ?? row.default
    const defaultValue = text && text !== 'undefined' ? code(text) : ''
    return withDefault
      ? `${code(row.name)} | ${code(row.type)} | ${defaultValue} | ${cell(row.description)}`
      : `${code(row.name)} | ${code(row.type)} | ${cell(row.description)}`
  })
  return `${head}\n${body.join('\n')}\n`
}

function sections(entry, level) {
  const h = '#'.repeat(level)
  return [
    `${h} Props\n\n${table(entry.props, { withDefault: true })}`,
    `${h} Slots\n\n${table(entry.slots)}`,
    `${h} Events\n\n${table(entry.events)}`,
    `${h} Exposed\n\n${table(entry.exposed)}`,
  ].join('\n')
}

let written = 0
const missing = []
for (const file of readdirSync(REFS_DIR)) {
  if (!file.endsWith('.md') || file.startsWith('_')) continue
  const name = file.slice(0, -3)
  const entry = meta[name]
  if (!entry) {
    missing.push(name)
    continue
  }
  const path = join(REFS_DIR, file)
  const source = readFileSync(path, 'utf8')
  const headerEnd = source.indexOf('\n## Props')
  const header = headerEnd === -1 ? `# ${name}\n` : source.slice(0, headerEnd + 1)
  let out = `${header}${sections(entry, 2)}`
  for (const child of RELATED[name] ?? []) {
    if (meta[child]) out += `\n## ${child}\n\n${sections(meta[child], 3)}`
  }
  // Keep the file's existing trailing whitespace so regeneration only diffs content.
  out = out.trimEnd() + (source.match(/\s*$/)?.[0] || '\n')
  if (out !== source) {
    writeFileSync(path, out)
    written++
  }
}

console.log(`updated ${written} reference file(s) in ${REFS_DIR}`)
if (missing.length) console.warn(`no metadata for: ${missing.join(', ')}`)
