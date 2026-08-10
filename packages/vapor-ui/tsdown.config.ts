import { existsSync, readdirSync } from 'node:fs'
import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

// Mirrors packages/ui/tsdown.config.ts: one entry per top-level generated
// component dir (`<Name>/<Name>.vue`), plus the barrel. Internal-only .vue
// files (ConfirmDialogFooter, DataTableHead, ...) are dependencies pulled in
// via whichever entry imports them, not entries of their own.
const componentEntries = readdirSync('./src/generated', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((dir) => `./src/generated/${dir.name}/${dir.name}.vue`)
  .filter((path) => existsSync(path))

export default defineConfig({
  entry: ['./src/generated/index.ts', ...componentEntries],
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
})
