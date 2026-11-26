import { ViteSSG } from 'vite-ssg'
import './style.css'
import { preventFocusZoom, vTooltip } from 'vael-ui'
import { formPlugin } from 'vael-form'
import './demo-content.css'
import './prose.css'
import App from './App.vue'
import { canonicalDocsName, routerOptions } from './router'
import { i18n } from './i18n'
import { adoptPrerendered } from './composables/highlightInline'

export const createApp = ViteSSG(App, routerOptions, async ({ app, router }) => {
  app.use(i18n).directive('tooltip', vTooltip)
  // The Forms demos' errors come from the docs' own locales (formKit), in the language you read.
  app.use(formPlugin, { i18n: i18n.global })
  // Fields keep the docs' text size on iPhone without the focus zoom.
  preventFocusZoom()

  // vite-ssg registers a `(to, from, next)` guard right after this callback,
  // which vue-router 5 flags as deprecated. Adapt callback-style guards to
  // the return-value style so the warning never fires.
  const beforeEach = router.beforeEach.bind(router)
  router.beforeEach = (guard) =>
    beforeEach(
      guard.length > 2
        ? (to, from) =>
            new Promise((resolve) => {
              void guard.call(undefined, to, from, resolve as Parameters<typeof guard>[2])
            })
        : guard,
    )
  router.beforeEach(canonicalDocsName)
  // vaporInteropPlugin only exists in Vue's browser build — vue/server-renderer
  // has no VDOM/Vapor interop concept (there's no live DOM to bridge into during
  // SSG), so this import must stay dynamic and client-gated or the SSR build's
  // module resolution fails outright looking for a nonexistent named export.
  if (!import.meta.env.SSR) {
    const { vaporInteropPlugin } = await import('vue')
    app.use(vaporInteropPlugin)
    // The app replaces the prerendered page: its code renders highlighted from the first frame.
    adoptPrerendered(document)
    // The app replaces the prerendered page: the home dashboard's entrance carries on from the
    // prerendered copy's on the same frame. One that already ended stays ended.
    const showcase = document.querySelector('.hero-showcase')
    if (showcase) {
      const rise = showcase.getAnimations()[0]
      const origin = rise ? (rise.startTime ?? document.timeline.currentTime) : -1e6
      const watch = new MutationObserver(() => {
        const copy = document.querySelector('.hero-showcase')
        if (!copy || copy === showcase) return
        watch.disconnect()
        const entrance = copy.getAnimations({ subtree: true })
        const start = (at: number) => {
          for (const animation of entrance) animation.startTime = at
        }
        start(origin)
        // Rendering the app held the main thread while the prerendered copy kept moving: its first
        // frame runs on a time from before that, so it starts that much earlier, then exactly.
        requestAnimationFrame((frame) => {
          start(origin - (performance.now() - frame))
          requestAnimationFrame(() => start(origin))
        })
      })
      watch.observe(document.getElementById('app')!, { childList: true })
    }

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
