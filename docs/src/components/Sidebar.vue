<template>
  <Resizable
    v-model:size="sidebarWidth"
    direction="horizontal"
    edge="end"
    :min="220"
    :max="360"
    aria-label="Resize sidebar"
    role="complementary"
    class="sidebar-shell"
  >
    <div class="sidebar-mode-toggle">
      <ModeSwitcher v-model="sidebarMode" @switch="goToMode" />
      <!-- Most people come to Motion or a composable from a component, and want to get back to it. -->
      <button
        v-if="sidebarMode !== 'components'"
        type="button"
        class="sidebar-back"
        @click="((sidebarMode = 'components'), goToMode('components'))"
      >
        <PhArrowLeft :size="13" aria-hidden="true" />
        {{ t('motionDocs.nav.back') }}
      </button>
    </div>
    <!-- MenuList renders the nav landmark itself. -->
    <div ref="sidebarScrollEl" v-scroll-mask class="sidebar-scroll">
      <span ref="sidebarIndicator" class="sidebar-indicator" aria-hidden="true" />
      <!-- A new mode's list slides in the way you went; the old one leaves the other way. -->
      <div
        :key="sidebarMode"
        v-animate="swap(sidebarMode)"
        :class="{ 'sidebar-over': sidebarMode !== 'components' }"
      >
        <MenuList :items="navItems" :active="activeValue" :aria-label="t('nav.sidebarNav')">
          <template #item="{ item }">
            <component
              :is="componentIcons[String(item.value)]"
              v-if="componentIcons[String(item.value)]"
              :size="16"
              class="sidebar-icon"
              aria-hidden="true"
            />
            <span class="ui-menu-list-item-label">{{ item.label }}</span>
            <PhArrowUpRight
              v-if="leavesSection(item.value)"
              :size="13"
              class="sidebar-link-icon"
              aria-hidden="true"
            />
            <template v-if="isNewBadge(item.value)">
              <span
                class="sidebar-new-dot"
                :data-new-key="seenKey(String(item.value))"
                aria-hidden="true"
              />
              <span class="sidebar-sr-only" :data-new-key="seenKey(String(item.value))">New</span>
            </template>
          </template>
        </MenuList>
      </div>
    </div>
  </Resizable>
  <Drawer v-model:open="mobileOpen" side="left" size="sm" :title="t('nav.menu')">
    <div class="sidebar-mode-toggle sidebar-mode-toggle--mobile">
      <ModeSwitcher v-model="sidebarMode" @switch="goToMode" />
      <button
        v-if="sidebarMode !== 'components'"
        type="button"
        class="sidebar-back"
        @click="((sidebarMode = 'components'), goToMode('components'))"
      >
        <PhArrowLeft :size="13" aria-hidden="true" />
        {{ t('motionDocs.nav.back') }}
      </button>
    </div>
    <div ref="mobileScrollEl" class="sidebar-scroll sidebar-scroll--mobile">
      <div
        :key="sidebarMode"
        v-animate="swap(sidebarMode)"
        :class="{ 'sidebar-over': sidebarMode !== 'components' }"
      >
        <MenuList
          :items="navItems"
          :active="activeValue"
          :aria-label="t('nav.sidebarNav')"
          @select="mobileOpen = false"
        >
          <template #item="{ item }">
            <component
              :is="componentIcons[String(item.value)]"
              v-if="componentIcons[String(item.value)]"
              :size="16"
              class="sidebar-icon"
              aria-hidden="true"
            />
            <span class="ui-menu-list-item-label">{{ item.label }}</span>
            <PhArrowUpRight
              v-if="leavesSection(item.value)"
              :size="13"
              class="sidebar-link-icon"
              aria-hidden="true"
            />
            <template v-if="isNewBadge(item.value)">
              <span
                class="sidebar-new-dot"
                :data-new-key="seenKey(String(item.value))"
                aria-hidden="true"
              />
              <span class="sidebar-sr-only" :data-new-key="seenKey(String(item.value))">New</span>
            </template>
          </template>
        </MenuList>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useLocalStorage, useScroll } from '@vueuse/core'
import { Drawer, MenuList, Resizable, vAnimate, vScrollMask } from 'vael-ui'
import ModeSwitcher from './ModeSwitcher.vue'
import { componentIcons } from '../componentIcons'
import { PhArrowLeft, PhArrowUpRight } from '@phosphor-icons/vue'
import type { MenuEntry, MenuListItemData } from 'vael-ui'
import { NEW_COMPONENTS, NEW_BADGE_DAYS } from '../taxonomy'
import { NEW_COMPOSABLES, composableCategories } from '../composablesTaxonomy'
import {
  composableValue,
  GUIDE_ROUTES,
  MOTION_LINK,
  MOTION_ROUTES,
  navSections,
  routeFor,
  valueFor,
} from '../docsNav'
import type { DocsMode } from '../docsNav'
import { useGlidingIndicator } from '../composables/useGlidingIndicator'

const mobileOpen = defineModel<boolean>('mobileOpen', { default: false })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// The page you're on picks the list: every Motion page shows Motion's, a component, directive
// or guide shows the components. A motion composable opened from the Motion list keeps that list.
function modeFor(routeName: unknown, current: DocsMode): DocsMode | null {
  if (MOTION_ROUTES.some((g) => g.routeName === routeName)) return 'motion'
  if (routeName === 'composable') return current === 'motion' ? 'motion' : 'composables'
  if (
    routeName === 'component' ||
    routeName === 'directive' ||
    GUIDE_ROUTES.some((g) => g.routeName === routeName)
  )
    return 'components'
  return null
}
// The first render follows the route alone, as the prerendered page did, so hydration never
// swaps the list. Browsing in the tab keeps the mode in this ref; a reload starts from the route.
const sidebarMode = shallowRef<DocsMode>(modeFor(route.name, 'components') ?? 'components')
// A mode switch is a push, like drilling into a page: Motion and Composables slide in over the
// components from the right edge as the components fall back a third and fade; back reverses it.
// One spring for both, so they move as one. Never on the first render: no page loads moving.
const switched = shallowRef(false)
watch(sidebarMode, () => (switched.value = true))
const swap = (mode: DocsMode) => {
  const away = mode === 'components' ? { x: '-30%', opacity: 0 } : { x: '100%' }
  return {
    initial: switched.value ? away : undefined,
    exit: away,
    spring: { damping: 1, response: 0.4 },
  }
}

// In the components' sidebar, the Motion row is marked like a link: it opens its own section.
const leavesSection = (value: unknown) =>
  sidebarMode.value === 'components' && value === MOTION_LINK

// Switching modes takes you there: back to the last component or composable you read, or to
// the section's first page. A reload then lands where the switch took you.
const LAST_KEY = 'vael-ui-docs-last'
function remembered(kind: 'component' | 'composable'): string | null {
  try {
    return sessionStorage.getItem(`${LAST_KEY}-${kind}`)
  } catch {
    return null
  }
}
watch(
  () => [route.name, route.params.name] as const,
  ([name, param]) => {
    if ((name === 'component' || name === 'composable') && typeof param === 'string')
      try {
        sessionStorage.setItem(`${LAST_KEY}-${name}`, param)
      } catch {}
  },
  { immediate: true },
)
function goToMode(mode: DocsMode) {
  if (mode === 'motion') return router.push({ name: 'motion-overview' })
  if (mode === 'composables') {
    const name = remembered('composable') ?? composableCategories[0]!.items[0]!
    return router.push({ name: 'composable', params: { name } })
  }
  const name = remembered('component')
  return router.push(name ? { name: 'component', params: { name } } : { name: 'getting-started' })
}
watch(
  () => route.name,
  (routeName) => {
    const mode = modeFor(routeName, sidebarMode.value)
    if (mode) sidebarMode.value = mode
  },
)

// Real routes for real <a> tags: MenuList's `as: 'RouterLink'` renders actual hrefs, so
// cmd/ctrl/middle-click and "open in new tab" all work natively.
const navItems = computed<MenuEntry<MenuListItemData>[]>(() =>
  navSections(sidebarMode.value, t).map((section) => ({
    label: section.label,
    items: section.items.map((item) => ({
      ...item,
      as: 'RouterLink',
      attrs: { to: routeFor(item.value) },
    })),
  })),
)

// The indicator re-renders in the same frame as the whole next page (demos,
// API tables), so on a slow device it trails the click by that page's render
// time. Navigation start (`beforeEach`) moves it immediately, then holds the
// navigation until that frame has painted, so the click gets feedback first
// and the page follows a frame later. `afterEach`, which also runs for
// failed or cancelled navigations, hands control back to the real route.
const pendingValue = shallowRef<string | null>(null)
const removeBeforeEach = router.beforeEach(async (to) => {
  const next = valueFor(to)
  if (next === null || next === valueFor(route)) return
  pendingValue.value = next
  await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve)))
})
const removeAfterEach = router.afterEach(() => {
  pendingValue.value = null
})
onScopeDispose(() => {
  removeBeforeEach()
  removeAfterEach()
})

const activeValue = computed(() => pendingValue.value ?? valueFor(route))

// Which component pages the visitor has already seen — dismisses that component's sidebar
// "new" dot for good, whether they got there by clicking the sidebar row, a direct link, or
// browser back/forward (see the activeValue watcher below, the single place this is written).
// Components by name, composables by their sidebar value.
const NEW_ITEMS: Record<string, string> = {
  ...NEW_COMPONENTS,
  ...Object.fromEntries(
    Object.entries(NEW_COMPOSABLES).map(([name, date]) => [composableValue(name), date]),
  ),
}
const seenNewComponents = useLocalStorage<string[]>('vael-ui-docs-seen-new-components', [])
// Keyed by date too, so a component improved again shows its dot again.
const seenKey = (value: string) => `${value}@${NEW_ITEMS[value]}`
watch(
  activeValue,
  (value) => {
    if (
      typeof value === 'string' &&
      NEW_ITEMS[value] &&
      !seenNewComponents.value.includes(seenKey(value))
    ) {
      seenNewComponents.value = [...seenNewComponents.value, seenKey(value)]
    }
  },
  { immediate: true },
)

// Until mounted, every dot renders as in the prerendered page so hydration matches; the
// inline script in index.html already hid the seen ones before the first paint.
const mounted = shallowRef(false)
onMounted(() => (mounted.value = true))
function isNewBadge(value: string | number | null | undefined): boolean {
  if (typeof value !== 'string') return false
  const since = NEW_ITEMS[value]
  if (!since || (mounted.value && seenNewComponents.value.includes(seenKey(value)))) return false
  const ageDays = (Date.now() - new Date(since).getTime()) / 86_400_000
  return ageDays >= 0 && ageDays <= NEW_BADGE_DAYS
}

// This sidebar IS the Resizable example. Its own component page points
// here rather than duplicating a fake one.
const sidebarWidth = useLocalStorage('vael-ui-docs-sidebar-width', 248)

const sidebarScrollEl = useTemplateRef<HTMLElement>('sidebarScrollEl')

// One bar gliding to the current page instead of a bar per row. -8 px sits
// it in the gutter left of the row, where the per-row bar used to be.
const sidebarIndicator = useTemplateRef<HTMLElement>('sidebarIndicator')
// A mode switch is a new list, not a move: the bar hides while it's pushed in, then sits on its
// row once it lands (the leaving list's row is inert and never the one).
const pushing = shallowRef(false)
let landing: ReturnType<typeof setTimeout> | undefined
watch(sidebarMode, () => {
  pushing.value = true
  clearTimeout(landing)
  landing = setTimeout(() => (pushing.value = false), 500)
})
onScopeDispose(() => clearTimeout(landing))
useGlidingIndicator(
  sidebarScrollEl,
  sidebarIndicator,
  () =>
    pushing.value
      ? null
      : [
          ...(sidebarScrollEl.value?.querySelectorAll<HTMLElement>('[aria-current="page"]') ?? []),
        ].find((row) => !row.closest('[inert]')),
  () => [activeValue.value, sidebarMode.value, pushing.value],
  -8,
)
const persistedScrollTop = useLocalStorage('vael-ui-docs-sidebar-scroll', 0)
const { y: scrollY } = useScroll(sidebarScrollEl)
watch(scrollY, (y) => (persistedScrollTop.value = y))

// The saved scroll belongs to whichever list was showing. If the current page's row is out of
// view (the other list, a page reached by search), bring it into view a third of the way down;
// with no row for this page in the list, start at the top.
function revealCurrentRow() {
  const box = sidebarScrollEl.value
  if (!box) return
  const row = box.querySelector<HTMLElement>('[aria-current="page"]')
  if (!row) {
    box.scrollTop = 0
    return
  }
  const rowRect = row.getBoundingClientRect()
  const boxRect = box.getBoundingClientRect()
  if (rowRect.top >= boxRect.top && rowRect.bottom <= boxRect.bottom) return
  box.scrollTop += rowRect.top - boxRect.top - boxRect.height / 3
}
onMounted(() => {
  nextTick(() => {
    scrollY.value = persistedScrollTop.value
    revealCurrentRow()
  })
})
watch([sidebarMode, activeValue], () => nextTick(revealCurrentRow), { flush: 'post' })

// The drawer's body is built fresh each time it opens, so it would start at
// the top. Keep where the visitor was in the list and put them back there.
const mobileScrollEl = useTemplateRef<HTMLElement>('mobileScrollEl')
let mobileScrollTop = 0
const rememberMobileScroll = (event: Event) =>
  (mobileScrollTop = (event.target as HTMLElement).scrollTop)
watch(
  mobileScrollEl,
  (el) => {
    const body = el?.closest<HTMLElement>('.ui-dialog-body')
    if (!body) return
    body.scrollTop = mobileScrollTop
    body.addEventListener('scroll', rememberMobileScroll, { passive: true })
  },
  { flush: 'post' },
)
</script>

<style scoped>
/* Quiet beside the name: outlined, muted, the name's own weight. */
.sidebar-icon {
  flex: none;
  color: var(--ui-text-muted);
}

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
  flex-direction: column;
  align-items: flex-start;
  padding: 1rem 1rem 0;
}

.sidebar-mode-toggle--mobile {
  padding: 1rem;
  border-bottom: 1px solid var(--ui-border);
}

.sidebar-scroll {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  /* Hitting the end of the nav shouldn't start scrolling the page behind it. */
  overscroll-behavior: contain;
  padding: 1.25rem 1rem;
}

/* The list pushed in covers the one under it, in the sidebar's own colour. */
.sidebar-over {
  background: color-mix(in oklch, var(--ui-muted) 40%, var(--ui-surface));
}

.sidebar-indicator {
  position: absolute;
  top: 0;
  z-index: 1;
  width: 2px;
  /* As tall as the row it marks. */
  border-radius: 9999px;
  background: var(--ui-primary);
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms var(--ui-ease-out);
}
/* A faint dither on the selected row, feathering out from the bar before it reaches the text. */
.sidebar-indicator::after {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 100%;
  inline-size: 2rem;
  background: radial-gradient(circle, var(--ui-primary) 0.6px, transparent 0.9px) 0 0 / 3px 3px;
  opacity: 0.35;
  mask-image: linear-gradient(to right, #000, transparent);
}

/* The drawer body scrolls; this box would trap the scroll otherwise. */
.sidebar-scroll--mobile {
  height: auto;
  padding: 0;
  overflow: visible;
  overscroll-behavior: auto;
}

.sidebar-scroll :deep(.ui-menu-list-item) {
  position: relative;
  font-size: 0.85rem;
  padding-block: 0.4rem;
}

.sidebar-scroll :deep(.ui-menu-list-item--group) {
  font-size: 0.72rem;
}

.sidebar-scroll {
  --ui-indicator-bg: color-mix(in oklch, var(--ui-primary) 10%, transparent);
}

/* Sidebar rows have no shortcut hints to push right, unlike Menu/ContextMenu
   usage — so the label doesn't need to claim the row's full remaining width,
   and the dot can sit right after the text instead of at the row's far edge. */
.sidebar-scroll :deep(.ui-menu-list-item-label) {
  flex: initial;
}

.sidebar-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-block-start: 0.6rem;
  padding: 0.15rem 0.25rem;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--ui-text-muted);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: color var(--ui-duration-press) var(--ui-ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .sidebar-back:hover {
    color: var(--ui-text);
  }
}
.sidebar-back:focus-visible {
  outline: 2px solid var(--ui-ring, var(--ui-primary));
  outline-offset: 2px;
}

.sidebar-link-icon {
  flex-shrink: 0;
  margin-inline-start: 0.3rem;
  color: var(--ui-text-muted);
}

.sidebar-new-dot {
  flex-shrink: 0;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--docs-accent, var(--ui-info));
  margin-inline-start: 0.375rem;
}

.sidebar-sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* The mobile drawer keeps a per-row bar; the desktop sidebar glides one. */
.sidebar-scroll--mobile :deep(.ui-menu-list-item[aria-current='page']::before) {
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
