#!/usr/bin/env node
// Generates vapor-ui/src/generated/*.vue from ui/src/components/ (add name to COMPONENTS, run pnpm build)

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'
import { COMPONENTS } from './component-names.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UI_SRC_DIR = join(__dirname, '../ui/src')
const UI_COMPONENTS_DIR = join(__dirname, '../ui/src/components')
const UI_INDEX_PATH = join(__dirname, '../ui/src/index.ts')
const OUT_DIR = join(__dirname, '../vapor-ui/src/generated')

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

// A component's own .vue file can export more than its default (e.g. Tree.vue's
// findTreeNode/findTreeParent/removeTreeNode, alongside `export default`). The
// barrel's `export * from './X.vue'` below is meant to carry those through, but
// tsdown's own bundling doesn't reliably resolve a wildcard re-export for plain
// function/const exports the way it does for the default — silently dropping
// them from the final dist barrel with no build error. Listing them explicitly
// here, the same way collectNonComponentExports already does for composables,
// is what actually makes them survive.
function collectComponentExtraExports(indexSource) {
  const byModuleId = new Map() // moduleId ('Tree/Tree') -> Set<name>
  const re = /export\s+\{([^}]+)\}\s+from\s+'\.\/components\/([^']+)\.vue'/g
  let match
  while ((match = re.exec(indexSource))) {
    const [, namedClause, moduleId] = match
    const names = new Set()
    for (const raw of namedClause.split(',')) {
      const trimmed = raw.trim()
      if (!trimmed || /^default(\s+as\s+\S+)?$/.test(trimmed)) continue
      const asMatch = trimmed.match(/\bas\s+(\S+)/)
      names.add(asMatch ? asMatch[1] : trimmed)
    }
    if (names.size > 0) byModuleId.set(moduleId, names)
  }
  return byModuleId
}

// Handled elsewhere: the vTooltip/vScrollMask alias lines and generateConfirmActionSource below.
const NON_COMPONENT_EXPORTS_EXCLUDED = new Set([
  'vTooltip',
  'vScrollMask',
  'vTooltipVapor',
  'vScrollMaskVapor',
  'vDraggable',
  'vDraggableVapor',
  'confirmAction',
])

// Grouped by specifier, not flattened to one 'vael-ui' re-export — that would be
// circular now that vael-ui's own root has a `vapor` condition pointing back here.
function collectNonComponentExports(indexSource) {
  const groups = new Map() // specifier -> { values: Set, types: Set }
  const re = /export\s+(type\s+)?\{([^}]+)\}\s+from\s+'([^']+)'/g
  let match
  while ((match = re.exec(indexSource))) {
    const [, typeOnly, namedClause, specifier] = match
    if (specifier.endsWith('.vue')) continue // component export, handled separately
    let group = groups.get(specifier)
    if (!group) {
      group = { values: new Set(), types: new Set() }
      groups.set(specifier, group)
    }
    for (const raw of namedClause.split(',')) {
      const trimmed = raw.trim()
      if (!trimmed) continue
      const isTypeMember = typeOnly || trimmed.startsWith('type ')
      const name = trimmed.replace(/^type\s+/, '')
      const asMatch = name.match(/\bas\s+(\S+)/)
      const exported = asMatch ? asMatch[1] : name
      if (NON_COMPONENT_EXPORTS_EXCLUDED.has(exported)) continue
      ;(isTypeMember ? group.types : group.values).add(exported)
    }
  }
  return groups
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

// Mirrors each CSS side-effect import into OUT_DIR (relative to
// UI_COMPONENTS_DIR, the same root OUT_DIR itself mirrors) and rewrites the
// import line to match, so vapor's build gets the exact same per-component
// CSS-splitting the vdom tsdown build already does. Works for sources
// outside UI_COMPONENTS_DIR too (e.g. directives/vScrollMask.ts, which
// reaches into components/shared/*.css) since the resolution is anchored to
// the CSS file's own absolute location, not the importing file's original
// directory.
function copyCssImports(source, origFileDir, outFileDir) {
  const importLineRe = /^import\s+'([^']+\.css)'\s*$/gm
  return source.replace(importLineRe, (_full, relPath) => {
    const absSrc = resolve(origFileDir, relPath)
    const mirroredRel = relative(UI_COMPONENTS_DIR, absSrc)
    const absOut = join(OUT_DIR, mirroredRel)
    mkdirSync(dirname(absOut), { recursive: true })
    copyFileSync(absSrc, absOut)
    let newRel = relative(outFileDir, absOut).split('\\').join('/')
    if (!newRel.startsWith('.')) newRel = `./${newRel}`
    return `import '${newRel}'`
  })
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
  vDraggable: 'vDraggableVapor',
}

function relativeImportPath(specifier, fromDir = '') {
  const targetPath = join(UI_SRC_DIR, specifier)
  let relPath = relative(join(OUT_DIR, fromDir), targetPath).split('\\').join('/')
  if (!relPath.startsWith('.')) relPath = `./${relPath}`
  return relPath
}

// Like relativeImportPath, but into an already-generated OUT_DIR file, not ui/src.
function pathToGenerated(specifier, fromDir) {
  let relPath = relative(join(OUT_DIR, fromDir), join(OUT_DIR, specifier)).split('\\').join('/')
  if (!relPath.startsWith('.')) relPath = `./${relPath}`
  return relPath
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

    // vTooltip/vScrollMask import their own file directly — the barrel only
    // exports them aliased (vTooltipVapor as vTooltip), not under the raw name.
    const fromDir = dirname(moduleId)
    const directiveLines = []
    const otherNames = []
    for (let i = 0; i < names.length; i++) {
      const localName = localNames[i]
      const vaporName = VAPOR_DIRECTIVE_ALIASES[localName]
      if (!vaporName) {
        otherNames.push(names[i])
        continue
      }
      const importPath =
        localName === 'vScrollMask'
          ? pathToGenerated('directives/vScrollMask', fromDir)
          : relativeImportPath('directives/vTooltip', fromDir)
      directiveLines.push(`import ${typeOnly ?? ''}{${vaporName} as ${localName}} from '${importPath}'`)
    }

    const missing = otherNames.filter((n) => !publicExports.has(n.replace(/^type\s+/, '')))
    if (missing.length > 0) {
      throw new Error(
        `${moduleId}: imports ${missing.join(', ')} from '${specifier}', which ${
          missing.length === 1 ? "isn't" : "aren't"
        } in vael-ui's public exports (src/index.ts). Export ${
          missing.length === 1 ? 'it' : 'them'
        } publicly first, or exclude this component from COMPONENTS in gen.mjs.`,
      )
    }

    const lines = [...directiveLines]
    if (otherNames.length > 0) {
      lines.push(`import ${typeOnly ?? ''}{${otherNames.join(', ')}} from 'vael-ui'`)
    }
    return lines.join('\n')
  })
}

// vScrollMask.ts has its own CSS import — same copy-and-rewrite components get.
function copyNonComponentSource(specifier) {
  const srcPath = join(UI_SRC_DIR, `${specifier}.ts`)
  const outPath = join(OUT_DIR, `${specifier}.ts`)
  const source = copyCssImports(readFileSync(srcPath, 'utf8'), dirname(srcPath), dirname(outPath))
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, source)
  return `./${specifier}`
}

// confirmAction.ts renders real components, so its .vue imports need the same
// rewriting a component would get — seeded into the dependency graph in main().
const CONFIRM_ACTION_VUE_DEPS = [
  'internal/ConfirmDialogFooter',
  'internal/ConfirmPopoverBody',
  'internal/ConfirmEmptyBody',
]

function generateConfirmActionSource(publicExports) {
  const source = readFileSync(join(UI_SRC_DIR, 'composables/confirmAction.ts'), 'utf8')
  const rewritten = source
    .replace(/'\.\.\/components\/Button\/Button\.vue'/g, `'../Button/Button.vue'`)
    .replace(/'\.\.\/components\/Dialog\/Dialog\.vue'/g, `'../Dialog/Dialog.vue'`)
    .replace(/'\.\.\/components\/Popover\/Popover\.vue'/g, `'../Popover/Popover.vue'`)
    .replace(
      /'\.\.\/components\/internal\/(Confirm\w+)\.vue'/g,
      (_full, name) => `'../internal/${name}.vue'`,
    )
    .replace(/from '\.\/useDialogService'/, `from '${relativeImportPath('composables/useDialogService', 'composables')}'`)
    .replace(/from '\.\/usePopoverService'/, `from '${relativeImportPath('composables/usePopoverService', 'composables')}'`)

  for (const name of ['Button', 'DialogProps', 'PopoverProps']) {
    if (!publicExports.has(name)) {
      throw new Error(`confirmAction.ts: '${name}' is no longer in vael-ui's public exports`)
    }
  }
  return rewritten
}

function main() {
  const indexSource = readFileSync(UI_INDEX_PATH, 'utf8')
  const publicExports = collectPublicExports(indexSource)
  const requestedModuleIds = new Set(COMPONENTS.map(resolveModuleId))
  const toGenerate = resolveDependencyGraph([...COMPONENTS, ...CONFIRM_ACTION_VUE_DEPS])

  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const errors = []
  for (const moduleId of toGenerate) {
    try {
      const srcPath = join(UI_COMPONENTS_DIR, `${moduleId}.vue`)
      let source = readFileSync(srcPath, 'utf8')
      const outPath = join(OUT_DIR, `${moduleId}.vue`)
      mkdirSync(dirname(outPath), { recursive: true }) // for internal/*.vue
      source = copyCssImports(source, dirname(srcPath), dirname(outPath))
      source = injectVaporMarker(source, moduleId)
      source = rewriteImports(source, moduleId, publicExports)
      writeFileSync(outPath, source)
      const dep = requestedModuleIds.has(moduleId) ? '' : ' (dependency)'
      console.log(`generated src/generated/${moduleId}.vue${dep}`)
    } catch (err) {
      errors.push(err.message)
    }
  }

  try {
    const confirmActionSource = generateConfirmActionSource(publicExports)
    const outPath = join(OUT_DIR, 'composables/confirmAction.ts')
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, confirmActionSource)
    console.log('generated src/generated/composables/confirmAction.ts')
  } catch (err) {
    errors.push(err.message)
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} component(s) failed:\n`)
    for (const message of errors) console.error(`  - ${message}`)
    process.exitCode = 1
    return
  }

  const extraComponentExports = collectComponentExtraExports(indexSource)
  const barrelLines = COMPONENTS.flatMap((name) => {
    const moduleId = resolveModuleId(name)
    const lines = [
      `export { default as ${name} } from './${moduleId}.vue'`,
      `export * from './${moduleId}.vue'`,
    ]
    const extra = extraComponentExports.get(moduleId)
    if (extra) lines.push(`export { ${[...extra].join(', ')} } from './${moduleId}.vue'`)
    return lines
  })
  barrelLines.push(
    `export { vTooltipVapor as vTooltip } from '${relativeImportPath('directives/vTooltip')}'`,
    `export { vScrollMaskVapor as vScrollMask } from '${copyNonComponentSource('directives/vScrollMask')}'`,
    // Referenced, not copied: unlike vScrollMask this pulls in useSortable, and
    // a copy into generated/ can't resolve that relative import.
    `export { vDraggableVapor as vDraggable } from '${relativeImportPath('directives/vDraggable')}'`,
    `export { confirmAction } from './composables/confirmAction'`,
    `export type { ConfirmActionHandle, ConfirmActionOptions } from './composables/confirmAction'`,
  )

  const composableGroups = collectNonComponentExports(indexSource)
  let composableCount = 0
  for (const [specifier, { values, types }] of composableGroups) {
    const relPath = relativeImportPath(specifier)
    if (values.size > 0) {
      barrelLines.push(`export { ${[...values].join(', ')} } from '${relPath}'`)
      composableCount += values.size
    }
    if (types.size > 0) {
      barrelLines.push(`export type { ${[...types].join(', ')} } from '${relPath}'`)
    }
  }

  writeFileSync(join(OUT_DIR, 'index.ts'), barrelLines.join('\n') + '\n')
  console.log(
    `\ngenerated src/generated/index.ts (${COMPONENTS.length} public component(s), ${toGenerate.size} file(s) total, ${composableCount} composable(s)/utilit(y/ies))`,
  )
}

main()
