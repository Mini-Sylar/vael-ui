import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

/**
 * Turns every VALUE export's `from './x'` specifier in a barrel file into
 * its own tsdown entry (as a `{ name: path }` map, since some specifiers —
 * vapor-ui's generated barrel imports several composables straight from the
 * sibling `ui` package's own src — resolve outside this package's root, and
 * rolldown rejects `../`-containing paths in the plain-array entry form).
 *
 * A module only reachable THROUGH the barrel (never imported by another
 * entry, e.g. a component that also uses it internally) gets bundled
 * straight into the barrel's own compiled output instead of split into its
 * own chunk — invisible here, but it means a downstream consumer's bundler
 * can no longer tree-shake that one export on its own: whatever else
 * rolldown grouped into that same inlined region comes along with it. This
 * is what let `useColorScheme` (only ever reachable via the barrel) drag
 * unrelated Dialog/Popover CSS into a consumer's build despite never
 * referencing either.
 *
 * Deriving entries from the barrel's own specifiers, instead of walking
 * `components/<Name>/<Name>.vue` directories, also catches anything that
 * doesn't fit that directory convention (a flat `components/Column.vue` had
 * the exact same gap) — it stays correct for whatever the barrel actually
 * exports, without needing to be kept in sync by hand.
 *
 * `export type {...}` specifiers are skipped: types are erased at compile
 * time, so they need no runtime chunk, and including them anyway risks a
 * name collision whenever a file backs both a value export (already
 * covered) and a type-only export elsewhere (e.g. vapor-ui's generated
 * barrel re-exports `confirmAction` the value from its own local generated
 * copy, but `ConfirmActionOptions` the type from the original ui package).
 */
export function collectBarrelEntries(barrelPath, cwd) {
  const source = readFileSync(barrelPath, 'utf8')
  const barrelDir = dirname(barrelPath)
  const specifiers = new Set()
  for (const match of source.matchAll(/\bexport\s+(?!type\b)[^;]*?\bfrom\s+['"](\.[^'"]+)['"]/g)) {
    specifiers.add(match[1])
  }
  const entries = {}
  for (const specifier of specifiers) {
    const withExt = specifier.endsWith('.vue') ? specifier : `${specifier}.ts`
    const absolute = resolve(barrelDir, withExt)
    const path = relative(cwd, absolute)
    // Named from the specifier itself (relative to the barrel's own
    // directory), not from `path` (relative to `cwd`) — for a nested
    // barrel like vapor-ui's `src/generated/index.ts`, `path` carries a
    // `src/generated/` prefix that has nothing to do with the export's own
    // identity and would otherwise leak into every output filename.
    const name = withExt
      .replace(/\.(vue|ts)$/, '')
      .replace(/^(\.\.\/)+/, 'external/')
      .replace(/^\.\//, '')
      // Purely a source-layout artifact, not a meaningful part of the name.
      .replace(/(^|\/)src\//g, '$1')
    entries[name] = path.startsWith('.') ? path : `./${path}`
  }
  return entries
}
