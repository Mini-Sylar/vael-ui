/// <reference types="vite-ssg" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import generateSitemap from 'vite-ssg-sitemap'
import { allComponents } from './src/taxonomy.ts'
import { allComposables } from './src/composablesTaxonomy.ts'

const uiPackageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../packages/ui/package.json', import.meta.url)), 'utf-8'),
)

// A library rebuild rewrites every file in packages/ui/dist, and Vite would log and reload once
// per file. This waits for the rebuild to settle, then reloads the page once.
function batchLibraryReloads(): Plugin {
  const dist = fileURLToPath(new URL('../packages/ui/dist/', import.meta.url))
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    name: 'docs:batch-library-reloads',
    apply: 'serve',
    hotUpdate({ file, server }) {
      if (!file.startsWith(dist)) return
      if (this.environment.name === 'client') {
        clearTimeout(timer)
        timer = setTimeout(() => {
          server.config.logger.info('vael-ui rebuilt, reloading the page', { timestamp: true })
          this.environment.hot.send({ type: 'full-reload' })
        }, 300)
      }
      return []
    },
  }
}

export default defineConfig({
  plugins: [vue(), batchLibraryReloads()],
  resolve: { dedupe: ['vue'] },
  optimizeDeps: { exclude: ['motion-v'] },
  define: {
    __VAEL_UI_VERSION__: JSON.stringify(uiPackageJson.version),
  },
  ssgOptions: {
    dirStyle: 'nested',
    formatting: 'minify',
    // beasties drops the layer-order.css link (see index.html) since it has no matched selector.
    beastiesOptions: false,
    // `/components/:name` and `/composables/:name` are dynamic and get
    // filtered out by vite-ssg's own default handler — expand each into one
    // concrete path per real entry instead, plus a `/404` render used only
    // to produce a static 404.html.
    includedRoutes(paths) {
      const staticPaths = paths.filter((p) => !p.includes(':'))
      const componentPaths = allComponents.map((name) => `/components/${name}`)
      const composablePaths = allComposables.map((name) => `/composables/${name}`)
      return [...staticPaths, ...componentPaths, ...composablePaths, '/404']
    },
    // `dirStyle: 'nested'` would otherwise write `404/index.html` — static
    // hosts (Netlify, Vercel, GitHub Pages) look for `404.html` at the root.
    htmlFileName(filename) {
      if (filename === '404/index.html') return '404.html'
      return undefined
    },
    onFinished() {
      generateSitemap({
        hostname: 'https://vael-ui.dev',
        exclude: ['/404'],
        robots: [{ userAgent: '*', allow: '/' }],
      })
    },
  },
})
