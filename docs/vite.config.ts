/// <reference types="vite-ssg" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import generateSitemap from 'vite-ssg-sitemap'
import { allComponents } from './src/taxonomy.ts'
import { allComposables } from './src/composablesTaxonomy.ts'

const uiPackageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../packages/ui/package.json', import.meta.url)), 'utf-8'),
)

export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue'] },
  optimizeDeps: { exclude: ['motion-v'] },
  define: {
    __VAEL_UI_VERSION__: JSON.stringify(uiPackageJson.version),
  },
  ssgOptions: {
    dirStyle: 'nested',
    formatting: 'minify',
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
