import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'
import { collectBarrelEntries } from '../scripts/collect-barrel-entries.mjs'

// Mirrors packages/ui/tsdown.config.ts: one entry per export the generated
// barrel actually has, derived from its own specifiers (see
// collectBarrelEntries's own comment for why — a component/composable only
// reachable via the barrel otherwise gets inlined into it, breaking a
// downstream consumer's own tree-shaking). Some specifiers point outside
// this package, straight at packages/ui/src (composables aren't copied into
// src/generated/, only components are) — collectBarrelEntries resolves
// those to an `external/...` entry name so rolldown's entryFileNames
// placeholder never sees a raw `../` path.
const entry = {
  index: './src/generated/index.ts',
  ...collectBarrelEntries('./src/generated/index.ts', process.cwd()),
}

export default defineConfig([
  {
    entry,
    outDir: '../ui/dist/vapor',
    platform: 'neutral',
    plugins: [Vue({ isProduction: true })],
    // No dts here: vue-tsc types a Vapor SFC as a plain callable function
    // signature, not a DefineComponent — that fails template type-checking in
    // consumers (`abstract new (...args) => any` constraint). emit-vapor-types.mjs
    // sidesteps this by re-exporting the vdom build's own DefineComponent types
    // for the same components instead (erased at runtime, so the mismatch
    // between "typed as vdom" and "compiled as vapor" is harmless).
    css: { minify: true, splitting: true, inject: true },
    minify: true,
  },
  // The same components compiled for the server. Vue's server renderer has no Vapor runtime,
  // so a server gets string-rendering output whose HTML Vapor hydrates in the browser.
  // package.json's `./vapor` export points server runtimes here.
  {
    entry,
    outDir: '../ui/dist/vapor-server',
    platform: 'neutral',
    plugins: [Vue({ isProduction: true, ssr: true })],
    css: { minify: true, splitting: true, inject: true },
    minify: true,
  },
])
