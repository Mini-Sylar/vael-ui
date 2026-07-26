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

export const createApp = ViteSSG(App, routerOptions, async ({ app }) => {
  app.use(i18n).directive('tooltip', vTooltip)
  // vaporInteropPlugin only exists in Vue's browser build — vue/server-renderer
  // has no VDOM/Vapor interop concept (there's no live DOM to bridge into during
  // SSG), so this import must stay dynamic and client-gated or the SSR build's
  // module resolution fails outright looking for a nonexistent named export.
  if (!import.meta.env.SSR) {
    const { vaporInteropPlugin } = await import('vue')
    app.use(vaporInteropPlugin)
  }
})
