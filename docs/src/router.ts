import type { NavigationGuard, RouteRecordRaw, RouterScrollBehavior } from 'vue-router'
import { allComponents } from './taxonomy'
import { allComposables } from './composablesTaxonomy'
import { DIRECTIVES } from './directivesTaxonomy'
import { MOTION_CHAPTERS } from './motionChapters'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./pages/Home.vue') },
  {
    path: '/docs/getting-started',
    name: 'getting-started',
    component: () => import('./pages/GettingStarted.vue'),
  },
  {
    path: '/docs/guides/tailwind',
    name: 'guide-tailwind',
    component: () => import('./pages/guides/UsingWithTailwind.vue'),
  },
  {
    path: '/docs/guides/global-setup',
    name: 'guide-global-setup',
    component: () => import('./pages/guides/GlobalSetup.vue'),
  },
  {
    path: '/docs/guides/animation-integration',
    name: 'guide-animation-integration',
    component: () => import('./pages/guides/AnimationIntegration.vue'),
  },
  {
    path: '/docs/guides/styling-and-layers',
    name: 'guide-styling-and-layers',
    component: () => import('./pages/guides/StylingAndLayers.vue'),
  },
  {
    path: '/docs/guides/i18n-keys',
    name: 'guide-i18n-keys',
    component: () => import('./pages/guides/I18nKeys.vue'),
  },
  {
    path: '/docs/guides/auto-import',
    name: 'guide-auto-import',
    component: () => import('./pages/guides/AutoImport.vue'),
  },
  {
    path: '/docs/guides/nuxt',
    name: 'guide-nuxt',
    component: () => import('./pages/guides/Nuxt.vue'),
  },
  {
    path: '/docs/guides/skill',
    name: 'guide-skill',
    component: () => import('./pages/guides/Skill.vue'),
  },
  {
    path: '/motion',
    name: 'motion-overview',
    component: () => import('./pages/motion/MotionOverview.vue'),
  },
  {
    path: '/motion/springs',
    name: 'motion-springs',
    component: () => import('./pages/motion/MotionSprings.vue'),
  },
  // The Motion guide's chapters share one page, driven by motionChapters.ts.
  ...MOTION_CHAPTERS.map((chapter) => ({
    path: chapter.path,
    name: chapter.routeName,
    component: () => import('./pages/motion/MotionChapter.vue'),
  })),
  // Internal: every showpiece side by side, to compare engines. Not in the nav.
  {
    path: '/motion/side-by-side',
    name: 'motion-showpieces',
    component: () => import('./pages/motion/MotionShowcase.vue'),
  },
  {
    path: '/motion/blocks',
    name: 'motion-blocks',
    component: () => import('./pages/motion/MotionBlocks.vue'),
  },
  {
    path: '/motion/types',
    name: 'motion-types',
    component: () => import('./pages/motion/MotionTypes.vue'),
  },
  {
    path: '/motion/engines',
    name: 'motion-engines',
    component: () => import('./pages/motion/MotionEngines.vue'),
  },
  {
    path: '/components/:name',
    name: 'component',
    component: () => import('./pages/ComponentPage.vue'),
  },
  {
    path: '/composables/:name',
    name: 'composable',
    component: () => import('./pages/ComposablePage.vue'),
  },
  {
    path: '/directives/:name',
    name: 'directive',
    component: () => import('./pages/DirectivePage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('./pages/NotFound.vue'),
  },
]

// `history` is intentionally omitted — ViteSSG supplies createMemoryHistory()
// during static generation and createWebHistory() on the client itself.
// A new page starts at its top, at once: Safari drops a smooth scroll (the page's
// scroll-behavior) when the page swap changes the height under it.
let pageEntering: (() => void) | undefined
/** App.vue's page Transition calls this as the new page starts to come in. */
export const pageEntered = () => pageEntering?.()
const scrollBehavior: RouterScrollBehavior = (to, from) => {
  if (to.hash) return { el: to.hash, top: 88 }
  const top = { top: 0, behavior: 'instant' as ScrollBehavior }
  // The same page component re-renders in place; another one swaps out first, then in.
  if (to.name === from.name) return top
  return new Promise((resolve) => {
    const done = () => {
      pageEntering = undefined
      clearTimeout(fallback)
      resolve(top)
    }
    const fallback = setTimeout(done, 600)
    pageEntering = done
  })
}

export const routerOptions = { routes, scrollBehavior }

// Typed and shared links often get the casing or separators wrong (/components/date-picker).
// Compare names without case, dashes or underscores, then send the visitor to the real page.
const fold = (name: string) => name.replace(/[-_]/g, '').toLowerCase()
const byFolded = (names: readonly string[]) => new Map(names.map((name) => [fold(name), name]))
const DOC_PAGES: Record<string, { segment: string; names: Map<string, string> }> = {
  component: { segment: 'components', names: byFolded(allComponents) },
  composable: { segment: 'composables', names: byFolded(allComposables) },
  directive: { segment: 'directives', names: byFolded(DIRECTIVES) },
}

// A global guard rather than `beforeEnter`, which skips param-only changes such as
// /components/Button to /components/date-picker.
export const canonicalDocsName: NavigationGuard = (to) => {
  const page = DOC_PAGES[to.name as string]
  if (!page) return true
  const name = to.params.name as string
  const canonical = page.names.get(fold(name))
  if (canonical === name) return true
  const { query, hash } = to
  if (canonical) {
    return { name: to.name, params: { name: canonical }, query, hash, replace: true }
  }
  // Unknown names keep their URL but render the 404 page, which suggests close matches.
  return { name: 'not-found', params: { pathMatch: [page.segment, name] }, query, hash }
}
