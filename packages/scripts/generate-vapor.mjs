#!/usr/bin/env node
// Generates vapor-ui/src/generated/*.vue from ui/src/components/ (add name to COMPONENTS, run pnpm build)

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UI_COMPONENTS_DIR = join(__dirname, '../ui/src/components')
const UI_INDEX_PATH = join(__dirname, '../ui/src/index.ts')
const OUT_DIR = join(__dirname, '../vapor-ui/src/generated')

// Add component name to include in vapor build (dependencies auto-added)
const COMPONENTS = [
  'Accordion',
  'AccordionItem',
  'Avatar',
  'Badge',
  'BottomSheet',
  'Button',
  'ButtonGroup',
  'Calendar',
  'Card',
  'CascadeSelect',
  'Checkbox',
  'Chip',
  'Collapsible',
  'Column',
  'Combobox',
  'ConfigProvider',
  'ContextMenu',
  'DataTable',
  'DatePicker',
  'Dial',
  'Dialog',
  'DialogHost',
  'Dock',
  'Drawer',
  'Field',
  'FileUpload',
  'Input',
  'InputNumber',
  'Kbd',
  'Knob',
  'Loader',
  'Menu',
  'MenuList',
  'Message',
  'OtpInput',
  'Pagination',
  'Popover',
  'PopoverHost',
  'Progress',
  'PullToRefresh',
  'Radio',
  'RadioGroup',
  'Resizable',
  'Select',
  'SelectButton',
  'Separator',
  'Skeleton',
  'Slider',
  'SpeedDial',
  'SplitButton',
  'SwipeToReveal',
  'Switch',
  'Tabs',
  'Tag',
  'Textarea',
  'Toaster',
  'Toolbar',
  'Tooltip',
  'TooltipHost',
  'Tree',
  'TreeSelect',
]

// Some components have migrated from a flat `<Name>.vue` to a folder
// (`<Name>/<Name>.vue`, CSS split out per-component — see
// components/Button/, ButtonGroup/, Loader/, PullToRefresh/). Resolves a
// bare requested name to whichever layout actually exists on disk, so this
// script keeps working through an incremental, component-by-component
// migration rather than needing every component moved at once.
function resolveModuleId(name) {
  if (existsSync(join(UI_COMPONENTS_DIR, name, `${name}.vue`))) return `${name}/${name}`
  return name
}

// Base names the script can rewrite to vael-ui, regardless of how many
// '../' precede them — internal/*.vue components sit one directory deeper
// than top-level components, so their imports are '../../composables/...'
// rather than '../composables/...'.
const REWRITABLE_BASENAMES = ['composables/', 'classes', 'theme', 'messages', 'directives/', 'ssr']

function isRewritable(specifier) {
  const stripped = specifier.replace(/^(\.\.\/)+/, '')
  return REWRITABLE_BASENAMES.some((base) => stripped.startsWith(base))
}

function collectPublicExports(indexSource) {
  const names = new Set()
  const re = /export\s+(?:type\s+)?\{([^}]+)\}\s+from/g
  let match
  while ((match = re.exec(indexSource))) {
    for (const raw of match[1].split(',')) {
      const trimmed = raw.trim()
      if (!trimmed) continue
      // `a as b` exports local name b that import sites use
      const asMatch = trimmed.match(/\bas\s+(\S+)/)
      names.add(asMatch ? asMatch[1] : trimmed)
    }
  }
  return names
}

// Finds sibling .vue imports (not composables or third-party). `fromId` is
// the importing module's own id (e.g. 'Message/Message' or 'Select') so
// './' and '../' specifiers resolve against its real directory — a
// folder-nested component reaching a top-level internal/ helper writes
// '../internal/StatusIcon.vue', not './internal/StatusIcon.vue'.
function findSiblingModuleIds(source, fromId) {
  const ids = new Set()
  const re = /from\s+'(\.\.?\/[^']+)\.vue'/g
  const fromDir = dirname(fromId) // 'Message/Message' -> 'Message'; 'Select' -> '.'
  let match
  while ((match = re.exec(source))) {
    ids.add(join(fromDir, match[1])) // join() normalizes away the '../'
  }
  return ids
}

// BFS pulls in transitive deps so DataTable includes Button, Checkbox, etc.
function resolveDependencyGraph(requested) {
  const resolved = requested.map(resolveModuleId)
  const toGenerate = new Set(resolved)
  const queue = [...resolved]
  while (queue.length > 0) {
    const id = queue.shift()
    const source = readFileSync(join(UI_COMPONENTS_DIR, `${id}.vue`), 'utf8')
    for (const dep of findSiblingModuleIds(source, id)) {
      if (!toGenerate.has(dep)) {
        toGenerate.add(dep)
        queue.push(dep)
      }
    }
  }
  return toGenerate
}

// Vapor never bundles its own CSS — the same class names are styled by
// whatever vael-ui stylesheet(s) the consumer already loads (style.css
// today, or a component's own split CSS chunk once migrated). The relative
// `.css` side-effect imports that drive that splitting on the vdom side
// have nothing to resolve to inside vapor-ui/src/generated, so strip them.
function stripCssImports(source) {
  return source.replace(/^import\s+'\.[^']*\.css'\s*\n/gm, '')
}

function injectVaporMarker(source, moduleId) {
  // Regex skips quoted values & uses multiline anchor to avoid matching comment prose
  const scriptSetupRe = /^<script\s+setup((?:[^>"]|"[^"]*")*)>/m
  const match = source.match(scriptSetupRe)
  if (!match) {
    throw new Error(`${moduleId}: no <script setup> block found — can't mark it vapor.`)
  }
  if (/\bvapor\b/.test(match[1])) return source // already marked
  return source.replace(scriptSetupRe, (full, attrs) => `<script setup${attrs} vapor>`)
}

// Aliases vTooltip→vTooltipVapor so templates need no changes
const VAPOR_DIRECTIVE_ALIASES = {
  vTooltip: 'vTooltipVapor',
  vScrollMask: 'vScrollMaskVapor',
}

function rewriteImports(source, moduleId, publicExports) {
  const importLineRe = /^import\s+(type\s+)?\{([^}]+)\}\s+from\s+'([^']+)'\s*$/gm
  return source.replace(importLineRe, (full, typeOnly, namedClause, specifier) => {
    if (!isRewritable(specifier)) return full // 'vue', third-party, and sibling ./ imports: untouched

    const names = namedClause.split(',').map((n) => n.trim()).filter(Boolean)
    const localNames = names.map((n) => {
      const asMatch = n.match(/\bas\s+(\S+)/)
      return asMatch ? asMatch[1] : n.replace(/^type\s+/, '')
    })

    const rewrittenNames = names.map((n, i) => {
      const localName = localNames[i]
      const vaporName = VAPOR_DIRECTIVE_ALIASES[localName]
      return vaporName ? `${vaporName} as ${localName}` : n
    })
    const publicNames = rewrittenNames.map((n) => {
      const asMatch = n.match(/^(\S+)\s+as\s+/)
      return asMatch ? asMatch[1] : n.replace(/^type\s+/, '')
    })

    const missing = publicNames.filter((n) => !publicExports.has(n))
    if (missing.length > 0) {
      throw new Error(
        `${moduleId}: imports ${missing.join(', ')} from '${specifier}', which ${
          missing.length === 1 ? "isn't" : "aren't"
        } in vael-ui's public exports (src/index.ts). Export ${
          missing.length === 1 ? 'it' : 'them'
        } publicly first, or exclude this component from COMPONENTS in gen.mjs.`,
      )
    }
    return `import ${typeOnly ?? ''}{${rewrittenNames.join(', ')}} from 'vael-ui'`
  })
}

function main() {
  const indexSource = readFileSync(UI_INDEX_PATH, 'utf8')
  const publicExports = collectPublicExports(indexSource)
  const requestedModuleIds = new Set(COMPONENTS.map(resolveModuleId))
  const toGenerate = resolveDependencyGraph(COMPONENTS)

  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const errors = []
  for (const moduleId of toGenerate) {
    try {
      const srcPath = join(UI_COMPONENTS_DIR, `${moduleId}.vue`)
      let source = readFileSync(srcPath, 'utf8')
      source = stripCssImports(source)
      source = injectVaporMarker(source, moduleId)
      source = rewriteImports(source, moduleId, publicExports)
      const outPath = join(OUT_DIR, `${moduleId}.vue`)
      mkdirSync(dirname(outPath), { recursive: true }) // for internal/*.vue
      writeFileSync(outPath, source)
      const dep = requestedModuleIds.has(moduleId) ? '' : ' (dependency)'
      console.log(`generated src/generated/${moduleId}.vue${dep}`)
    } catch (err) {
      errors.push(err.message)
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} component(s) failed:\n`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exitCode = 1
    return
  }

  const barrelLines = COMPONENTS.flatMap((name) => {
    const moduleId = resolveModuleId(name)
    return [
      `export { default as ${name} } from './${moduleId}.vue'`,
      `export * from './${moduleId}.vue'`,
    ]
  })
  barrelLines.push(`export { vTooltipVapor as vTooltip, vScrollMaskVapor as vScrollMask } from 'vael-ui'`)
  writeFileSync(join(OUT_DIR, 'index.ts'), barrelLines.join('\n') + '\n')
  console.log(
    `\ngenerated src/generated/index.ts (${COMPONENTS.length} public component(s), ${toGenerate.size} file(s) total)`,
  )
}

main()
