#!/usr/bin/env node
// Generates vapor-ui/src/generated/*.vue from ui/src/components/ (add name to COMPONENTS, run pnpm build)

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
import { dirname, join, relative, resolve } from 'node:path'
import { COMPONENTS } from './component-names.mjs'
import { collectBarrelEntries } from './collect-barrel-entries.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UI_SRC_DIR = join(__dirname, '../ui/src')
const UI_COMPONENTS_DIR = join(__dirname, '../ui/src/components')
const UI_INDEX_PATH = join(__dirname, '../ui/src/index.ts')

// Modules the vdom build ships as their own files. Vapor components import these by path and the
// Vapor build points them at the vdom files, so both builds share one copy.
const SHARED_MODULES = new Set(Object.keys(collectBarrelEntries(UI_INDEX_PATH, UI_SRC_DIR)))
// Stateless helpers each build may bundle on its own.
const PER_BUILD_MODULES = new Set([
  'composables/useLazySortable',
  'composables/useFocusableScroller',
  'composables/selectGroups',
  'composables/useEasedHeight',
  'composables/useFold',
  'composables/useChipRowWidth',
  'composables/sortableSettle',
  'composables/loaderType',
  'composables/numberParts',
  'composables/useTextOverlay',
])
const OUT_DIR = join(__dirname, '../vapor-ui/src/generated')

// Only changed files are written and only files no longer produced are removed, so a running
// `tsdown --watch` on the Vapor build sees real edits instead of a deleted and recreated folder.
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
const REWRITABLE_BASENAMES = [
  'composables/',
  'motion/',
  'classes',
  'theme',
  'messages',
  'directives/',
  'ssr',
  'config',
]

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
  'vAnimate',
  'vAnimateVapor',
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
// CSS-splitting the vdom tsdown build already does. The resolution is
// anchored to the CSS file's own absolute location, not the importing file's
// original directory.
function copyCssImports(source, origFileDir, outFileDir) {
  const importLineRe = /^import\s+'([^']+\.css)'\s*$/gm
  return source.replace(importLineRe, (_full, relPath) => {
    const absSrc = resolve(origFileDir, relPath)
    const mirroredRel = relative(UI_COMPONENTS_DIR, absSrc)
    const absOut = join(OUT_DIR, mirroredRel)
    writeIfChanged(absOut, readFileSync(absSrc, 'utf8'))
    let newRel = relative(outFileDir, absOut).split('\\').join('/')
    if (!newRel.startsWith('.')) newRel = `./${newRel}`
    return `import '${newRel}'`
  })
}

// Vapor ignores v-memo and warns about it at build time, so the copies drop it.
function stripVMemo(source) {
  return source.replace(/\s+v-memo="[^"]*"/g, '')
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

// Local identifiers whose vapor-only implementation lives in a differently-named
// export, possibly from a different module than the vdom import site names —
// aliased so component templates/call sites need no changes. Value is
// [vaporExportName, sourceModulePath relative to ui/src].
const VAPOR_ALIASES = {
  vTooltip: ['vTooltipVapor', 'directives/vTooltip'],
  vScrollMask: ['vScrollMaskVapor', 'directives/vScrollMask'],
  vDraggable: ['vDraggableVapor', 'directives/vDraggable'],
  vAnimate: ['vAnimateVapor', 'directives/vAnimate'],
  // See useSlotRelay.ts: a plain functional component forwarding a captured
  // slot renders as [object Object] under vaporInteropPlugin
  // (https://github.com/vuejs/core/issues/15596) — the vapor build needs the
  // defineVaporComponent-wrapped variant instead.
  createSlotRelay: ['createSlotRelayVapor', 'composables/useSlotRelay'],
}

function relativeImportPath(specifier, fromDir = '') {
  const targetPath = join(UI_SRC_DIR, specifier)
  let relPath = relative(join(OUT_DIR, fromDir), targetPath).split('\\').join('/')
  if (!relPath.startsWith('.')) relPath = `./${relPath}`
  return relPath
}

function rewriteImports(source, moduleId) {
  const importLineRe = /^import\s+(type\s+)?\{([^}]+)\}\s+from\s+'([^']+)'\s*$/gm
  return source.replace(importLineRe, (full, typeOnly, namedClause, specifier) => {
    if (!isRewritable(specifier)) return full // 'vue', third-party, and sibling ./ imports: untouched

    const names = namedClause
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    const localNames = names.map((n) => {
      const asMatch = n.match(/\bas\s+(\S+)/)
      return asMatch ? asMatch[1] : n.replace(/^type\s+/, '')
    })

    // vTooltip/vScrollMask/createSlotRelay etc. import their own file directly
    // — the barrel only exports them aliased (vTooltipVapor as vTooltip), not
    // under the raw name.
    const fromDir = dirname(moduleId)
    const directiveLines = []
    const otherNames = []
    for (let i = 0; i < names.length; i++) {
      const localName = localNames[i]
      const alias = VAPOR_ALIASES[localName]
      if (!alias) {
        otherNames.push(names[i])
        continue
      }
      const [vaporName, modulePath] = alias
      const importPath = relativeImportPath(modulePath, fromDir)
      directiveLines.push(
        `import ${typeOnly ?? ''}{${vaporName} as ${localName}} from '${importPath}'`,
      )
    }

    // Imported by source path, not through 'vael-ui': without the `vapor` condition that name is
    // the vdom build, and with it the Vapor build. The Vapor tsdown config turns these into
    // imports of the vdom build's own files, so both builds share one copy of their state.
    const lines = [...directiveLines]
    if (otherNames.length > 0) {
      const sourcePath = relative(UI_SRC_DIR, resolve(UI_COMPONENTS_DIR, fromDir, specifier))
      const typesOnly = typeOnly || otherNames.every((n) => n.startsWith('type '))
      if (!typesOnly && !SHARED_MODULES.has(sourcePath) && !PER_BUILD_MODULES.has(sourcePath)) {
        throw new Error(
          `${moduleId}: imports '${sourcePath}', which the vdom build doesn't ship as its own file, ` +
            `so the Vapor build would get a second copy with its own state. Export it from ` +
            `src/index.ts, or add it to PER_BUILD_MODULES if it holds no state.`,
        )
      }
      lines.push(
        `import ${typeOnly ?? ''}{${otherNames.join(', ')}} from '${relativeImportPath(sourcePath, fromDir)}'`,
      )
    }
    return lines.join('\n')
  })
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
    .replace(
      /from '\.\/useDialogService'/,
      `from '${relativeImportPath('composables/useDialogService', 'composables')}'`,
    )
    .replace(
      /from '\.\/usePopoverService'/,
      `from '${relativeImportPath('composables/usePopoverService', 'composables')}'`,
    )

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

  mkdirSync(OUT_DIR, { recursive: true })

  const errors = []
  for (const moduleId of toGenerate) {
    try {
      const srcPath = join(UI_COMPONENTS_DIR, `${moduleId}.vue`)
      let source = readFileSync(srcPath, 'utf8')
      const outPath = join(OUT_DIR, `${moduleId}.vue`)
      mkdirSync(dirname(outPath), { recursive: true }) // for internal/*.vue
      source = copyCssImports(source, dirname(srcPath), dirname(outPath))
      source = stripVMemo(source)
      source = injectVaporMarker(source, moduleId)
      source = rewriteImports(source, moduleId)
      writeIfChanged(outPath, source)
      const dep = requestedModuleIds.has(moduleId) ? '' : ' (dependency)'
      console.log(`generated src/generated/${moduleId}.vue${dep}`)
    } catch (err) {
      errors.push(err.message)
    }
  }

  try {
    const confirmActionSource = generateConfirmActionSource(publicExports)
    const outPath = join(OUT_DIR, 'composables/confirmAction.ts')
    writeIfChanged(outPath, confirmActionSource)
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
    `export { vScrollMaskVapor as vScrollMask } from '${relativeImportPath('directives/vScrollMask')}'`,
    `export { vDraggableVapor as vDraggable } from '${relativeImportPath('directives/vDraggable')}'`,
    `export { vAnimateVapor as vAnimate } from '${relativeImportPath('directives/vAnimate')}'`,
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

  writeIfChanged(join(OUT_DIR, 'index.ts'), barrelLines.join('\n') + '\n')
  removeStale(OUT_DIR)
  console.log(
    `\ngenerated src/generated/index.ts (${COMPONENTS.length} public component(s), ${toGenerate.size} file(s) total, ${composableCount} composable(s)/utilit(y/ies))`,
  )
}

main()
