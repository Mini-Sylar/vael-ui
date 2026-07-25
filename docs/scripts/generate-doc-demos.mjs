#!/usr/bin/env node
// Copies playground/vdom/src/demos/*.vue (the library's existing, working
// example set) into docs/src/generated/vdom-demos, and produces a Vapor
// twin of each eligible one in docs/src/generated/vapor-demos — same two
// transforms packages/scripts/generate-vapor.mjs already proves out:
// inject a bare `vapor` attribute on <script setup>, and repoint imports
// from 'vael-ui' to 'vael-ui/vapor'. Nothing here is hand-authored prose;
// it's the same demos playground/vdom already exercises.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { allComponents } from '../src/taxonomy.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEMOS_DIR = join(__dirname, '../../playground/vdom/src/demos')
const VAPOR_DTS_PATH = join(__dirname, '../../packages/ui/dist/vapor/index.d.ts')
const OUT_VDOM_DIR = join(__dirname, '../src/generated/vdom-demos')
const OUT_VAPOR_DIR = join(__dirname, '../src/generated/vapor-demos')
const MANIFEST_PATH = join(__dirname, '../src/generated/demo-manifest.json')

// Reads the real, built Vapor export list rather than any script's source
// list, so a component missing from the actual dist/vapor build (not just
// from generate-vapor.mjs's COMPONENTS array) is caught here too.
function readVaporComponentNames() {
  const dts = readFileSync(VAPOR_DTS_PATH, 'utf8')
  const firstExport = dts.match(/^export\s*\{([^}]+)\}\s*from/m)
  if (!firstExport) throw new Error(`couldn't parse ${VAPOR_DTS_PATH}`)
  const names = new Set()
  for (const raw of firstExport[1].split(',')) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const asMatch = trimmed.match(/\bas\s+(\S+)/)
    names.add(asMatch ? asMatch[1] : trimmed)
  }
  return names
}

// A handful of components share a demo file rather than having their own
// (e.g. Pagination/Tag only ever appear inside DataTableDemo). Column and
// AccordionItem aren't listed here at all now — they're documented on their
// parent's page (see taxonomy.ts), not routed as their own component page.
const DEMO_OVERRIDES = {
  Pagination: 'DataTableDemo',
  Tag: 'DataTableDemo',
  Checkbox: 'ToggleDemo',
  Switch: 'ToggleDemo',
  Avatar: 'AvatarBadgeDemo',
  Badge: 'AvatarBadgeDemo',
  Radio: 'RadioGroupDemo',
  Toaster: 'ToastDemo',
}

// Integrations not yet proven under Vapor — skip the twin, keep the VDOM demo.
const VAPOR_INELIGIBLE_IMPORTS = ['vue-router', 'vee-validate']

function demoNameFor(component) {
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
  return sources.some((source) => VAPOR_INELIGIBLE_IMPORTS.some((pkg) => source.includes(`'${pkg}'`)))
}

// A PascalCase name imported from 'vael-ui' not in the real built Vapor
// export list means this demo genuinely can't run under Vapor yet — not a
// script limitation, a real gap in the library's own Vapor build.
function findMissingVaporComponents(sources, vaporComponentNames) {
  const missing = new Set()
  const importRe = /^import\s+\{([^}]+)\}\s+from\s+'vael-ui'$/gm
  for (const source of sources) {
    let match
    while ((match = importRe.exec(source))) {
      for (const raw of match[1].split(',').map((n) => n.trim()).filter(Boolean)) {
        if (/^[A-Z]/.test(raw) && !vaporComponentNames.has(raw)) missing.add(raw)
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

// Only PascalCase names that are real Vapor components move to
// 'vael-ui/vapor'; composables/functions (openDialog, useTabIndicator,
// toast, ...) aren't Vapor/VDOM-specific and stay on 'vael-ui'. `import
// type` lines are untouched — vapor's .d.ts re-exports the same types.
function rewriteToVapor(source, vaporComponentNames) {
  const importRe = /^import\s+\{([^}]+)\}\s+from\s+'vael-ui'$/gm
  return source.replace(importRe, (full, namedClause) => {
    const names = namedClause.split(',').map((n) => n.trim()).filter(Boolean)
    const vaporNames = names.filter((n) => vaporComponentNames.has(n))
    const stayNames = names.filter((n) => !vaporComponentNames.has(n))
    const lines = []
    if (vaporNames.length > 0) lines.push(`import { ${vaporNames.join(', ')} } from 'vael-ui/vapor'`)
    if (stayNames.length > 0) lines.push(`import { ${stayNames.join(', ')} } from 'vael-ui'`)
    return lines.join('\n')
  })
}

function main() {
  const vaporComponentNames = readVaporComponentNames()

  rmSync(OUT_VDOM_DIR, { recursive: true, force: true })
  rmSync(OUT_VAPOR_DIR, { recursive: true, force: true })
  mkdirSync(OUT_VDOM_DIR, { recursive: true })
  mkdirSync(OUT_VAPOR_DIR, { recursive: true })

  const manifest = {}
  const copiedVdom = new Set()
  const copiedVapor = new Set()
  const vaporGaps = new Set()

  for (const component of allComponents) {
    const demoName = demoNameFor(component)
    if (!demoName) {
      manifest[component] = { demo: null, vaporEligible: false }
      console.log(`(no demo) ${component}`)
      continue
    }

    const mainSource = readFileSync(join(DEMOS_DIR, `${demoName}.vue`), 'utf8')
    const partials = [...findLocalPartials(mainSource)]
    const allIds = [demoName, ...partials]
    const allSources = allIds.map((id) => readFileSync(join(DEMOS_DIR, `${id}.vue`), 'utf8'))
    const missingComponents = findMissingVaporComponents(allSources, vaporComponentNames)
    const eligible = !usesIneligibleIntegration(allSources) && missingComponents.size === 0
    for (const m of missingComponents) vaporGaps.add(m)

    for (const id of allIds) {
      if (!copiedVdom.has(id)) {
        const source = readFileSync(join(DEMOS_DIR, `${id}.vue`), 'utf8')
        writeFileSync(join(OUT_VDOM_DIR, `${id}.vue`), source)
        copiedVdom.add(id)
      }
      if (eligible && !copiedVapor.has(id)) {
        const source = readFileSync(join(DEMOS_DIR, `${id}.vue`), 'utf8')
        const vaporSource = rewriteToVapor(injectVaporMarker(source), vaporComponentNames)
        writeFileSync(join(OUT_VAPOR_DIR, `${id}.vue`), vaporSource)
        copiedVapor.add(id)
      }
    }

    manifest[component] = { demo: demoName, vaporEligible: eligible }
    console.log(`${component} -> ${demoName}${eligible ? '' : ' (VDOM only)'}`)
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nwrote docs/src/generated/demo-manifest.json (${allComponents.length} component(s))`)
  if (vaporGaps.size > 0) {
    console.log(
      `\nnote: ${[...vaporGaps].join(', ')} ${vaporGaps.size === 1 ? 'is' : 'are'} used in a demo but not exported from vael-ui/vapor's actual build — those demos stayed VDOM-only.`,
    )
  }
}

main()
