#!/usr/bin/env node
// Keeps the Vapor build live during `pnpm docs:dev`. The Vapor sources are generated from
// packages/ui/src, so this regenerates them whenever that folder changes and leaves the
// rebuild to `tsdown --watch`. The generator only writes files that changed, so an edit
// rebuilds once instead of looping.
import { spawn, spawnSync } from 'node:child_process'
import { watch } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UI_SRC_DIR = join(__dirname, '../ui/src')
const VAPOR_DIR = join(__dirname, '../vapor-ui')
const GENERATE = join(__dirname, 'generate-vapor.mjs')

const generate = () =>
  spawnSync(process.execPath, [GENERATE], { stdio: ['ignore', 'ignore', 'inherit'] })

generate()
const tsdown = spawn('pnpm', ['exec', 'tsdown', '--watch', '--no-clean', '--no-report'], {
  cwd: VAPOR_DIR,
  stdio: 'inherit',
})

let timer
watch(UI_SRC_DIR, { recursive: true }, (_event, file) => {
  // The resolver manifest is generated output, not a source edit.
  if (String(file).includes('generated')) return
  clearTimeout(timer)
  timer = setTimeout(generate, 150)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    tsdown.kill(signal)
    process.exit()
  })
}
