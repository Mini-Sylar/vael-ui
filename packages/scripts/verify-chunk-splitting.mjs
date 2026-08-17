#!/usr/bin/env node
// Run after `pnpm build`. Confirms every value export in each barrel
// (packages/ui/src/index.ts, packages/vapor-ui/src/generated/index.ts) has
// its own dist chunk, matching the entries collectBarrelEntries derived at
// build time. If a chunk is missing, tsdown/rolldown inlined that export
// straight into the barrel's own compiled file instead of splitting it out
// — invisible until a downstream consumer's bundler can no longer
// tree-shake that one export on its own, and drags in whatever else got
// bundled alongside it. This is exactly what happened to useColorScheme
// (see the tree-sticky-scroll-vscode changeset's "Also fixes" entry, or the
// original repro at github.com/Mini-Sylar/vue-vael-css-repro): reachable
// only via the ui barrel, it got inlined into index.js, and importing it
// alone dragged unrelated Dialog/Popover CSS into a consumer's build.
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectBarrelEntries } from './collect-barrel-entries.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function verify(label, barrelPath, distDir, cwd) {
  const entries = collectBarrelEntries(barrelPath, cwd)
  const missing = []
  for (const [name, srcPath] of Object.entries(entries)) {
    if (!existsSync(join(distDir, `${name}.js`))) missing.push({ label, name, srcPath })
  }
  return missing
}

const uiRoot = join(__dirname, '../ui')
const vaporRoot = join(__dirname, '../vapor-ui')

const missing = [
  ...verify('vdom', join(uiRoot, 'src/index.ts'), join(uiRoot, 'dist'), uiRoot),
  ...verify(
    'vapor',
    join(vaporRoot, 'src/generated/index.ts'),
    join(uiRoot, 'dist/vapor'),
    vaporRoot,
  ),
]

if (missing.length > 0) {
  console.error(`${missing.length} barrel export(s) missing their own dist chunk:\n`)
  for (const m of missing) console.error(`  [${m.label}] ${m.name} (from ${m.srcPath})`)
  console.error(
    '\nEach of these got inlined into its barrel instead of split into its own chunk — a ' +
      'downstream consumer can no longer tree-shake it independently. Check tsdown.config.ts\'s ' +
      'entry list (packages/ui, packages/vapor-ui) still spreads collectBarrelEntries(...).',
  )
  process.exit(1)
}

console.log('OK: every barrel export (vdom + vapor) has its own dist chunk.')
