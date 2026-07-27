import { ViteSSG } from 'vite-ssg'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './style.css'
import 'vael-ui/style.css'
import { vTooltip } from 'vael-ui'
import './demo-content.css'
import './prose.css'
import App from './App.vue'
import { routerOptions } from './router'
import { i18n } from './i18n'

export const createApp = ViteSSG(App, routerOptions, async ({ app, router }) => {
  app.use(i18n).directive('tooltip', vTooltip)
  // vaporInteropPlugin only exists in Vue's browser build — vue/server-renderer
  // has no VDOM/Vapor interop concept (there's no live DOM to bridge into during
  // SSG), so this import must stay dynamic and client-gated or the SSR build's
  // module resolution fails outright looking for a nonexistent named export.
  if (!import.meta.env.SSR) {
    const { vaporInteropPlugin } = await import('vue')
    app.use(vaporInteropPlugin)

    // Route components are lazy-loaded (`() => import('./pages/X.vue')`) by
    // their build hash. After a redeploy, a tab still holding the old
    // index.html requests chunk hashes that no longer exist on the server —
    // the import 404s, the promise rejects, and client-side navigation just
    // does nothing with no visible error. A full reload picks up the new
    // build instead of leaving the tab stuck on stale JS.
    window.addEventListener('vite:preloadError', () => {
      window.location.reload()
    })
    router.onError((error, to) => {
      if (/dynamically imported module|Importing a module script failed/.test(error.message)) {
        window.location.href = to.fullPath
      }
    })
  }
})
