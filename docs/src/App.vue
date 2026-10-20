<template>
  <ConfigProvider :theme="theme" :size="uiSize" :motion-css="motion" :i18n="i18n">
    <div class="app-shell" :style="accent ? { '--docs-accent': accent } : undefined">
      <header class="app-header">
        <RouterLink to="/" class="brand">
          <Logo :size="22" class="brand-logo" />
          <span class="brand-text"
            ><span class="brand-vael">vael</span><span class="brand-hyphen">-</span
            ><span class="brand-ui">ui</span></span
          >
          <Tag size="sm" variant="primary" class="brand-version">
            <template #icon><PhTag :size="12" weight="bold" /></template>
            v{{ version }}
          </Tag>
        </RouterLink>
        <nav class="main-nav" :aria-label="t('nav.mainNav')">
          <RouterLink to="/docs/getting-started">{{ t('nav.gettingStarted') }}</RouterLink>
          <a href="https://github.com/Mini-Sylar/vael-ui" target="_blank" rel="noreferrer">{{
            t('nav.github')
          }}</a>
          <a
            class="sponsor-link"
            href="https://github.com/sponsors/Mini-Sylar"
            target="_blank"
            rel="noreferrer"
          >
            <PhHeart :size="15" weight="fill" class="sponsor-heart" />
            {{ t('nav.sponsor') }}
          </a>
        </nav>
        <div class="header-controls">
          <SiteSearch class="header-search" />
          <SelectButton
            v-model="defaultVariant"
            size="sm"
            class="header-variant"
            :allow-empty="false"
            :items="[
              { label: t('component.vdom'), value: 'vdom' },
              { label: t('component.vapor'), value: 'vapor' },
            ]"
            :aria-label="t('header.defaultMode')"
          />
          <div class="header-desktop-controls">
            <Popover v-model:open="themeOpen">
              <template #trigger="{ setTriggerEl }">
                <Button
                  :ref="setTriggerEl"
                  variant="ghost"
                  size="sm"
                  icon
                  :aria-label="t('header.theme')"
                  @click="themeOpen = !themeOpen"
                >
                  <PhPalette :size="18" />
                </Button>
              </template>
              <template #default>
                <div class="theme-panel">
                  <div class="theme-row">
                    <span>{{ t('header.primaryColor') }}</span>
                    <ThemeSwatches />
                  </div>
                  <label class="theme-row">
                    <span>{{ t('header.radius') }}</span>
                    <Select
                      :model-value="radiusChoice"
                      class="radius-select"
                      :aria-label="t('header.radius')"
                      :items="radiusItems"
                      @update:model-value="onRadiusChange"
                    />
                  </label>
                  <label class="theme-row">
                    <span>{{ t('header.fontSize') }}</span>
                    <span class="settings-slider">
                      <span class="settings-value">{{ fontSize }}px</span>
                      <Slider
                        :model-value="fontSize"
                        :aria-label="t('header.fontSize')"
                        :min="12"
                        :max="18"
                        :step="1"
                        class="font-slider"
                        @update:model-value="(v) => (fontSize = v as number)"
                      />
                    </span>
                  </label>
                  <label class="theme-row">
                    <span>{{ t('header.size') }}</span>
                    <SelectButton
                      v-model="uiSize"
                      :aria-label="t('header.size')"
                      :allow-empty="false"
                      :items="sizeItems"
                    />
                  </label>
                  <label class="theme-row">
                    <span>{{ t('header.animations') }}</span>
                    <Switch v-model="motion" />
                  </label>
                </div>
              </template>
            </Popover>
            <Select
              :model-value="locale"
              size="sm"
              class="locale-select"
              :items="localeItems"
              :aria-label="t('header.locale')"
              @update:model-value="onLocaleChange"
            />
            <Button
              variant="ghost"
              size="sm"
              icon
              :aria-label="t('header.colorScheme')"
              @click="setMode(resolvedMode === 'dark' ? 'light' : 'dark')"
            >
              <!-- Both icons, picked by CSS: the prerendered HTML can't know the saved theme, so a
                   v-if showed the light icon in dark mode until the app hydrated. -->
              <PhSun class="mode-icon mode-icon--sun" :size="18" aria-hidden="true" />
              <PhMoon class="mode-icon mode-icon--moon" :size="18" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>
      <div class="app-body">
        <Sidebar v-model:mobile-open="mobileNavOpen" />
        <main class="app-content">
          <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </main>
      </div>
    </div>

    <Dock
      class="mobile-dock"
      :class="{ 'mobile-dock--hidden': dockHidden }"
      :inert="dockHidden"
      :items="mobileDockItems"
      :base-size="narrowPhone ? 40 : 48"
      magnify
      tooltips
    />
    <Tour v-model:open="dockTourOpen" :steps="dockTourSteps" :scroll-into-view="false" />

    <BottomSheet
      v-model:open="mobileSettingsOpen"
      :title="t('header.settings')"
      width="md"
      :snap-points="settingsSnapPoints"
    >
      <div class="mobile-settings">
        <section class="settings-group" aria-labelledby="settings-appearance">
          <h3 id="settings-appearance" class="settings-heading">{{ t('header.appearance') }}</h3>
          <label class="theme-row">
            <span>{{ t('header.mode') }}</span>
            <SelectButton
              :model-value="mode"
              :allow-empty="false"
              :items="appearanceItems"
              :aria-label="t('header.mode')"
              @update:model-value="(value) => setMode(value as ColorSchemeMode)"
            />
          </label>
          <div class="theme-row">
            <span>{{ t('header.primaryColor') }}</span>
            <ThemeSwatches />
          </div>
          <label class="theme-row">
            <span>{{ t('header.radius') }}</span>
            <Select
              :model-value="radiusChoice"
              class="radius-select"
              :aria-label="t('header.radius')"
              :items="radiusItems"
              @update:model-value="onRadiusChange"
            />
          </label>
          <label class="theme-row">
            <span>{{ t('header.fontSize') }}</span>
            <span class="settings-slider">
              <span class="settings-value">{{ fontSize }}px</span>
              <Slider
                :model-value="fontSize"
                :aria-label="t('header.fontSize')"
                :min="12"
                :max="18"
                :step="1"
                class="font-slider"
                @update:model-value="(v) => (fontSize = v as number)"
              />
            </span>
          </label>
          <label class="theme-row">
            <span>{{ t('header.size') }}</span>
            <SelectButton
              v-model="uiSize"
              :allow-empty="false"
              :items="sizeItems"
              :aria-label="t('header.size')"
            />
          </label>
          <label class="theme-row">
            <span>{{ t('header.animations') }}</span>
            <Switch v-model="motion" />
          </label>
        </section>
        <section class="settings-group" aria-labelledby="settings-general">
          <h3 id="settings-general" class="settings-heading">{{ t('header.general') }}</h3>
          <label class="theme-row">
            <span>{{ t('header.locale') }}</span>
            <Select
              :model-value="locale"
              class="locale-select"
              :items="localeItems"
              :aria-label="t('header.locale')"
              @update:model-value="onLocaleChange"
            />
          </label>
          <div class="theme-row">
            <span>{{ t('dockTour.replayLabel') }}</span>
            <Button variant="outline" @click="replayDockTour">
              {{ t('dockTour.replay') }}
            </Button>
          </div>
        </section>
      </div>
    </BottomSheet>

    <!-- Global singletons every real consumer app mounts once. Without
         them, v-tooltip/openDialog()/openPopover()/toast() demos render
         nothing at all. Toaster's own page runs a second, page-local
         instance to demo its props live — since the toast queue is a real
         singleton, both would render every fired toast, so this one steps
         aside there. -->
    <TooltipHost />
    <DialogHost />
    <PopoverHost />
    <Toaster v-if="!isToasterPage" />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, provide, shallowRef, watch, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener, useLocalStorage, useMediaQuery } from '@vueuse/core'
import {
  PhGear,
  PhHeart,
  PhHouse,
  PhMagnifyingGlass,
  PhSquaresFour,
  PhMoon,
  PhPalette,
  PhSun,
  PhTag,
} from '@phosphor-icons/vue'
import {
  BottomSheet,
  Button,
  ConfigProvider,
  DialogHost,
  Dock,
  openPopover,
  Popover,
  PopoverHost,
  Select,
  SelectButton,
  Slider,
  Switch,
  Tag,
  Toaster,
  TooltipHost,
  Tour,
  useColorScheme,
} from 'vael-ui'
import type { ColorSchemeMode, DockItemData, TourStep } from 'vael-ui'
import Sidebar from './components/Sidebar.vue'
import SiteSearch from './components/SiteSearch.vue'
import { siteSearchOpen } from './siteSearch'
import { docsSettingsKey } from './docsSettings'
import SupportMenu from './components/SupportMenu.vue'
import Logo from './components/Logo.vue'
import { setLocale, SUPPORTED_LOCALES, type Locale } from './i18n'
import { defaultVariant, primaryColor, readableAccent } from './preferences'
import { useHead } from '@unhead/vue'

// Lazy: it pulls in motion, which the rest of the shell doesn't need up front.
const ThemeSwatches = defineAsyncComponent(() => import('./components/ThemeSwatches.vue'))

const version = shallowRef(__VAEL_UI_VERSION__)

// Someone who visited before had the menu in the header and the scheme toggle
// in the dock; a first visit has nothing to relearn. Read here, before the
// shell and the sidebar write their own keys.
const DOCK_TOUR_KEY = 'vael-ui-docs-dock-tour-seen'
const isReturningVisitor = (() => {
  if (typeof localStorage === 'undefined') return false
  try {
    return [
      'vael-ui-docs-theme',
      'vael-ui-docs-radius',
      'vael-ui-docs-font-size',
      'vael-ui-docs-motion',
      'vael-ui-docs-sidebar-width',
      'vael-ui-docs-sidebar-scroll',
    ].some((key) => localStorage.getItem(key) !== null)
  } catch {
    return false
  }
})()

onMounted(() => {
  const root = document.documentElement
  if (!root.hasAttribute('data-docs-theme-bootstrap')) return
  for (const token of [
    '--ui-radius',
    '--ui-primary',
    '--ui-primary-contrast',
    '--ui-primary-hover',
    '--docs-accent',
  ]) {
    root.style.removeProperty(token)
  }
  root.removeAttribute('data-docs-theme-bootstrap')
})

onMounted(async () => {
  try {
    const res = await fetch('https://registry.npmjs.org/vael-ui/latest', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    if (typeof data.version === 'string') version.value = data.version
  } catch {
    // Offline, blocked by CSP, registry down — keep the build-time fallback.
  }
})

const route = useRoute()
const router = useRouter()
const canonicalUrl = computed(() => `https://vael-ui.dev${route.path}`)

useHead({
  titleTemplate: (title) => (title ? `${title} — Vael-ui` : 'Vael-ui'),
  link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
  meta: [
    {
      name: 'description',
      content:
        'A Vue 3 UI library with a real Vue Vapor build, animation-agnostic components, and full i18n support.',
    },
    { name: 'robots', content: 'index, follow' },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'vael-ui' },
    { property: 'og:url', content: () => canonicalUrl.value },
    {
      property: 'og:image',
      content: 'https://vael-ui.dev/og-image.png',
    },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    {
      property: 'og:image:alt',
      content: 'vael-ui — a Vue 3 UI library with a real Vue Vapor build',
    },
    { name: 'twitter:card', content: 'summary_large_image' },
    {
      name: 'twitter:image',
      content: 'https://vael-ui.dev/og-image.png',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'vael-ui',
        url: 'https://vael-ui.dev',
        description:
          'A Vue 3 UI library with a real Vue Vapor build, animation-agnostic components, and full i18n support.',
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: 'vael-ui',
        description: 'Animation-agnostic Vue 3 UI library with full Vue Vapor support.',
        url: 'https://vael-ui.dev',
        codeRepository: 'https://github.com/Mini-Sylar/vael-ui',
        programmingLanguage: 'TypeScript',
        runtimePlatform: 'Vue 3',
        license: 'https://opensource.org/licenses/MIT',
      }),
    },
  ],
})
const isToasterPage = computed(() => route.name === 'component' && route.params.name === 'Toaster')

const themeOpen = shallowRef(false)
const mobileNavOpen = shallowRef(false)
const mobileSettingsOpen = shallowRef(false)

const i18n = useI18n()
const { t } = i18n
const locale = useLocalStorage<Locale>('vael-ui-docs-locale', 'en')
watch(locale, (l) => setLocale(l), { immediate: true })

const localeItems = SUPPORTED_LOCALES.map((l) => ({
  label: l.toUpperCase(),
  value: l,
}))
function onLocaleChange(value: string | number | (string | number)[] | null) {
  if (typeof value === 'string') locale.value = value as Locale
}

const { mode, resolvedMode, setMode } = useColorScheme({
  persist: {
    get: () => localStorage.getItem('vael-ui-docs-theme'),
    set: (m) => localStorage.setItem('vael-ui-docs-theme', m ?? ''),
  },
})

function updateBrowserThemeColor() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = resolvedMode.value === 'dark' ? '#1f1f23' : '#ffffff'
}

watch(resolvedMode, updateBrowserThemeColor)
onMounted(updateBrowserThemeColor)

// Taller than the default 60%: every setting shows on most phones, and it pulls up further.
const settingsSnapPoints = [
  { id: 'open', height: 0.75 },
  { id: 'full', height: 0.92 },
]

const appearanceItems = computed(() => [
  { label: t('header.light'), value: 'light' },
  { label: t('header.dark'), value: 'dark' },
  { label: t('header.system'), value: 'system' },
])

// The smallest phones, or a larger font: five 48px items plus the dock's padding outgrow the
// screen, the browser zooms the page out and the dock lands below the visible area.
const narrowPhone = useMediaQuery('(max-width: 359px)')

const mobileDockItems = computed<DockItemData[]>(() => [
  {
    label: t('nav.home'),
    icon: PhHouse,
    onSelect: () => router.push('/'),
  },
  {
    label: t('nav.components'),
    icon: PhSquaresFour,
    onSelect: () => (mobileNavOpen.value = true),
  },
  {
    label: t('nav.searchShort'),
    icon: PhMagnifyingGlass,
    onSelect: openSearch,
  },
  {
    label: t('header.settings'),
    icon: PhGear,
    onSelect: () => (mobileSettingsOpen.value = true),
  },
  {
    label: t('nav.support'),
    // Filled and pink like the header's heart, so it stands out in the dock.
    icon: () => h(PhHeart, { weight: 'fill', class: 'sponsor-heart' }),
    onSelect: openSupportMenu,
  },
])

// The same palette as the header's search and ⌘K, in reach of the thumb.
function openSearch() {
  siteSearchOpen.value = true
}

// GitHub and sponsoring share the heart: a small menu above it.
function openSupportMenu() {
  const items = document.querySelectorAll<HTMLElement>('.mobile-dock .ui-dock-item')
  const heart = items[items.length - 1]
  if (heart) openPopover(SupportMenu, { triggerEl: heart, side: 'top', align: 'end' })
}

// The mobile dock floats over the page, so it slides away while scrolling
// down (reading, or reaching for a control under it) and returns on scroll up
// or at the end of the page, where the content's bottom padding clears it.
const dockHidden = shallowRef(false)
let lastScrollY = 0
useEventListener(
  typeof window === 'undefined' ? undefined : window,
  'scroll',
  () => {
    const y = window.scrollY
    const delta = y - lastScrollY
    if (Math.abs(delta) < 6) return
    const atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 8
    dockHidden.value = delta > 0 && y > 64 && !atEnd
    lastScrollY = y
  },
  { passive: true },
)

// Once, on a phone, for a returning visitor: the menu moved into the dock and
// the scheme toggle into Settings. Two steps on the dock itself.
const dockTourOpen = shallowRef(false)
const dockTourSteps = shallowRef<TourStep[]>([])
let dockTourPending = false
function openDockTour() {
  const items = document.querySelectorAll<HTMLElement>('.mobile-dock .ui-dock-item')
  const variant = document.querySelector<HTMLElement>('.header-variant')
  if (items.length < 4 || !variant || dockHidden.value) return
  dockTourPending = false
  dockTourSteps.value = [
    {
      target: items[1]!,
      side: 'top',
      title: t('dockTour.componentsTitle'),
      description: t('dockTour.componentsDescription'),
    },
    {
      target: items[2]!,
      side: 'top',
      title: t('dockTour.searchTitle'),
      description: t('dockTour.searchDescription'),
    },
    {
      target: variant,
      side: 'bottom',
      title: t('dockTour.variantTitle'),
      description: t('dockTour.variantDescription'),
    },
    {
      target: items[3]!,
      side: 'top',
      title: t('dockTour.settingsTitle'),
      description: t('dockTour.settingsDescription'),
    },
  ]
  dockTourOpen.value = true
  try {
    localStorage.setItem(DOCK_TOUR_KEY, '1')
  } catch {
    // Private mode: it may show again next visit, which is harmless.
  }
}
onMounted(() => {
  try {
    if (localStorage.getItem(DOCK_TOUR_KEY)) return
    // Nothing moved for a first visit, so it never needs the tour.
    if (!isReturningVisitor) return localStorage.setItem(DOCK_TOUR_KEY, '1')
  } catch {
    return
  }
  if (!window.matchMedia('(max-width: 850px)').matches) return
  dockTourPending = true
  // After the page settles, so it doesn't land on top of the first paint.
  setTimeout(openDockTour, 1200)
})
// From Settings: close the sheet first, so the tour lands on the dock rather than under the sheet.
function replayDockTour() {
  mobileSettingsOpen.value = false
  dockHidden.value = false
  setTimeout(openDockTour, 450)
}

// The dock was scrolled away when the timer fired: show it once the dock is back.
watch(dockHidden, (hidden) => {
  if (!hidden && dockTourPending) openDockTour()
})

const radiusItems = [
  { label: t('header.radiusDefault'), value: 'default' },
  { label: t('header.radiusSharp'), value: '0px' },
  { label: t('header.radiusSoft'), value: '6px' },
  { label: t('header.radiusRounded'), value: '16px' },
  { label: t('header.radiusPill'), value: '999px' },
]
function initialRadiusChoice(): string {
  if (typeof localStorage === 'undefined') return 'default'
  try {
    const saved = localStorage.getItem('vael-ui-docs-radius')
    return saved && radiusItems.some((item) => item.value === saved) ? saved : 'default'
  } catch {
    return 'default'
  }
}
const radiusChoice = shallowRef(initialRadiusChoice())
watch(radiusChoice, (r) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem('vael-ui-docs-radius', r)
})
function onRadiusChange(value: string | number | (string | number)[] | null) {
  if (typeof value === 'string') radiusChoice.value = value
}

function storedFontSize(): number {
  try {
    const stored = Number(localStorage.getItem('vael-ui-docs-font-size'))
    return Number.isInteger(stored) && stored >= 12 && stored <= 18 ? stored : 14
  } catch {
    return 14
  }
}
const fontSize = shallowRef(typeof localStorage === 'undefined' ? 14 : storedFontSize())
watch(fontSize, (f) => {
  try {
    localStorage.setItem('vael-ui-docs-font-size', String(f))
  } catch {}
  document.documentElement.style.setProperty('--docs-font-size', `${f}px`)
})

// ConfigProvider defaults, so every component on the site follows them.
const uiSize = useLocalStorage<'sm' | 'md' | 'lg'>('vael-ui-docs-size', 'md')
const motion = useLocalStorage('vael-ui-docs-motion', true)

// The search palette's actions change these, so it gets them from here.
provide(docsSettingsKey, { mode, setMode, size: uiSize, motion, locale })
const sizeItems = computed(() => [
  { label: t('header.sizeSm'), value: 'sm' },
  { label: t('header.sizeMd'), value: 'md' },
  { label: t('header.sizeLg'), value: 'lg' },
])

// The page gets a readable shade of the picked accent; the swatches keep showing the pick itself.
const accent = computed(() =>
  primaryColor.value ? readableAccent(primaryColor.value, resolvedMode.value === 'dark') : null,
)
const theme = computed(() => ({
  ...(accent.value ? { primary: accent.value } : {}),
  ...(radiusChoice.value !== 'default' ? { radius: radiusChoice.value } : {}),
}))
</script>

<style scoped>
/* Follows the same signals as the page's colours (index.html restores data-theme before paint). */
.mode-icon--sun {
  display: none;
}
:root[data-theme='dark'] .mode-icon--sun {
  display: block;
}
:root[data-theme='dark'] .mode-icon--moon {
  display: none;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .mode-icon--sun {
    display: block;
  }
  :root:not([data-theme='light']) .mode-icon--moon {
    display: none;
  }
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* The picked accent as a foreground ink (headline word, charts), else plain
     text. Declared here, where App.vue sets --docs-accent, so it resolves. */
  --docs-accent-ink: var(--docs-accent, var(--ui-text));
}

/* Dark mode lifts the ink a little: a saturated accent at full strength sinks
   into the dark surface. */
:root[data-theme='dark'] .app-shell {
  --docs-accent-ink: color-mix(in oklch, var(--docs-accent, var(--ui-text)) 78%, white);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .app-shell {
    --docs-accent-ink: color-mix(in oklch, var(--docs-accent, var(--ui-text)) 78%, white);
  }
}

.app-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: var(--docs-header-height);
  padding: 0 1.25rem;
  border-bottom: 1px solid var(--ui-border);
  position: sticky;
  top: 0;
  background: color-mix(in oklch, var(--ui-surface) 85%, transparent);
  backdrop-filter: blur(12px) saturate(1.4);
  z-index: 10;
}

@media (prefers-reduced-transparency: reduce) {
  .app-header {
    background: var(--ui-surface);
    backdrop-filter: none;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  color: var(--ui-text);
}

/* On the narrowest phones the header keeps the logo and the Vue DOM and Vapor toggle; the
   version tag would push it past the screen's edge. */
@media (max-width: 399px) {
  .brand :deep(.brand-version) {
    display: none;
  }
}

.brand-text {
  white-space: nowrap;
}

.brand .brand-logo {
  color: var(--ui-primary);
}

.brand-vael {
  color: var(--ui-text);
}

.brand-hyphen {
  color: var(--ui-text-muted);
}

.brand-ui {
  color: var(--ui-primary);
}

.main-nav {
  display: flex;
  gap: 1.25rem;
  flex: 1;
}

.main-nav a {
  font-size: 0.9rem;
  white-space: nowrap;
  text-decoration: none;
  color: var(--ui-text-muted);
}

.main-nav a:hover {
  color: var(--ui-primary);
}

.main-nav .sponsor-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

/* On a narrower desktop the search gives way; the heart and the toggle keep their size. */
.sponsor-link .sponsor-heart,
.header-controls :deep(.header-variant) {
  flex: none;
}

.main-nav a.router-link-active {
  color: var(--ui-primary);
  font-weight: 600;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-inline-start: auto;
  min-width: 0;
}

.header-desktop-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sponsor-heart,
.mobile-dock :deep(.sponsor-heart) {
  color: #db61a2;
}
/* Two quick beats on hover or keyboard focus; never a loop that pulls focus from the docs. */
.sponsor-link:focus-visible .sponsor-heart {
  animation: sponsor-beat 650ms var(--ui-ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .sponsor-link:hover .sponsor-heart {
    animation: sponsor-beat 650ms var(--ui-ease-out);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sponsor-link .sponsor-heart {
    animation: none;
  }
}
@keyframes sponsor-beat {
  0%,
  60%,
  100% {
    transform: scale(1);
  }
  15% {
    transform: scale(1.22);
  }
  30% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.12);
  }
}

/* Room for the placeholder and the shortcut badge; it gives way only on narrow screens.
   Its height comes from the row (the Vue DOM and Vapor toggle), so the two always match. */
:deep(.header-search) {
  flex: 0 1 16rem;
  min-width: 8rem;
  align-self: stretch;
  block-size: auto;
}

.mobile-settings {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Grouped like a phone's own settings: a quiet label, then rows of touch
   height split by hairlines. Scoped here; the desktop popover keeps its rows. */
.settings-group {
  display: flex;
  flex-direction: column;
}

.settings-heading {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

.mobile-settings .theme-row {
  min-block-size: 3rem;
  padding-block: 0.5rem;
  font-size: 0.9rem;
}

.mobile-settings .theme-row + .theme-row {
  border-block-start: 1px solid var(--ui-border);
}

.settings-slider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.settings-value {
  min-inline-size: 2.5rem;
  text-align: end;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}

.mobile-dock {
  display: none;
}

.theme-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem;
  min-width: 12rem;
}

.theme-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.85rem;
}

.radius-select {
  width: 9rem;
}

.font-slider {
  width: 8rem;
}

/* Select has more than one root, so a scoped class on it never applies: reach it through the
   parent. As a flex item it was squeezed a pixel under its width, which cut "EN" to "E…". */
.header-controls :deep(.locale-select),
.mobile-settings :deep(.locale-select) {
  flex: none;
}

.app-body {
  display: flex;
  flex: 1;
}

.app-content {
  flex: 1;
  min-width: 0;
  padding: 2.5rem 3.5rem 4rem;
}

@media (max-width: 850px) {
  .main-nav {
    display: none;
  }

  .header-desktop-controls {
    display: none;
  }

  /* Search sits in the dock on a phone; the header keeps the Vue DOM and Vapor choice. */
  :deep(.header-search) {
    display: none;
  }

  .app-header {
    gap: 0.75rem;
    padding-inline: 0.75rem;
  }

  .app-content {
    padding: 1.5rem 1.25rem 6rem;
  }

  .mobile-dock {
    display: flex;
    position: fixed;
    inset-inline: 0;
    bottom: 1rem;
    inline-size: fit-content;
    margin-inline: auto;
    z-index: 20;
    transition:
      translate var(--ui-duration-exit) var(--ui-ease-out),
      opacity var(--ui-duration-exit) var(--ui-ease-out);
  }

  .mobile-dock--hidden {
    translate: 0 calc(100% + 1.5rem);
    opacity: 0;
  }
}

@media (max-width: 850px) and (prefers-reduced-motion: reduce) {
  .mobile-dock {
    transition: opacity var(--ui-duration-exit) linear;
  }

  .mobile-dock--hidden {
    translate: none;
  }
}
</style>

<style>
/* Global (not scoped): applies to whatever route component's root element
   Vue mounts, which carries that component's own scope id, not App.vue's. */
.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--ui-duration-enter) var(--ui-ease-out),
    transform var(--ui-duration-enter) var(--ui-ease-out);
}

.page-leave-active {
  transition-duration: var(--ui-duration-exit);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: opacity var(--ui-duration-enter) var(--ui-ease-out);
  }

  .page-enter-from,
  .page-leave-to {
    transform: none;
  }
}
</style>
