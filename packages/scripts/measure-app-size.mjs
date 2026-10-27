#!/usr/bin/env node
// Run after `pnpm build`. What an app actually ships: each entry below is built as a small Vite app
// (production, Vue external, Rolldown), and the entry chunk plus everything it imports statically is
// gzipped together. Lazy chunks (`import()`) don't count: they load when used.
// `--update` writes the measured sizes as the new baseline; otherwise anything that grew more than
// 1% over its baseline fails, so a size regression shows up in the commit that caused it.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
// `VAEL_DIST` measures another build the same way (a published version, an older commit).
const dist = process.env.VAEL_DIST ?? join(here, '../ui/dist/index.js')
const baselineFile = join(here, 'app-size-baseline.json')
// A file URL: on Windows, import() refuses a plain C:\ path.
const { build } = await import(
  pathToFileURL(join(here, '../ui/node_modules/vite/dist/node/index.js')).href
)

// Single components, then an app using the common ones together (shared code counted once).
const ENTRIES = [
  'Button',
  'Switch',
  'Checkbox',
  'Input',
  'Select',
  'Combobox',
  'Dialog',
  'Drawer',
  'Popover',
  'Menu',
  'Tooltip',
  'Toaster',
  'Tabs',
  'Accordion',
  'DataTable',
  'DatePicker',
  'ConfigProvider',
]
const APP = ENTRIES.join('+')

const root = mkdtempSync(join(tmpdir(), 'vael-app-size-'))
async function measure(spec) {
  const names = spec.split('+')
  const file = names.length > 1 ? 'app' : spec
  writeFileSync(
    join(root, `${file}.js`),
    `import { ${names.join(', ')} } from 'vael-ui'\nconsole.log(${names.join(', ')})\n`,
  )
  const out = join(root, `out-${file}`)
  await build({
    root,
    logLevel: 'error',
    configFile: false,
    resolve: { alias: { 'vael-ui': dist } },
    build: {
      outDir: out,
      minify: true,
      rollupOptions: { input: join(root, `${file}.js`), external: ['vue'] },
    },
  })
  const assets = join(out, 'assets')
  const entry = readdirSync(assets).find((f) => f.startsWith(`${file}-`) && f.endsWith('.js'))
  // Static imports only: `from"./x.js"` or `import"./x.js"`; `import("…")` loads later.
  const seen = new Set()
  const walk = (path) => {
    if (seen.has(path) || !existsSync(path)) return
    seen.add(path)
    for (const [, rel] of readFileSync(path, 'utf8').matchAll(/(?:from|import)\s*"(\.\/[^"]+)"/g))
      walk(join(dirname(path), rel))
  }
  walk(join(assets, entry))
  return gzipSync(Buffer.concat([...seen].map((f) => readFileSync(f)))).length
}

const sizes = {}
try {
  for (const spec of [...ENTRIES, APP])
    sizes[spec === APP ? 'app (all of them)' : spec] = await measure(spec)
} finally {
  rmSync(root, { recursive: true, force: true })
}

const baseline = existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, 'utf8')) : {}
const failures = []
console.log(`${'up front, gzipped'.padEnd(20)} ${'now'.padStart(8)} ${'baseline'.padStart(9)}`)
for (const [name, size] of Object.entries(sizes)) {
  const was = baseline[name]
  const change = was ? ` ${size - was >= 0 ? '+' : ''}${size - was}` : ''
  console.log(
    `${name.padEnd(20)} ${String(size).padStart(8)} ${String(was ?? '-').padStart(9)}${change}`,
  )
  if (was && size > was * 1.01) failures.push(`${name} ${size} B > ${was} B (+${size - was})`)
}
if (process.argv.includes('--update')) {
  writeFileSync(baselineFile, `${JSON.stringify(sizes, null, 2)}\n`)
  console.log(`baseline written: ${baselineFile}`)
} else if (failures.length) {
  console.error(`App size grew past its baseline:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
