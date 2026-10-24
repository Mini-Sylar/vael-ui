#!/usr/bin/env node
// Copies docs/src/demos/*.vue (hand-authored documentation examples) into
// docs/src/generated/vdom-demos, and produces a Vapor twin of each eligible
// one in docs/src/generated/vapor-demos — same two transforms
// packages/scripts/generate-vapor.mjs already proves out: inject a bare
// `vapor` attribute on <script setup>, and repoint imports from 'vael-ui'
// to 'vael-ui/vapor'.
//
// A component's demos live either as a single legacy `{Component}Demo.vue`
// file (still one example, whatever it contains), or — once migrated — as a
// `{Component}/` folder holding one file per example. Both are read into the
// same manifest shape so ComponentPage.vue never needs to know which one it's
// looking at.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { allComponents } from '../src/taxonomy.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEMOS_DIR = join(__dirname, '../src/demos')
const VAPOR_DTS_PATH = join(__dirname, '../../packages/ui/dist/vapor/index.d.ts')
const OUT_VDOM_DIR = join(__dirname, '../src/generated/vdom-demos')
const OUT_VAPOR_DIR = join(__dirname, '../src/generated/vapor-demos')
const MANIFEST_PATH = join(__dirname, '../src/generated/demo-manifest.json')

// Rewriting unchanged files would make the docs dev server reload, and deleting the output
// folders first breaks a typecheck running at the same moment. So only changed files are
// written, and only files no longer produced are removed.
const written = new Set()
function writeIfChanged(path, content) {
  written.add(path)
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}
function removeStale(dir) {
  for (const entry of readdirSync(dir, { recursive: true })) {
    const path = join(dir, String(entry))
    if (statSync(path).isFile() && !written.has(path)) rmSync(path)
  }
}

// Reads the real, built Vapor export list rather than any script's source
// list, so a component missing from the actual dist/vapor build (not just
// from generate-vapor.mjs's COMPONENTS array) is caught here too. Every value
// export counts, not only components: confirmAction, for one, has its own
// Vapor build, and the classic one leaves a Vapor DialogHost with no buttons.
function readVaporExportNames() {
  const dts = readFileSync(VAPOR_DTS_PATH, 'utf8')
  const names = new Set()
  // tsdown emits `export { ... } from '../index'` lines; `export type` ones carry no values.
  for (const block of dts.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const raw of block[1].split(',')) {
      const trimmed = raw.trim()
      if (!trimmed || trimmed.startsWith('type ')) continue
      const asMatch = trimmed.match(/\bas\s+(\S+)/)
      names.add(asMatch ? asMatch[1] : trimmed)
    }
  }
  if (names.size === 0) throw new Error(`couldn't parse ${VAPOR_DTS_PATH}`)
  return names
}

// A handful of components use a legacy demo file not named after them (e.g.
// Avatar uses AvatarBadgeDemo). A component's own folder always wins. Column and
// AccordionItem aren't listed here at all now — they're documented on their
// parent's page (see taxonomy.ts), not routed as their own component page.
const DEMO_OVERRIDES = {
  Avatar: 'AvatarBadgeDemo',
}

// Components that share another component's demo folder (Radio can't render outside a
// RadioGroup, so both pages show the same examples).
const FOLDER_ALIASES = {
  RadioGroup: 'Radio',
}

// Integrations not yet proven under Vapor — skip the twin, keep the VDOM demo.
const VAPOR_INELIGIBLE_IMPORTS = ['vue-router', 'vee-validate']

function legacyDemoNameFor(component) {
  const override = DEMO_OVERRIDES[component]
  if (override) return override
  const guess = `${component}Demo`
  return existsSync(join(DEMOS_DIR, `${guess}.vue`)) ? guess : null
}

function findLocalPartials(source) {
  const ids = new Set()
  const re = /from\s+'(\.\/[^']+)\.vue'/g
  let match
  while ((match = re.exec(source))) ids.add(match[1].replace(/^\.\//, ''))
  return ids
}

function usesIneligibleIntegration(sources) {
  return sources.some((source) =>
    VAPOR_INELIGIBLE_IMPORTS.some((pkg) => source.includes(`'${pkg}'`)),
  )
}

// A PascalCase name imported from 'vael-ui' not in the real built Vapor
// export list means this demo genuinely can't run under Vapor yet — not a
// script limitation, a real gap in the library's own Vapor build.
function findMissingVaporComponents(sources, vaporExportNames) {
  const missing = new Set()
  const importRe = /^import\s+\{([^}]+)\}\s+from\s+['"]vael-ui['"];?$/gm
  for (const source of sources) {
    let match
    while ((match = importRe.exec(source))) {
      for (const raw of match[1]
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)) {
        if (/^[A-Z]/.test(raw) && !vaporExportNames.has(raw)) missing.add(raw)
      }
    }
  }
  return missing
}

function injectVaporMarker(source) {
  const scriptSetupRe = /^<script\s+setup((?:[^>"]|"[^"]*")*)>/m
  const match = source.match(scriptSetupRe)
  if (!match) return source // no <script setup> (e.g. a plain partial with only <script lang="ts">)
  if (/\bvapor\b/.test(match[1])) return source
  return source.replace(scriptSetupRe, (full, attrs) => `<script setup${attrs} vapor>`)
}

// Volar's vapor-mode template checker always validates a v-x binding against
// the classic (el, DirectiveBinding<T>) overload, never v-draggable's actual
// getter-based Vapor overload — so a non-primitive value errors there even
// though it's correct at runtime. See skill.md's "Known toolchain gaps".
function suppressKnownVaporDirectiveGaps(source) {
  // Matches a whole opening tag, however its attributes wrap across lines —
  // a formatter is free to rewrap `v-draggable=` onto its own line at any
  // point, so this can't assume it shares a line with the tag start. The
  // comment always precedes the TAG START, never sits between attributes
  // (an HTML comment mid-attribute-list is invalid markup).
  return source.replace(/^(\s*)(<[a-zA-Z][a-zA-Z0-9]*\b[\s\S]*?>)/gm, (full, indent, tag) => {
    if (!/\sv-draggable=/.test(tag)) return full
    return `${indent}<!-- @vue-expect-error known Volar vapor-directive typecheck gap, see generate-doc-demos.mjs -->\n${full}`
  })
}

// Every name the Vapor build exports moves to 'vael-ui/vapor', as the guide
// tells users to do. Shared composables resolve to the same files either way,
// and `import type` lines are untouched: vapor's .d.ts re-exports the same types.
function rewriteToVapor(source, vaporExportNames) {
  const importRe = /^import\s+\{([^}]+)\}\s+from\s+['"]vael-ui['"];?$/gm
  return source.replace(importRe, (full, namedClause) => {
    const names = namedClause
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    const vaporNames = names.filter((n) => vaporExportNames.has(n))
    const stayNames = names.filter((n) => !vaporExportNames.has(n))
    const lines = []
    if (vaporNames.length > 0)
      lines.push(`import { ${vaporNames.join(', ')} } from 'vael-ui/vapor'`)
    if (stayNames.length > 0) lines.push(`import { ${stayNames.join(', ')} } from 'vael-ui'`)
    return lines.join('\n')
  })
}

// The example's own <h3> is its title — same convention every demo file
// already follows, just read instead of only stripped.
function extractTitle(source, fallback) {
  const match = source.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
  if (!match) return fallback
  return match[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

// `id` and every entry in `allIds` are paths relative to the generated root,
// without extension — "TreeDemo" for a legacy flat file, or
// "Sortable/DragToReorder" for a migrated one. Fully self-describing, so
// nothing here needs to know which shape produced them.
function emitExample(id, allIds, sourceFor, vaporExportNames, state) {
  const allSources = allIds.map((partId) => sourceFor(partId))
  const missingComponents = findMissingVaporComponents(allSources, vaporExportNames)
  const eligible = !usesIneligibleIntegration(allSources) && missingComponents.size === 0
  for (const m of missingComponents) state.vaporGaps.add(m)

  allIds.forEach((partId, index) => {
    const parts = partId.split('/')
    const partFile = parts.at(-1)
    const partDir = parts.slice(0, -1).join('/')
    const source = allSources[index]
    if (!state.copiedVdom.has(partId)) {
      writeIfChanged(join(OUT_VDOM_DIR, partDir, `${partFile}.vue`), source)
      state.copiedVdom.add(partId)
    }
    if (eligible && !state.copiedVapor.has(partId)) {
      const vaporSource = suppressKnownVaporDirectiveGaps(
        rewriteToVapor(injectVaporMarker(source), vaporExportNames),
      )
      writeIfChanged(join(OUT_VAPOR_DIR, partDir, `${partFile}.vue`), vaporSource)
      state.copiedVapor.add(partId)
    }
  })

  return { id, title: extractTitle(sourceFor(id), id.split('/').at(-1)), vaporEligible: eligible }
}

// A migrated component: docs/src/demos/{component}/*.vue, one file per
// example. Partial files (a plain child component an example imports, no
// example content of their own) are found by scanning every file's own
// relative imports first, then excluded from the example list.
function processFolder(component, folderPath, vaporExportNames, state) {
  const files = readdirSync(folderPath).filter((f) => f.endsWith('.vue'))
  const sourceById = new Map(
    files.map((f) => [f.replace(/\.vue$/, ''), readFileSync(join(folderPath, f), 'utf8')]),
  )
  const referenced = new Set()
  for (const source of sourceById.values()) {
    for (const partial of findLocalPartials(source)) referenced.add(partial)
  }
  const exampleIds = [...sourceById.keys()].filter((id) => !referenced.has(id))

  // `emitExample` deals only in component-prefixed ids ("Sortable/Foo"), so
  // this strips the prefix back off before looking the bare filename up.
  const sourceFor = (id) => {
    const bareId = id.slice(component.length + 1)
    return sourceById.get(bareId) ?? readFileSync(join(folderPath, `${bareId}.vue`), 'utf8')
  }
  return exampleIds.map((exampleId) => {
    const allIds = [exampleId, ...findLocalPartials(sourceById.get(exampleId))].map(
      (id) => `${component}/${id}`,
    )
    return emitExample(`${component}/${exampleId}`, allIds, sourceFor, vaporExportNames, state)
  })
}

// A not-yet-migrated component: one legacy `{name}Demo.vue` file, its whole
// content treated as a single example — unchanged behavior from before
// per-example splitting existed.
function processLegacy(demoName, vaporExportNames, state) {
  const sourceFor = (id) => readFileSync(join(DEMOS_DIR, `${id}.vue`), 'utf8')
  const partials = [...findLocalPartials(sourceFor(demoName))]
  const allIds = [demoName, ...partials]
  return emitExample(demoName, allIds, sourceFor, vaporExportNames, state)
}

function main() {
  const vaporExportNames = readVaporExportNames()

  mkdirSync(OUT_VDOM_DIR, { recursive: true })
  mkdirSync(OUT_VAPOR_DIR, { recursive: true })

  const manifest = {}
  const state = { copiedVdom: new Set(), copiedVapor: new Set(), vaporGaps: new Set() }

  for (const component of allComponents) {
    const folderPath = join(DEMOS_DIR, FOLDER_ALIASES[component] ?? component)
    if (existsSync(folderPath) && statSync(folderPath).isDirectory()) {
      const examples = processFolder(component, folderPath, vaporExportNames, state)
      manifest[component] = { examples }
      console.log(`${component} -> ${examples.length} example(s) in ${component}/`)
      continue
    }

    const demoName = legacyDemoNameFor(component)
    if (!demoName) {
      manifest[component] = { examples: [] }
      console.log(`(no demo) ${component}`)
      continue
    }
    const example = processLegacy(demoName, vaporExportNames, state)
    manifest[component] = { examples: [example] }
    console.log(`${component} -> ${demoName}${example.vaporEligible ? '' : ' (VDOM only)'}`)
  }

  removeStale(OUT_VDOM_DIR)
  removeStale(OUT_VAPOR_DIR)
  writeIfChanged(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
  console.log(
    `\nwrote docs/src/generated/demo-manifest.json (${allComponents.length} component(s))`,
  )
  if (state.vaporGaps.size > 0) {
    console.log(
      `\nnote: ${[...state.vaporGaps].join(', ')} ${state.vaporGaps.size === 1 ? 'is' : 'are'} used in a demo but not exported from vael-ui/vapor's actual build — those demos stayed VDOM-only.`,
    )
  }
}

main()
