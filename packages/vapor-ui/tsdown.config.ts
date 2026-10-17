import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { defineConfig } from 'tsdown'
import type { Plugin } from 'rolldown'
import Vue from 'unplugin-vue/rolldown'
import { collectBarrelEntries } from '../scripts/collect-barrel-entries.mjs'

const UI_DIR = resolve(process.cwd(), '../ui')

// Every composable and utility the vdom build already ships as its own file, by source path.
// The Vapor build imports those files instead of compiling its own copies: their code is the same
// for both builds, and a second copy would carry its own state. A toast() from one copy would
// never reach a <Toaster> using the other, depending on how the app resolves 'vael-ui'.
const vdomFiles = new Map(
  Object.entries(collectBarrelEntries(join(UI_DIR, 'src/index.ts'), UI_DIR))
    .filter(([, path]) => !path.endsWith('.vue'))
    .map(([name, path]) => [resolve(UI_DIR, path), join(UI_DIR, 'dist', `${name}.js`)]),
)

function useVdomFiles(outDir: string): Plugin {
  const used = new Set<string>()
  return {
    name: 'vael-ui:use-vdom-files',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null
      const from = dirname(importer.split('?')[0]!)
      const file = vdomFiles.get(resolve(from, source.endsWith('.ts') ? source : `${source}.ts`))
      if (!file) return null
      if (!existsSync(file)) throw new Error(`${file} is missing. Build vael-ui before vapor-ui.`)
      used.add(file)
      return { id: file, external: 'absolute' }
    },
    // Rolldown's own `external: 'relative'` is relative to the source file, which leaves this
    // repo's folder names in the published output. Relative to each output file instead.
    renderChunk(code, chunk) {
      const chunkDir = dirname(join(outDir, chunk.fileName))
      let out = code
      for (const file of used) {
        if (out.includes(file)) out = out.split(file).join(importPath(chunkDir, file))
      }
      return out === code ? null : out
    },
  }
}

function importPath(fromDir: string, file: string): string {
  const path = relative(fromDir, file).split('\\').join('/')
  return path.startsWith('.') ? path : `./${path}`
}

function filesIn(dir: string, ext: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith(ext))
    .map((name) => join(dir, name))
}

const hashOf = (file: string): string => createHash('md5').update(readFileSync(file)).digest('hex')

// Component CSS is the same for both builds. Once written, each Vapor CSS file that is
// byte-identical to a vdom one is dropped and its imports point at the vdom file, so the package
// ships one copy and a mixed app loads one copy.
function useVdomCss(outDir: string): Plugin {
  return {
    name: 'vael-ui:use-vdom-css',
    writeBundle() {
      const vdomCss = new Map<string, string>()
      for (const file of filesIn(join(UI_DIR, 'dist'), '.css')) {
        if (!/[\\/]dist[\\/]vapor(-server)?[\\/]/.test(file)) vdomCss.set(hashOf(file), file)
      }
      const replaced = new Map<string, string>()
      for (const file of filesIn(outDir, '.css')) {
        const twin = vdomCss.get(hashOf(file))
        if (twin) replaced.set(file, twin)
      }
      const cssImport = /(import\s*['"])([^'"]+\.css)(['"])/g
      for (const file of filesIn(outDir, '.js')) {
        const dir = dirname(file)
        const code = readFileSync(file, 'utf8')
        const out = code.replace(cssImport, (full, open: string, spec: string, close: string) => {
          const target = replaced.get(resolve(dir, spec))
          return target ? `${open}${importPath(dir, target)}${close}` : full
        })
        for (const [, , spec] of out.matchAll(cssImport)) {
          if (!existsSync(resolve(dir, spec!))) throw new Error(`${file} imports missing ${spec}`)
        }
        if (out !== code) writeFileSync(file, out)
      }
      for (const file of replaced.keys()) unlinkSync(file)
    },
  }
}

// One entry per export the generated barrel has (see collectBarrelEntries for why), minus the
// ones that now come from the vdom build's files.
const entry = {
  index: './src/generated/index.ts',
  ...Object.fromEntries(
    Object.entries(collectBarrelEntries('./src/generated/index.ts', process.cwd())).filter(
      ([, path]) => !vdomFiles.has(resolve(path)),
    ),
  ),
}

export default defineConfig([
  {
    entry,
    outDir: '../ui/dist/vapor',
    platform: 'neutral',
    plugins: [
      useVdomFiles(join(UI_DIR, 'dist/vapor')),
      useVdomCss(join(UI_DIR, 'dist/vapor')),
      Vue({ isProduction: true, template: { compilerOptions: { comments: false } } }),
    ],
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
    plugins: [
      useVdomFiles(join(UI_DIR, 'dist/vapor-server')),
      useVdomCss(join(UI_DIR, 'dist/vapor-server')),
      Vue({ isProduction: true, ssr: true, template: { compilerOptions: { comments: false } } }),
    ],
    css: { minify: true, splitting: true, inject: true },
    minify: true,
  },
])
