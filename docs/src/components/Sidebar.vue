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
    <nav class="sidebar-scroll">
      <MenuList :items="navItems" :active="activeValue" @select="onSelect" />
    </nav>
  </Resizable>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { MenuList, Resizable } from 'vael-ui'
import type { MenuEntry, MenuItemData } from 'vael-ui'
import { categories } from '../taxonomy'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const GUIDE_ROUTES = [
  { routeName: 'getting-started', labelKey: 'nav.gettingStarted' },
  { routeName: 'guide-global-setup', labelKey: 'nav.globalSetup' },
  { routeName: 'guide-tailwind', labelKey: 'nav.tailwindGuide' },
  { routeName: 'guide-styling-and-layers', labelKey: 'nav.stylingAndLayersGuide' },
  { routeName: 'guide-animation-integration', labelKey: 'nav.animationIntegrationGuide' },
] as const

const guideValue = (routeName: string) => `guide:${routeName}`

const navItems = computed<MenuEntry[]>(() => [
  {
    label: t('nav.guides'),
    items: GUIDE_ROUTES.map((g) => ({ label: t(g.labelKey), value: guideValue(g.routeName) })),
  },
  ...categories.map((category) => ({
    label: t(`taxonomy.${category.key}`),
    items: category.components.map((name) => ({ label: name, value: name })),
  })),
])

const activeValue = computed(() => {
  if (route.name === 'component') return route.params.name as string
  if (typeof route.name === 'string') return guideValue(route.name)
  return null
})

function onSelect(item: MenuItemData) {
  if (!item.value) return
  const value = String(item.value)
  if (value.startsWith('guide:')) router.push({ name: value.slice('guide:'.length) })
  else router.push({ name: 'component', params: { name: value } })
}

// This sidebar IS the Resizable example. Its own component page points
// here rather than duplicating a fake one.
const sidebarWidth = shallowRef(Number(localStorage.getItem('vael-ui-docs-sidebar-width')) || 248)
watch(sidebarWidth, (w) => localStorage.setItem('vael-ui-docs-sidebar-width', String(w)))
</script>

<style scoped>
.sidebar-shell {
  flex-shrink: 0;
  height: calc(100vh - var(--docs-header-height));
  position: sticky;
  top: var(--docs-header-height);
  border-right: 1px solid var(--ui-border);
  background: color-mix(in oklch, var(--ui-muted) 40%, transparent);
  overflow: hidden;
}

.sidebar-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 1.25rem 1rem;
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

@media (max-width: 800px) {
  .sidebar-shell {
    width: 100% !important;
    height: auto;
    position: static;
  }
}
</style>
