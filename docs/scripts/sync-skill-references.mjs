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
import { RELATED, meta, motionSection, sections } from './api-markdown.mjs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const skillsRepo = resolve(process.argv[2] ?? join(__dirname, '../../../vael-ui-skills'))
const REFS_DIR = join(skillsRepo, 'skills/vael-ui/references/docs')

if (!existsSync(REFS_DIR)) {
  console.error(`No references folder at ${REFS_DIR}`)
  process.exit(1)
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
  let out = `${header}${sections(entry, 2)}${motionSection(name, 2)}`
  for (const child of RELATED[name] ?? []) {
    if (meta[child]) out += `\n## ${child}\n\n${sections(meta[child], 3)}`
  }
  // Keep the file's existing trailing whitespace so regeneration only diffs content.
  out = (out.trimEnd() + (source.match(/\s*$/)?.[0] || '\n')).replace(/[ \t]+$/gm, '')
  if (out !== source) {
    writeFileSync(path, out)
    written++
  }
}

console.log(`updated ${written} reference file(s) in ${REFS_DIR}`)
if (missing.length) console.warn(`no metadata for: ${missing.join(', ')}`)
