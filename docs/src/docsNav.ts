import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router'
import { categories } from './taxonomy'
import { composableCategories } from './composablesTaxonomy'
import { DIRECTIVES } from './directivesTaxonomy'
import { directivesContent } from './directivesContent'

// The sidebar's order, shared with the previous/next pager so the two never disagree.

export const GUIDE_ROUTES = [
  { routeName: 'getting-started', labelKey: 'nav.gettingStarted' },
  { routeName: 'guide-global-setup', labelKey: 'nav.globalSetup' },
  { routeName: 'guide-tailwind', labelKey: 'nav.tailwindGuide' },
  { routeName: 'guide-styling-and-layers', labelKey: 'nav.stylingAndLayersGuide' },
  { routeName: 'guide-animation-integration', labelKey: 'nav.animationIntegrationGuide' },
  { routeName: 'guide-i18n-keys', labelKey: 'nav.i18nKeysGuide' },
  { routeName: 'guide-auto-import', labelKey: 'nav.autoImportGuide' },
  { routeName: 'guide-nuxt', labelKey: 'nav.nuxtGuide' },
  { routeName: 'guide-skill', labelKey: 'nav.skillGuide' },
] as const

// The Motion section's own pages, then the guide that covers the contract in full.
export const MOTION_ROUTES = [
  { routeName: 'motion-overview', labelKey: 'motionDocs.nav.overview' },
  { routeName: 'motion-springs', labelKey: 'motionDocs.nav.springs' },
  { routeName: 'motion-engines', labelKey: 'motionDocs.nav.engines' },
  { routeName: 'guide-animation-integration', labelKey: 'nav.animationIntegrationGuide' },
] as const
const MOTION_COMPOSABLES = [
  'springEasing',
  'useSpringValue',
  'useHoverIndicator',
  'useTabIndicator',
]

export type DocsMode = 'components' | 'composables' | 'motion'
export interface DocsNavItem {
  label: string
  value: string
}
export interface DocsNavSection {
  label: string
  items: DocsNavItem[]
}

export const guideValue = (routeName: string) => `guide:${routeName}`
export const composableValue = (name: string) => `composable:${name}`
export const directiveValue = (name: string) => `directive:${name}`

export function routeFor(value: string): RouteLocationRaw {
  if (value.startsWith('guide:')) return { name: value.slice('guide:'.length) }
  if (value.startsWith('composable:')) {
    return { name: 'composable', params: { name: value.slice('composable:'.length) } }
  }
  if (value.startsWith('directive:')) {
    return { name: 'directive', params: { name: value.slice('directive:'.length) } }
  }
  return { name: 'component', params: { name: value } }
}

export function valueFor(
  to: Pick<RouteLocationNormalizedLoaded, 'name' | 'params'>,
): string | null {
  if (to.name === 'component') return to.params.name as string
  if (to.name === 'composable') return composableValue(to.params.name as string)
  if (to.name === 'directive') return directiveValue(to.params.name as string)
  if (GUIDE_ROUTES.some((g) => g.routeName === to.name)) return guideValue(to.name as string)
  if (MOTION_ROUTES.some((g) => g.routeName === to.name)) return guideValue(to.name as string)
  return null
}

export function navSections(mode: DocsMode, t: (key: string) => string): DocsNavSection[] {
  if (mode === 'motion') {
    return [
      {
        label: t('motionDocs.nav.motion'),
        items: MOTION_ROUTES.map((g) => ({ label: t(g.labelKey), value: guideValue(g.routeName) })),
      },
      {
        label: t('nav.composables'),
        items: MOTION_COMPOSABLES.map((name) => ({ label: name, value: composableValue(name) })),
      },
    ]
  }
  if (mode === 'composables') {
    return composableCategories.map((category) => ({
      label: t(`composablesTaxonomy.${category.key}`),
      items: category.items.map((name) => ({ label: name, value: composableValue(name) })),
    }))
  }
  return [
    {
      label: t('nav.guides'),
      items: GUIDE_ROUTES.map((g) => ({ label: t(g.labelKey), value: guideValue(g.routeName) })),
    },
    {
      label: t('nav.directives'),
      items: DIRECTIVES.map((name) => ({
        label: directivesContent[name]!.label,
        value: directiveValue(name),
      })),
    },
    ...categories.map((category) => ({
      label: t(`taxonomy.${category.key}`),
      items: category.components.map((name) => ({ label: name, value: name })),
    })),
  ]
}
