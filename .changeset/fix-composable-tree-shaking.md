---
'vael-ui': patch
---

Fixes a tree-shaking bug where importing a single composable (e.g. `useColorScheme`) could
silently pull unrelated components' CSS — Dialog, Popover, Dock, and others — into a consumer's
production bundle, despite the composable never referencing them.

Root cause: `tsdown.config.ts`'s build entries only covered components, discovered by walking
`components/<Name>/<Name>.vue` directories. Anything else exported from the library's barrel
(`useColorScheme` and ~20 other composables, plus `classes`/`theme`/`messages`/`ssr`/the
directives) was only ever reachable _through_ that barrel, so tsdown/rolldown bundled it straight
into the compiled `index.js` instead of splitting it into its own chunk. A downstream bundler can
tree-shake an unused _export_, but not an unused chunk of code still sitting inside a file it
otherwise needs — so importing that one composable kept the whole inlined region, and whatever
unrelated component code rolldown had grouped alongside it during the library's own build.

The directory walk also missed any component that doesn't fit the `<Name>/<Name>.vue` convention —
`Column.vue`, which sits flat in `components/`, had the exact same problem.

Fix: build entries are now derived directly from the barrel's own export specifiers (a new
`collectBarrelEntries` helper, shared by `packages/ui/tsdown.config.ts` and
`packages/vapor-ui/tsdown.config.ts`), so every component _and_ composable gets its own chunk
automatically — accurate to whatever the barrel actually exports, present or future, without
needing to be kept in sync by hand. `pnpm build` now also runs a `verify-chunk-splitting.mjs`
check that fails loudly if any barrel export ever loses its own chunk again.

No public API changes — every export, prop, and type stays the same. Only the compiled output's
internal chunking changed, which is what fixes the leak.
