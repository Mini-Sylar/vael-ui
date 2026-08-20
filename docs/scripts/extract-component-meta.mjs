#!/usr/bin/env node
// Statically extracts props/events/slots/exposed for every public component
// straight from packages/ui/src/components/*.vue via vue-component-meta, so
// the docs site's API tables can never drift from the real source.

import { createChecker } from 'vue-component-meta'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TSCONFIG_PATH = join(__dirname, '../../packages/ui/tsconfig.json')
const UI_INDEX_PATH = join(__dirname, '../../packages/ui/src/index.ts')
const UI_COMPONENTS_DIR = join(__dirname, '../../packages/ui/src/components')
const OUT_PATH = join(__dirname, '../src/generated/component-meta.json')

function collectPublicComponents(indexSource) {
  const names = []
  const re = /export\s*\{\s*default\s+as\s+(\w+)[^}]*\}\s*from\s*'\.\/components\/([^']+)\.vue'/g
  let match
  while ((match = re.exec(indexSource))) {
    names.push({ exportName: match[1], relativePath: match[2] })
  }
  return names
}

// Keeps exactly one level of nesting — enough for the playground's control
// inference (an enum's own members) — and no more. Recursive generic types
// in this codebase (MenuEntry's nested `items`, TreeNode, ...) expand to
// unbounded depth under `schema: true` otherwise, which blew JSON.stringify
// past Node's max string length on the very first attempt.
function shallowSchema(schema, depth = 0) {
  if (typeof schema !== 'object' || schema === null) return schema
  if (depth >= 1) return schema.type ?? null
  return {
    kind: schema.kind,
    type: schema.type,
    schema: Array.isArray(schema.schema) ? schema.schema.map((s) => shallowSchema(s, depth + 1)) : undefined,
  }
}

function toPlainProp(prop) {
  return {
    name: prop.name,
    description: prop.description,
    type: prop.type,
    default: prop.default,
    required: prop.required,
    global: prop.global,
    schema: shallowSchema(prop.schema),
  }
}

function toPlainEventOrSlot(entry) {
  return {
    name: entry.name,
    description: entry.description,
    type: entry.type,
  }
}

// vue-component-meta can't resolve `defineExpose()` on a generic
// (`<script setup generic="T">`) component — it silently returns an empty
// `exposed` array even when the component genuinely exposes real refs (open
// upstream bug, same failure mode as vuejs/language-tools#3429). Falls back
// to reading the defineExpose({...}) call's own key names straight from
// source when that happens — no type info, but real names beat an empty
// table.
function fallbackExposedNames(source) {
  const callIndex = source.indexOf('defineExpose(')
  if (callIndex === -1) return []
  const braceStart = source.indexOf('{', callIndex)
  if (braceStart === -1) return []

  let depth = 0
  let i = braceStart
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) break
  }
  // Strips block/line comments (a JSDoc note above an entry, e.g.) so they
  // don't get swept into the next comma-split entry and fail the identifier
  // check below.
  const body = source
    .slice(braceStart + 1, i)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

  const entries = []
  let entryStart = 0
  let braceDepth = 0
  let parenDepth = 0
  for (let j = 0; j <= body.length; j++) {
    const ch = body[j]
    if (ch === '{') braceDepth++
    else if (ch === '}') braceDepth--
    else if (ch === '(') parenDepth++
    else if (ch === ')') parenDepth--
    if ((ch === ',' && braceDepth === 0 && parenDepth === 0) || j === body.length) {
      entries.push(body.slice(entryStart, j))
      entryStart = j + 1
    }
  }

  return entries
    .map((e) => e.split(':')[0].trim())
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name))
}

function main() {
  const indexSource = readFileSync(UI_INDEX_PATH, 'utf8')
  const components = collectPublicComponents(indexSource)

  const checker = createChecker(TSCONFIG_PATH, { schema: true })
  const meta = {}
  const errors = []

  for (const { exportName, relativePath } of components) {
    try {
      const filePath = join(UI_COMPONENTS_DIR, `${relativePath}.vue`)
      const componentMeta = checker.getComponentMeta(filePath)
      let exposed = componentMeta.exposed.map(toPlainEventOrSlot)
      if (exposed.length === 0) {
        const source = readFileSync(filePath, 'utf8')
        exposed = fallbackExposedNames(source).map((name) => ({
          name,
          type: 'unknown',
          description:
            'Type inference unavailable — vue-component-meta cannot resolve defineExpose on this generic component.',
        }))
      }
      meta[exportName] = {
        props: componentMeta.props.filter((p) => !p.global).map(toPlainProp),
        events: componentMeta.events.map(toPlainEventOrSlot),
        slots: componentMeta.slots.map(toPlainEventOrSlot),
        exposed,
      }
      console.log(`extracted ${exportName}`)
    } catch (err) {
      errors.push(`${exportName}: ${err.message}`)
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} component(s) failed:\n`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exitCode = 1
    return
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(meta, null, 2) + '\n')
  console.log(`\nwrote docs/src/generated/component-meta.json (${components.length} component(s))`)
}

main()
