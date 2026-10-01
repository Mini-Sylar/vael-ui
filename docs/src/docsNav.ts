import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { categories } from './taxonomy'
import { composableCategories } from './composablesTaxonomy'
import { DIRECTIVES } from './directivesTaxonomy'
import { directivesContent } from './directivesContent'

/** The guides, in sidebar order. */
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

export interface DocsPageLink {
  /** Same key the sidebar uses for its active row. */
  key: string
  label: string
  /** The sidebar group it sits in, e.g. "Guides" or "Selection". */
  section: string
  to: RouteLocationRaw
}

/**
 * The page before and after the current one, walking the sidebar's own order:
 * guides, directives, then components by category. Composables follow their
 * own tab and never cross into components.
 */
export function usePageNeighbors(): ComputedRef<{
  prev: DocsPageLink | null
  next: DocsPageLink | null
}> {
  const { t } = useI18n()
  const route = useRoute()

  const componentsOrder = computed<DocsPageLink[]>(() => [
    ...GUIDE_ROUTES.map((g) => ({
      key: `guide:${g.routeName}`,
      label: t(g.labelKey),
      section: t('nav.guides'),
      to: { name: g.routeName },
    })),
    ...DIRECTIVES.map((name) => ({
      key: `directive:${name}`,
      label: directivesContent[name]!.label,
      section: t('nav.directives'),
      to: { name: 'directive', params: { name } },
    })),
    ...categories.flatMap((category) =>
      category.components.map((name) => ({
        key: name,
        label: name,
        section: t(`taxonomy.${category.key}`),
        to: { name: 'component', params: { name } },
      })),
    ),
  ])

  const composablesOrder = computed<DocsPageLink[]>(() =>
    composableCategories.flatMap((category) =>
      category.items.map((name) => ({
        key: `composable:${name}`,
        label: name,
        section: t(`composablesTaxonomy.${category.key}`),
        to: { name: 'composable', params: { name } },
      })),
    ),
  )

  return computed(() => {
    const name = route.name
    const param = route.params.name as string | undefined
    const key =
      name === 'component'
        ? param
        : name === 'composable'
          ? `composable:${param}`
          : name === 'directive'
            ? `directive:${param}`
            : `guide:${String(name)}`
    const order = name === 'composable' ? composablesOrder.value : componentsOrder.value
    const index = order.findIndex((entry) => entry.key === key)
    if (index === -1) return { prev: null, next: null }
    return { prev: order[index - 1] ?? null, next: order[index + 1] ?? null }
  })
}
