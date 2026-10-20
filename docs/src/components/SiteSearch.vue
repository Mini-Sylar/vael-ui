<template>
  <!-- A read-only vael-ui Input, so its radius, border and size follow the ConfigProvider like
       every other field in the header. Pressing it opens the palette. -->
  <Input
    readonly
    class="site-search-trigger"
    :placeholder="t('nav.search')"
    aria-haspopup="dialog"
    v-bind="$attrs"
    @click="siteSearchOpen = true"
    @keydown="onTriggerKeydown"
  >
    <template #start>
      <PhMagnifyingGlass :size="16" aria-hidden="true" />
    </template>
    <template #end>
      <Kbd>{{ shortcutLabel }}</Kbd>
    </template>
  </Input>
  <CommandPalette
    ref="palette"
    v-model:open="siteSearchOpen"
    v-model:query="query"
    shortcut="mod+k"
    :items="results"
    :filter="acceptAll"
    :placeholder="t('nav.searchAll')"
    :ui="{ footer: 'site-search-footer', item: 'site-search-item' }"
    @select="onSelect"
  >
    <template #group-label="{ group }">
      <template v-for="(part, i) in highlight(group, matchText)" :key="i"
        ><mark v-if="part.match" class="search-match">{{ part.text }}</mark
        ><template v-else>{{ part.text }}</template></template
      >
    </template>
    <template #item="{ item, active }">
      <component
        :is="item.icon"
        v-if="item.icon"
        aria-hidden="true"
        class="ui-command-palette-item-icon search-row-icon-lead"
      />
      <span class="ui-command-palette-item-body search-row-body">
        <span class="ui-command-palette-item-label search-row-title">
          <span :class="{ 'search-api-name': isApi(item) }"
            ><template v-for="(part, i) in highlight(item.label, matchText)" :key="i"
              ><mark v-if="part.match" class="search-match">{{ part.text }}</mark
              ><template v-else>{{ part.text }}</template></template
            ></span
          >
          <span
            v-if="item.parent && !scope"
            class="search-parent"
            :data-match="namesComponent(matchText, item.parent) || undefined"
            >{{ item.parent }}</span
          >
          <InlineCode v-if="item.type" :code="item.type" lang="type" class="search-type" />
          <code v-if="item.defaultValue" class="search-default">= {{ item.defaultValue }}</code>
          <span v-if="item.required" class="search-required">{{ t('metaTable.required') }}</span>
        </span>
        <span
          v-if="item.description"
          class="ui-command-palette-item-description"
          :class="{ 'search-description-full': active }"
          ><template v-for="(part, i) in highlight(item.description, matchText, true)" :key="i"
            ><mark v-if="part.match" class="search-match">{{ part.text }}</mark
            ><template v-else>{{ part.text }}</template></template
          ></span
        >
      </span>
      <!-- Touch has no Tab or mod+C: the same two moves, as buttons on the row. Stopped so a tap
           on them doesn't also open the row. -->
      <span v-if="touchMode && (drillTarget(item) || touchCopy(item))" class="search-row-actions">
        <Button
          v-if="touchCopy(item)"
          variant="ghost"
          icon
          :aria-label="t(`search.copy.${item.copyKind}`)"
          @click="(event: MouseEvent) => onRowCopy(event, item)"
        >
          <LazyMotion :features="domAnimation">
            <AnimatePresence mode="wait" :initial="false">
              <m.span
                :key="copiedId === item.id ? 'done' : 'copy'"
                class="search-row-icon"
                :initial="ICON_HIDDEN"
                :animate="ICON_SHOWN"
                :exit="{ ...ICON_HIDDEN, transition: hintExit }"
                :transition="swapEnter"
              >
                <PhCheck v-if="copiedId === item.id" :size="18" aria-hidden="true" />
                <PhCopy v-else :size="18" aria-hidden="true" />
              </m.span>
            </AnimatePresence>
          </LazyMotion>
        </Button>
        <Button
          v-if="drillTarget(item)"
          variant="ghost"
          icon
          :aria-label="t('search.drillIn', { name: drillTarget(item) })"
          @click="(event: MouseEvent) => onRowDrill(event, item)"
        >
          <PhCaretRight :size="18" aria-hidden="true" />
        </Button>
      </span>
    </template>
    <template #empty>
      <div class="search-empty">
        <p v-if="actionsOnly">
          {{ t('search.noCommands', { query: matchText.trim() }) }}
        </p>
        <p v-else-if="query.trim()">{{ t('search.noResults', { query: query.trim() }) }}</p>
        <p v-if="didYouMean.length > 0" class="search-suggestions">
          {{ t('search.didYouMean') }}
          <button
            v-for="suggestion in didYouMean"
            :key="suggestion"
            type="button"
            class="search-suggestion"
            @click="query = suggestion"
          >
            {{ suggestion }}
          </button>
        </p>
        <a
          v-if="query.trim() && !actionsOnly"
          class="search-request"
          :href="requestUrl"
          target="_blank"
          rel="noreferrer"
          >{{ t('search.request') }}</a
        >
      </div>
    </template>
    <!-- Only what you wouldn't guess: Enter and mod+Enter work without being shown. On touch, one
         tappable way in and out of commands or a drilled-in component instead. -->
    <template #footer="{ activeItem }">
      <!-- Hints fade in and out as the highlighted row changes what's possible. Their labels
           swap instantly: arrowing through results is too frequent to animate. Copy leads,
           since it shows on most rows, so Tab coming and going never shifts it. -->
      <span v-if="!touchMode" class="search-keys">
        <LazyMotion :features="domAnimation">
          <AnimatePresence :initial="false">
            <m.span
              v-if="activeItem && copyText(activeItem)"
              key="copy"
              class="search-key"
              :initial="HINT_HIDDEN"
              :animate="HINT_SHOWN"
              :exit="{ ...HINT_HIDDEN, transition: hintExit }"
              :transition="hintEnter"
            >
              <Kbd>{{ modKey }}C</Kbd>
              <AnimatePresence mode="wait" :initial="false">
                <m.span
                  v-if="copiedId === activeItem.id"
                  key="copied"
                  class="search-copied"
                  :initial="SWAP_HIDDEN"
                  :animate="SWAP_SHOWN"
                  :exit="{ ...SWAP_HIDDEN, transition: hintExit }"
                  :transition="swapEnter"
                >
                  <PhCheck :size="13" weight="bold" aria-hidden="true" />{{
                    t('search.copiedShort')
                  }}
                </m.span>
                <m.span
                  v-else
                  key="label"
                  :initial="SWAP_HIDDEN"
                  :animate="SWAP_SHOWN"
                  :exit="{ ...SWAP_HIDDEN, transition: hintExit }"
                  :transition="swapEnter"
                  >{{ t(`search.copy.${activeItem.copyKind}`) }}</m.span
                >
              </AnimatePresence>
            </m.span>
            <m.span
              v-if="drillTarget(activeItem)"
              key="drill"
              class="search-key"
              :initial="HINT_HIDDEN"
              :animate="HINT_SHOWN"
              :exit="{ ...HINT_HIDDEN, transition: hintExit }"
              :transition="hintEnter"
            >
              <Kbd>Tab</Kbd>{{ t('search.drillIn', { name: drillTarget(activeItem) }) }}
            </m.span>
          </AnimatePresence>
        </LazyMotion>
        <span class="search-key search-key-end"><Kbd>&gt;</Kbd>{{ t('search.actions') }}</span>
      </span>
      <template v-else>
        <Button v-if="actionsOnly || scope" variant="outline" size="sm" @click="query = ''">
          <template #leading><PhCaretLeft :size="16" aria-hidden="true" /></template
          >{{ t('search.back') }}
        </Button>
        <Button v-else variant="outline" size="sm" @click="query = '>'">
          <template #leading><PhCommand :size="16" aria-hidden="true" /></template
          >{{ t('search.actions') }}
        </Button>
      </template>
    </template>
  </CommandPalette>
  <!-- break-ui: dev-only data toggle, shown when the URL has `?data=`. Plain chrome on purpose. -->
  <Teleport v-if="showDataToggle" to="body">
    <div class="data-toggle" role="radiogroup" aria-label="Search data">
      <button
        v-for="mode in DATA_MODES"
        :key="mode"
        type="button"
        role="radio"
        :aria-checked="dataMode === mode"
        :class="{ 'data-toggle-on': dataMode === mode }"
        @click="setDataMode(mode)"
      >
        {{ mode }}
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import {
  PhCaretLeft,
  PhCaretRight,
  PhCheck,
  PhCommand,
  PhCopy,
  PhMagnifyingGlass,
} from '@phosphor-icons/vue'
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'motion-v'
import { Button, CommandPalette, Input, Kbd, toast } from 'vael-ui'
import type { CommandPaletteItem } from 'vael-ui'
import InlineCode from './InlineCode.vue'
import { siteSearchOpen } from '../siteSearch'
import { docsSettingsKey } from '../docsSettings'
import { valueFor } from '../docsNav'
import { highlight, namesComponent, search } from '../search/fuzzy'
import {
  absoluteUrl,
  loadDeepEntries,
  pageEntries,
  suggestions,
  type PaletteEntry,
} from '../search/entries'
import { actionEntries } from '../search/actions'
import { recentIds, remember } from '../search/recent'
import { landOn } from '../search/land'
import { DATA_MODES, withFixture, type DataMode } from '../search/worstCase'

// Two roots (the button and the palette): the header's class belongs on the button.
defineOptions({ inheritAttrs: false })

const { t, te } = useI18n()
const router = useRouter()
const route = useRoute()
const settings = inject(docsSettingsKey, null)
const palette = useTemplateRef<{
  activeItem: PaletteEntry | undefined
  inputEl: HTMLInputElement | null
}>('palette')
const query = shallowRef('')

const allPages = computed(() => pageEntries(t, te))

// The API, examples and guide sections: large, so loaded the first time the palette opens.
const deep = shallowRef<PaletteEntry[]>([])
const recents = shallowRef<string[]>([])
let deepLoading = false
watch(siteSearchOpen, async (open) => {
  if (!open) return
  recents.value = recentIds()
  if (deep.value.length > 0 || deepLoading) return
  deepLoading = true
  try {
    deep.value = await loadDeepEntries(t)
  } catch {
    // Offline, or an old tab after a deploy: pages still search; try again on the next open.
  } finally {
    deepLoading = false
  }
})

// Dev only: `?data=worst|empty|one|huge` swaps the data the palette searches (break-ui stress
// fixtures). Production builds always search the real index.
const dataMode = shallowRef<DataMode>('demo')
const data = computed(() =>
  import.meta.env.DEV
    ? withFixture(dataMode.value, allPages.value, deep.value)
    : { pages: allPages.value, deep: deep.value },
)
const pages = computed(() => data.value.pages)
const deepEntries = computed(() => data.value.deep)
function setDataMode(mode: DataMode) {
  dataMode.value = mode
  const url = new URL(window.location.href)
  if (mode === 'demo') url.searchParams.delete('data')
  else url.searchParams.set('data', mode)
  window.history.replaceState(window.history.state, '', url)
}

// Which result was just copied, so its hint or button can say so for a moment.
const copiedId = shallowRef<string | number | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyToClipboard(text: string, from?: PaletteEntry) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Clipboard blocked: nothing else to fall back to.
    return
  }
  // Copied from a result: confirm it right there. A command closes the palette, so a toast says it.
  if (!from) {
    toast(t('search.copied'), { description: text })
    return
  }
  copiedId.value = from.id
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copiedId.value = null), 1400)
}

// Small and quick, from the motion tokens: hints rise 3px into place with a touch of blur, and
// leave faster than they arrive. The docs' Animations switch and reduced motion turn it off.
const HINT_HIDDEN = { opacity: 0, y: 3, filter: 'blur(2px)' }
const HINT_SHOWN = { opacity: 1, y: 0, filter: 'blur(0px)' }
const SWAP_HIDDEN = { opacity: 0, y: 4, filter: 'blur(2px)' }
const SWAP_SHOWN = { opacity: 1, y: 0, filter: 'blur(0px)' }
const ICON_HIDDEN = { opacity: 0, scale: 0.8, filter: 'blur(2px)' }
const ICON_SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const reduceMotion = useReducedMotion()
const still = computed(() => reduceMotion.value === true || settings?.motion.value === false)
const SMOOTH_OUT = [0.22, 1, 0.36, 1] as const
const hintEnter = computed(() => ({ duration: still.value ? 0 : 0.15, ease: SMOOTH_OUT }))
const hintExit = computed(() => ({ duration: still.value ? 0 : 0.1, ease: SMOOTH_OUT }))
const swapEnter = computed(() => ({ duration: still.value ? 0 : 0.15, ease: 'easeInOut' as const }))

const actions = computed(() => (settings ? actionEntries(t, settings, copyToClipboard) : []))

// "Button." (or Tab on Button) narrows to that component's API and examples.
const scope = computed(() => {
  const match = query.value.match(/^([A-Za-z]\w*)\.(.*)$/)
  if (!match) return null
  const name = match[1]!.toLowerCase()
  const owner = deepEntries.value.find((entry) => entry.scope?.toLowerCase() === name)?.scope
  return owner ? { name: owner, rest: match[2]!.trim() } : null
})
const actionsOnly = computed(() => query.value.trimStart().startsWith('>'))
// The part of the query that names what you want, for highlighting.
const matchText = computed(() =>
  actionsOnly.value ? query.value.trimStart().slice(1) : (scope.value?.rest ?? query.value),
)

const recentEntries = computed<PaletteEntry[]>(() => {
  const all = [...pages.value, ...deepEntries.value]
  return recents.value.flatMap((id) => {
    const entry = all.find((candidate) => candidate.id === id)
    // Its own id is already in the list below, so the copy needs another.
    return entry ? [{ ...entry, id: `recent:${id}`, group: t('search.recent') }] : []
  })
})

const results = computed<PaletteEntry[]>(() => {
  if (actionsOnly.value) {
    const rest = query.value.trimStart().slice(1).trim()
    return rest ? search(rest, actions.value) : actions.value
  }
  if (scope.value) {
    const owner = scope.value.name
    const owned = deepEntries.value.filter((entry) => entry.scope === owner)
    return scope.value.rest ? search(scope.value.rest, owned, 80) : owned
  }
  if (!query.value.trim()) return [...recentEntries.value, ...pages.value]
  return search(query.value, [...pages.value, ...deepEntries.value, ...actions.value], 60)
})

// The ranking above already decided what shows.
const acceptAll = () => true

const didYouMean = computed(() =>
  results.value.length === 0 && !actionsOnly.value
    ? suggestions(matchText.value, [...pages.value, ...deepEntries.value])
    : [],
)
const requestUrl = computed(
  () =>
    `https://github.com/Mini-Sylar/vael-ui/issues/new?title=${encodeURIComponent(query.value.trim())}`,
)

const isApi = (item: PaletteEntry) =>
  item.kind !== 'page' &&
  item.kind !== 'action' &&
  item.kind !== 'example' &&
  item.kind !== 'section'

// Tab drills into a component or composable, from its page or any of its results.
function drillTarget(item: PaletteEntry | undefined): string | undefined {
  if (!item?.scope || scope.value?.name === item.scope) return undefined
  return item.scope
}

// On a phone, copying an import or a usage is the point; a link to a section rarely is.
const touchCopy = (item: PaletteEntry) =>
  (item.copyKind === 'import' || item.copyKind === 'usage') && Boolean(item.copy)

function copyText(item: PaletteEntry): string | undefined {
  if (item.copy) return item.copy
  if (item.copyKind === 'link' && item.to) return absoluteUrl(router.resolve(item.to).href)
  return undefined
}

async function onSelect(item: CommandPaletteItem) {
  const entry = item as PaletteEntry
  if (entry.run) {
    entry.run()
    return
  }
  if (!entry.to) return
  remember(String(entry.id).replace(/^recent:/, ''))
  await router.push(entry.to)
  if (typeof entry.to === 'object' && 'hash' in entry.to && entry.to.hash) {
    landOn(entry.to.hash.slice(1), entry.fallbackId)
  }
}

// Keys the palette itself doesn't use: Tab to drill in, mod+C to copy, mod+Enter for a new tab.
useEventListener(
  () => (siteSearchOpen.value && typeof document !== 'undefined' ? document : undefined),
  'keydown',
  (event: KeyboardEvent) => {
    const active = palette.value?.activeItem
    if (!active || event.isComposing) return
    const mod = event.metaKey || event.ctrlKey
    const target = drillTarget(active)
    if (event.key === 'Tab' && !mod && !event.shiftKey && target) {
      event.preventDefault()
      query.value = `${target}.`
      return
    }
    if (mod && event.key.toLowerCase() === 'c') {
      const input = palette.value?.inputEl
      if (input && input.selectionStart !== input.selectionEnd) return
      const text = copyText(active)
      if (!text) return
      event.preventDefault()
      copyToClipboard(text, active)
      return
    }
    if (mod && event.key === 'Enter' && active.to) {
      event.preventDefault()
      event.stopPropagation()
      window.open(router.resolve(active.to).href, '_blank', 'noopener')
    }
  },
  { capture: true },
)

// Which controls to show: key hints or tap targets. Some phones report a fine, hovering pointer
// (Galaxy devices with an S Pen do), so a media query can't tell; the input actually used does.
// A touch screen starts in touch mode; a mouse click or a keyboard shortcut switches it back.
const touchMode = shallowRef(false)
const showDataToggle = shallowRef(false)
useEventListener(
  () => (typeof window === 'undefined' ? undefined : window),
  'pointerdown',
  (event: PointerEvent) => {
    touchMode.value = event.pointerType === 'touch' || event.pointerType === 'pen'
  },
  { capture: true, passive: true },
)
useEventListener(
  () => (typeof window === 'undefined' ? undefined : window),
  'keydown',
  (event: KeyboardEvent) => {
    if (
      event.key === '/' ||
      ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')
    ) {
      touchMode.value = false
    }
  },
  { capture: true },
)

function onRowCopy(event: MouseEvent, item: PaletteEntry) {
  event.stopPropagation()
  const text = copyText(item)
  if (text) copyToClipboard(text, item)
}

function onRowDrill(event: MouseEvent, item: PaletteEntry) {
  event.stopPropagation()
  query.value = `${drillTarget(item)}.`
}

// "/" opens the search from anywhere you're not typing, as on most docs sites.
useEventListener(
  () => (typeof window === 'undefined' ? undefined : window),
  'keydown',
  (event: KeyboardEvent) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
    if (siteSearchOpen.value) return
    const target = event.target as HTMLElement | null
    if (
      target?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
    ) {
      return
    }
    event.preventDefault()
    siteSearchOpen.value = true
  },
)

// Pages you open count as recent, wherever you opened them from.
watch(
  () => valueFor(route),
  (value) => {
    if (value && typeof window !== 'undefined') remember(value)
  },
  { immediate: true },
)

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') return
  event.preventDefault()
  siteSearchOpen.value = true
}

// The badge names the key this keyboard has; ⌘ until mounted so the server render matches a Mac.
const shortcutLabel = shallowRef('⌘K')
const modKey = shallowRef('⌘')
onMounted(async () => {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform
  if (import.meta.env.DEV) {
    const mode = new URLSearchParams(window.location.search).get('data') as DataMode | null
    if (mode && DATA_MODES.includes(mode)) dataMode.value = mode
    showDataToggle.value = mode !== null
  }
  touchMode.value =
    navigator.maxTouchPoints > 0 && window.matchMedia('(any-pointer: coarse)').matches
  if (!/mac|iphone|ipad/i.test(platform)) {
    shortcutLabel.value = 'Ctrl K'
    modKey.value = 'Ctrl '
  }
  // `?q=` opens the palette on that search: shareable, and what the browser's site search sends.
  const q = route.query.q
  if (typeof q === 'string' && q.trim()) {
    siteSearchOpen.value = true
    // The palette clears its query as it opens; set ours after that.
    await nextTick()
    setTimeout(() => (query.value = q), 0)
    const rest = { ...route.query }
    delete rest.q
    router.replace({ query: rest, hash: route.hash })
  }
})
</script>

<style scoped>
/* Reads as a field, acts as a button: no text caret, a pointer instead. */
.site-search-trigger,
.site-search-trigger :deep(input) {
  cursor: pointer;
  caret-color: transparent;
}

.site-search-trigger :deep(input) {
  text-overflow: ellipsis;
}

/* Wraps rather than squeezing: a long name keeps its line and its chip moves under it. */
.search-row-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.125rem 0.5rem;
  min-inline-size: 0;
}

/* A name identifies the row, so it wraps rather than being cut: camelCase has no spaces. */
.search-api-name {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  font-family: var(--docs-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.95em;
}

/* What you typed, wherever it shows: the primary (readable-adjusted when a colour is picked),
   so the eye lands on why a row is here. */
.search-match {
  background: none;
  color: var(--docs-accent, var(--ui-primary));
  font-weight: 600;
}

.search-parent {
  flex: none;
  padding: 0 0.375rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  color: var(--ui-text-muted);
  font-size: 0.75em;
}

/* The query names this component ("button loading"): its chip takes the accent too. */
.search-parent[data-match] {
  border-color: color-mix(in oklch, var(--docs-accent, var(--ui-primary)) 45%, transparent);
  background: color-mix(in oklch, var(--docs-accent, var(--ui-primary)) 10%, transparent);
  color: var(--docs-accent, var(--ui-primary));
}

/* Coloured like the API tables, kept to one line here. */
.search-type {
  min-inline-size: 0;
  overflow: hidden;
  font-size: 0.75em;
  text-overflow: ellipsis;
  white-space: nowrap !important;
}

/* A function default can be long; it gives way before the name and type do. */
.search-default {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ui-text-muted);
  font-size: 0.75em;
}

.search-required {
  flex: none;
  color: var(--ui-danger);
  font-size: 0.7em;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* The highlighted row reads in full: the whole description, wrapped. */
.ui-command-palette-item-description.search-description-full {
  overflow: visible;
  white-space: normal;
  /* A bare URL has nowhere to break and would run under the row's buttons. */
  overflow-wrap: anywhere;
}

.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.search-empty p {
  margin: 0;
}

.search-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
}

.search-suggestion {
  padding: 0 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: none;
  color: var(--ui-text);
  font: inherit;
  cursor: pointer;
}

.search-request {
  color: var(--ui-text-muted);
  font-size: 0.9em;
}

.search-key {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

/* A hint line, not a toolbar: the keys are a faint fill, no border or shadow. */
.search-key .ui-kbd {
  min-inline-size: 0;
  padding: 0 0.3125rem;
  border: 0;
  background: color-mix(in oklch, var(--ui-text) 6%, transparent);
  box-shadow: none;
  color: var(--ui-text-muted);
  font-size: 0.95em;
}

.search-key-end {
  margin-inline-start: auto;
}

.search-keys {
  display: contents;
}

.search-copied {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--ui-text);
}

.search-row-icon {
  display: grid;
  place-items: center;
}

/* The text keeps at least 9rem beside the row's buttons; narrower than that (a small phone at a
   large font size), the buttons drop to their own line instead of squeezing the name. */
.search-row-body {
  flex: 1 1 9rem;
  min-inline-size: 0;
}

/* With the highlighted row's full description the row grows tall: the icon and the buttons
   stay with the name instead of floating in the middle. */
.search-row-icon-lead {
  align-self: flex-start;
  margin-block-start: 0.15em;
}

.search-row-actions {
  display: flex;
  flex: none;
  align-self: flex-start;
  gap: 0.125rem;
  margin-inline-start: auto;
}
</style>

<style>
/* A quiet bar set apart by a faint tint rather than a ruled line. Unscoped: the footer is the
   palette's own element, styled through its ui class. */
.site-search-item {
  flex-wrap: wrap;
}

.site-search-footer {
  border-block-start: 0;
  background: color-mix(in oklch, var(--ui-text) 3%, transparent);
}
</style>

<style>
/* break-ui toggle: dev chrome, above the palette, not part of the design under test. */
.data-toggle {
  position: fixed;
  inset-block-end: 0.75rem;
  inset-inline-start: 50%;
  translate: -50% 0;
  z-index: 10000;
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: #e4e4e7;
  font:
    12px/1 system-ui,
    sans-serif;
}
.data-toggle button {
  padding: 6px 10px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: #3f3f46;
  font: inherit;
  cursor: pointer;
}
.data-toggle .data-toggle-on {
  background: #fff;
  color: #18181b;
}
</style>
