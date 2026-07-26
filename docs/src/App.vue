<template>
  <ConfigProvider :theme="theme">
    <div class="app-shell">
      <header class="app-header">
        <RouterLink to="/" class="brand">{{ t('nav.home') }}</RouterLink>
        <nav class="main-nav">
          <RouterLink to="/docs/getting-started">{{ t('nav.gettingStarted') }}</RouterLink>
          <RouterLink to="/docs/guides/global-setup">{{ t('nav.globalSetup') }}</RouterLink>
          <RouterLink to="/docs/guides/tailwind">{{ t('nav.tailwindGuide') }}</RouterLink>
          <a href="https://github.com/Mini-Sylar/vael-ui" target="_blank" rel="noreferrer">{{
            t('nav.github')
          }}</a>
        </nav>
        <div class="header-controls">
          <SearchPalette />
          <SelectButton
            v-model="defaultVariant"
            size="sm"
            :allow-empty="false"
            :items="[
              { label: t('component.vdom'), value: 'vdom' },
              { label: t('component.vapor'), value: 'vapor' },
            ]"
            :aria-label="t('header.defaultMode')"
          />
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
                <label class="theme-row">
                  <span>{{ t('header.primaryColor') }}</span>
                  <span class="color-swatch">
                    <input
                      :value="swatchColor"
                      type="color"
                      @input="primaryColor = ($event.target as HTMLInputElement).value"
                    />
                  </span>
                </label>
                <label class="theme-row">
                  <span>{{ t('header.radius') }}</span>
                  <Select
                    :model-value="radiusChoice"
                    size="sm"
                    class="radius-select"
                    :items="radiusItems"
                    @update:model-value="onRadiusChange"
                  />
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
            <PhSun v-if="resolvedMode === 'dark'" :size="18" />
            <PhMoon v-else :size="18" />
          </Button>
        </div>
      </header>
      <div class="app-body">
        <Sidebar />
        <main class="app-content">
          <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </main>
      </div>
    </div>
    <!-- Global singletons every real consumer app mounts once. Without
         them, v-tooltip/openDialog()/toast() demos render nothing at all. -->
    <TooltipHost />
    <DialogHost />
    <Toaster />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocalStorage } from '@vueuse/core'
import { PhMoon, PhPalette, PhSun } from '@phosphor-icons/vue'
import {
  Button,
  ConfigProvider,
  DialogHost,
  Popover,
  Select,
  SelectButton,
  Toaster,
  TooltipHost,
  useColorScheme,
} from 'vael-ui'
import Sidebar from './components/Sidebar.vue'
import SearchPalette from './components/SearchPalette.vue'
import { setLocale, SUPPORTED_LOCALES, type Locale } from './i18n'
import { defaultVariant } from './preferences'

const themeOpen = shallowRef(false)

const { t, locale: i18nLocale } = useI18n()
const locale = useLocalStorage<Locale>('vael-ui-docs-locale', 'en')
watch(locale, (l) => setLocale(l), { immediate: true })
void i18nLocale // useI18n's own ref stays in sync via setLocale(); kept for template t()

const localeItems = SUPPORTED_LOCALES.map((l) => ({ label: l.toUpperCase(), value: l }))
function onLocaleChange(value: string | number | (string | number)[] | null) {
  if (typeof value === 'string') locale.value = value as Locale
}

const { resolvedMode, setMode } = useColorScheme({
  persist: {
    get: () => localStorage.getItem('vael-ui-docs-theme'),
    set: (m) => localStorage.setItem('vael-ui-docs-theme', m ?? ''),
  },
})

// No accent by default. The library's own black/white palette is the
// starting point. The picker is an opt-in accent, not a forced brand color.
const primaryColor = shallowRef<string | null>(localStorage.getItem('vael-ui-docs-primary'))
watch(primaryColor, (c) => {
  if (c) localStorage.setItem('vael-ui-docs-primary', c)
  else localStorage.removeItem('vael-ui-docs-primary')
})
const swatchColor = computed(
  () => primaryColor.value ?? (resolvedMode.value === 'dark' ? '#fafafa' : '#18181b'),
)

const radiusItems = [
  { label: t('header.radiusDefault'), value: 'default' },
  { label: t('header.radiusSharp'), value: '0px' },
  { label: t('header.radiusSoft'), value: '6px' },
  { label: t('header.radiusRounded'), value: '16px' },
  { label: t('header.radiusPill'), value: '999px' },
]
const radiusChoice = shallowRef(localStorage.getItem('vael-ui-docs-radius') ?? 'default')
watch(radiusChoice, (r) => localStorage.setItem('vael-ui-docs-radius', r))
function onRadiusChange(value: string | number | (string | number)[] | null) {
  if (typeof value === 'string') radiusChoice.value = value
}

const theme = computed(() => ({
  ...(primaryColor.value ? { primary: primaryColor.value } : {}),
  ...(radiusChoice.value !== 'default' ? { radius: radiusChoice.value } : {}),
}))
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
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
  backdrop-filter: blur(12px);
  z-index: 10;
}

.brand {
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  color: var(--ui-text);
}

.main-nav {
  display: flex;
  gap: 1.25rem;
  flex: 1;
}

.main-nav a {
  font-size: 0.9rem;
  text-decoration: none;
  color: var(--ui-text-muted);
}

.main-nav a:hover {
  color: var(--ui-primary);
}

.main-nav a.router-link-active {
  color: var(--ui-primary);
  font-weight: 600;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-swatch {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 1px solid var(--ui-border);
  overflow: hidden;
  display: inline-flex;
  cursor: pointer;
}

.color-swatch input[type='color'] {
  width: 150%;
  height: 150%;
  border: none;
  padding: 0;
  cursor: pointer;
  transform: translate(-15%, -15%);
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

.locale-select {
  width: 5rem;
}

.app-body {
  display: flex;
  flex: 1;
}

.app-content {
  flex: 1;
  min-width: 0;
  padding: 2.5rem 3.5rem 4rem;
  max-width: 88rem;
}

@media (max-width: 800px) {
  .main-nav {
    display: none;
  }

  .app-body {
    flex-direction: column;
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
