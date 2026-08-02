<template>
  <Resizable
    v-model:size="sidebarWidth"
    direction="horizontal"
    edge="end"
    :min="200"
    :max="360"
    aria-label="Resize sidebar"
    class="sidebar-shell"
  >
    <div class="sidebar-mode-toggle">
      <SelectButton v-model="sidebarMode" size="sm" :allow-empty="false" :items="modeItems" />
    </div>
    <nav ref="sidebarScrollEl" v-scroll-mask class="sidebar-scroll">
      <MenuList :items="navItems" :active="activeValue" @select="onSelect" />
    </nav>
  </Resizable>
  <Drawer v-model:open="mobileOpen" side="left" size="sm" :title="t('nav.menu')">
    <div class="sidebar-mode-toggle sidebar-mode-toggle--mobile">
      <SelectButton v-model="sidebarMode" size="sm" :allow-empty="false" :items="modeItems" />
    </div>
    <nav class="sidebar-scroll sidebar-scroll--mobile">
      <MenuList :items="navItems" :active="activeValue" @select="onMobileSelect" />
    </nav>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useLocalStorage, useScroll } from '@vueuse/core'
import { Drawer, MenuList, Resizable, SelectButton, vScrollMask } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'
import { categories } from '../taxonomy'
import { composableCategories } from '../composablesTaxonomy'

const mobileOpen = defineModel<boolean>('mobileOpen', { default: false })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const GUIDE_ROUTES = [
  { routeName: 'getting-started', labelKey: 'nav.gettingStarted' },
  { routeName: 'guide-global-setup', labelKey: 'nav.globalSetup' },
  { routeName: 'guide-tailwind', labelKey: 'nav.tailwindGuide' },
  { routeName: 'guide-styling-and-layers', labelKey: 'nav.stylingAndLayersGuide' },
  { routeName: 'guide-animation-integration', labelKey: 'nav.animationIntegrationGuide' },
  { routeName: 'guide-i18n-keys', labelKey: 'nav.i18nKeysGuide' },
] as const

const guideValue = (routeName: string) => `guide:${routeName}`
const composableValue = (name: string) => `composable:${name}`

// Session-scoped (not persisted across a closed tab, unlike sidebarWidth
// below): a fresh visit should always start on Components, but switching
// back and forth while browsing in the same tab shouldn't keep resetting.
type SidebarMode = 'components' | 'composables'
const MODE_STORAGE_KEY = 'vael-ui-docs-sidebar-mode'
const storedMode =
  typeof sessionStorage === 'undefined'
    ? null
    : (sessionStorage.getItem(MODE_STORAGE_KEY) as SidebarMode | null)
const sidebarMode = shallowRef<SidebarMode>(storedMode ?? 'components')
watch(sidebarMode, (mode) => {
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(MODE_STORAGE_KEY, mode)
})

const modeItems = computed(() => [
  { label: t('nav.components'), value: 'components' },
  { label: t('nav.composables'), value: 'composables' },
])

// Landing directly on a components/composables page (a shared link, a
// search result) always shows the sidebar mode that page actually belongs
// to — sessionStorage only matters for route-agnostic pages (Home), where
// there's no page-driven signal either way.
watch(
  () => route.name,
  (routeName) => {
    if (routeName === 'composable') sidebarMode.value = 'composables'
    else if (routeName === 'component' || GUIDE_ROUTES.some((g) => g.routeName === routeName)) {
      sidebarMode.value = 'components'
    }
  },
  { immediate: true },
)

const navItems = computed<MenuEntry[]>(() => {
  if (sidebarMode.value === 'composables') {
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
    ...categories.map((category) => ({
      label: t(`taxonomy.${category.key}`),
      items: category.components.map((name) => ({ label: name, value: name })),
    })),
  ]
})

const activeValue = computed(() => {
  if (route.name === 'component') return route.params.name as string
  if (route.name === 'composable') return composableValue(route.params.name as string)
  if (typeof route.name === 'string') return guideValue(route.name)
  return null
})

function onSelect(item: MenuItemData) {
  if (!item.value) return
  const value = String(item.value)
  if (value.startsWith('guide:')) router.push({ name: value.slice('guide:'.length) })
  else if (value.startsWith('composable:')) {
    router.push({ name: 'composable', params: { name: value.slice('composable:'.length) } })
  } else router.push({ name: 'component', params: { name: value } })
}

function onMobileSelect(item: MenuItemData) {
  onSelect(item)
  mobileOpen.value = false
}

// This sidebar IS the Resizable example. Its own component page points
// here rather than duplicating a fake one.
const sidebarWidth = useLocalStorage('vael-ui-docs-sidebar-width', 248)

const sidebarScrollEl = useTemplateRef<HTMLElement>('sidebarScrollEl')
const persistedScrollTop = useLocalStorage('vael-ui-docs-sidebar-scroll', 0)
const { y: scrollY } = useScroll(sidebarScrollEl)
watch(scrollY, (y) => (persistedScrollTop.value = y))
onMounted(() => {
  nextTick(() => (scrollY.value = persistedScrollTop.value))
})
</script>

<style scoped>
.sidebar-shell {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--docs-header-height));
  position: sticky;
  top: var(--docs-header-height);
  border-right: 1px solid var(--ui-border);
  background: color-mix(in oklch, var(--ui-muted) 40%, transparent);
  overflow: hidden;
}

@media (max-width: 850px) {
  .sidebar-shell {
    display: none;
  }
}

.sidebar-mode-toggle {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  padding: 1rem 1rem 0;
}

.sidebar-mode-toggle--mobile {
  padding: 1rem;
  border-bottom: 1px solid var(--ui-border);
}

.sidebar-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1rem;
}

.sidebar-scroll--mobile {
  height: auto;
  padding: 0;
}

.sidebar-scroll :deep(.ui-menu-list-item) {
  position: relative;
  font-size: 0.85rem;
  padding-block: 0.4rem;
}

.sidebar-scroll :deep(.ui-menu-list-item--group) {
  font-size: 0.72rem;
}

.sidebar-scroll :deep(.ui-menu-list-item:hover:not(:disabled)),
.sidebar-scroll :deep(.ui-menu-list-item:focus-visible) {
  background: color-mix(in oklch, var(--ui-primary) 10%, transparent);
}

.sidebar-scroll :deep(.ui-menu-list-item[aria-current='page']::before) {
  content: '';
  position: absolute;
  left: -0.5rem;
  top: 0.25rem;
  bottom: 0.25rem;
  width: 2px;
  border-radius: 9999px;
  background: var(--ui-primary);
}
</style>
