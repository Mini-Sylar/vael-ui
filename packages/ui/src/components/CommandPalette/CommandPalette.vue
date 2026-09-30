<template>
  <Dialog
    ref="dialogRef"
    v-model:open="open"
    :size="size"
    :position="position"
    :show-close="false"
    :modal="modal"
    :close-on-esc="closeOnEsc"
    :close-on-overlay="closeOnOverlay"
    :force-mount="forceMount"
    :before-close="beforeClose"
    :teleport-to="teleportTo"
    :container="container"
    :scroll-target="scrollTarget"
    :scroll-fade="false"
    :initial-focus="() => inputEl"
    :ui="dialogUi"
    @open-change="(value, details) => emit('open-change', value, details)"
  >
    <template #default="{ close }">
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        aria-expanded="true"
        :class="inputPart.class"
        :style="inputPart.style"
        :placeholder="placeholder ?? messages.commandPalette.placeholder"
        :aria-controls="listId"
        :aria-activedescendant="activeId"
        @keydown="onInputKeydown($event, close)"
      />
      <ul
        :id="listId"
        ref="listEl"
        role="listbox"
        v-scroll-mask
        :class="listPart.class"
        :style="listPart.style"
      >
        <li v-if="filteredItems.length === 0" :class="emptyPart.class" :style="emptyPart.style">
          <slot name="empty">{{ messages.commandPalette.empty }}</slot>
        </li>
        <template v-for="group in groupedItems" :key="group.group ?? ''">
          <li
            v-if="group.group"
            role="presentation"
            :class="groupLabelPart.class"
            :style="groupLabelPart.style"
          >
            {{ group.group }}
          </li>
          <li
            v-for="{ item, index } in group.entries"
            :id="optionId(index)"
            :key="item.id"
            role="option"
            :aria-selected="index === activeIndex"
            :data-active="index === activeIndex || undefined"
            :data-disabled="item.disabled || undefined"
            :class="itemPart.class"
            :style="itemPart.style"
            @mousemove="activeIndex = index"
            @click="selectItem(item, close)"
          >
            <slot
              name="item"
              :item="item"
              :index="index"
              :active="index === activeIndex"
              :select="() => selectItem(item, close)"
            >
              <component
                :is="item.icon"
                v-if="item.icon"
                aria-hidden="true"
                class="ui-command-palette-item-icon"
              />
              <span class="ui-command-palette-item-body">
                <span class="ui-command-palette-item-label">{{ item.label }}</span>
                <span v-if="item.description" class="ui-command-palette-item-description">{{
                  item.description
                }}</span>
              </span>
              <span v-if="item.shortcut?.length" class="ui-command-palette-item-shortcut">
                <Kbd v-for="key in item.shortcut" :key="key">{{ key }}</Kbd>
              </span>
            </slot>
          </li>
        </template>
      </ul>
    </template>
  </Dialog>
</template>

<script lang="ts">
import type { Component } from 'vue'

export interface CommandPaletteItem {
  id: string | number
  label: string
  description?: string
  value?: unknown
  /** Extra terms matched by the default filter alongside `label`. */
  keywords?: string[]
  disabled?: boolean
  icon?: Component
  /** Display-only hint, such as `['⌘', 'K']`, rendered as Kbd badges. It doesn't bind the key; add your own listener for that. */
  shortcut?: string[]
  /** Groups items that share it under a sticky heading, in first-seen order. They don't need to be adjacent in `items`. */
  group?: string
}
</script>

<script setup lang="ts" generic="T extends CommandPaletteItem = CommandPaletteItem">
import './CommandPalette.css'
import '../shared/tokens.css'
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import Dialog from '../Dialog/Dialog.vue'
import type { DialogPosition, DialogSize } from '../Dialog/Dialog.vue'
import type { DialogOpenChangeDetails } from '../../composables/useDialog'
import type { DOMTarget } from '../../composables/dom'
import Kbd from '../Kbd/Kbd.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'
import { vScrollMask } from '../../directives/vScrollMask'

interface CommandPaletteGroupView {
  group: string | undefined
  entries: { item: T; index: number }[]
}

/** Whether the palette is open. @default false */
const open = defineModel<boolean>('open', { default: false })
/** Search text. Resets to empty each time the palette opens. @default '' */
const query = defineModel<string>('query', { default: '' })

const props = withDefaults(
  defineProps<{
    /** Commands to search and run. */
    items: ReadonlyArray<T>
    /** Search input placeholder. Falls back to the localized message. */
    placeholder?: string
    /** Custom filter function; replaces the default label/keywords match. Omit to use the built-in filter. */
    filter?: (item: T, query: string) => boolean
    /** Global shortcut that toggles `open`, such as `'mod+k'` (`mod` is Cmd on Mac, Ctrl elsewhere). Nothing listens until you set it. */
    shortcut?: string
    /** Closes the palette after an item is selected. @default true */
    closeOnSelect?: boolean
    /** Panel width, as in Dialog. @default 'lg' */
    size?: DialogSize
    /**
     * Where the panel anchors in the viewport. `'top'` matches the Spotlight/Raycast convention; `'center'` feels more like a Dialog.
     * @default 'top'
     */
    position?: DialogPosition
    /**
     * `false` disables the overlay, scroll lock and focus trap. Escape-to-close and layer stacking still apply.
     * @default true
     */
    modal?: boolean
    /** Escape key closes the panel. @default true */
    closeOnEsc?: boolean
    /**
     * Clicking the overlay closes the panel. Has no effect when `modal` is `false`, since there's no overlay.
     * @default true
     */
    closeOnOverlay?: boolean
    /** Custom exit animation; call `done()` to finish closing. Forwarded to the underlying Dialog. */
    beforeClose?: (done: () => void) => void
    /**
     * Keeps it mounted, toggled with `v-show`, so you can own the enter/exit animation. Forwarded to the underlying Dialog.
     * @default false
     */
    forceMount?: boolean
    /** Teleport target: a CSS selector. Takes precedence over `container`. */
    teleportTo?: string
    /** Scopes the palette to one element instead of the viewport. Forwarded to the underlying Dialog. */
    container?: DOMTarget
    /** Element whose scrolling locks while the palette is open, if different from `container`. Forwarded to the underlying Dialog. */
    scrollTarget?: DOMTarget
    /** Class and style overrides for each part. */
    ui?: Partial<{
      panel: UiPartValue
      input: UiPartValue
      list: UiPartValue
      groupLabel: UiPartValue
      item: UiPartValue
      empty: UiPartValue
    }>
  }>(),
  {
    closeOnSelect: true,
    size: 'lg',
    position: 'top',
    modal: true,
    closeOnEsc: true,
    closeOnOverlay: true,
    forceMount: false,
  },
)

const emit = defineEmits<{
  /** Fires when you pick an enabled item by click or Enter. */
  select: [item: T]
  /** Fires before the palette closes, with the reason; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: DialogOpenChangeDetails]
}>()

defineSlots<{
  /** Custom row content for each item; call `select()` to pick it. */
  item(props: { item: T; index: number; active: boolean; select: () => void }): unknown
  /** Replaces the localized "no results" row shown when nothing matches. */
  empty(): unknown
}>()

const messages = useUiMessages()

function defaultFilter(item: T, q: string): boolean {
  if (item.label.toLowerCase().includes(q)) return true
  return item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false
}

const filteredItems = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.items
  const test = props.filter ?? defaultFilter
  return props.items.filter((item) => test(item, q))
})

const groupedItems = computed<CommandPaletteGroupView[]>(() => {
  const groups: CommandPaletteGroupView[] = []
  filteredItems.value.forEach((item, index) => {
    let bucket = groups.find((g) => g.group === item.group)
    if (!bucket) {
      bucket = { group: item.group, entries: [] }
      groups.push(bucket)
    }
    bucket.entries.push({ item, index })
  })
  return groups
})

const activeIndex = shallowRef(-1)

function enabledIndices(): number[] {
  const indices: number[] = []
  filteredItems.value.forEach((item, i) => {
    if (!item.disabled) indices.push(i)
  })
  return indices
}

watch(filteredItems, () => {
  const enabled = enabledIndices()
  activeIndex.value = enabled.length > 0 ? enabled[0]! : -1
})

watch(
  open,
  (value) => {
    if (!value) return
    query.value = ''
    const enabled = enabledIndices()
    activeIndex.value = enabled.length > 0 ? enabled[0]! : -1
  },
  { immediate: true },
)

const listId = useId()
function optionId(index: number): string {
  return `${listId}-opt-${index}`
}
const activeId = computed(() => (activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined))

const listEl = useTemplateRef<HTMLElement>('listEl')
watch(activeIndex, (index) => {
  if (index < 0) return
  nextTick(() => {
    listEl.value
      ?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`)
      ?.scrollIntoView({ block: 'nearest' })
  })
})

function moveActive(delta: number) {
  const enabled = enabledIndices()
  if (enabled.length === 0) return
  const pos = enabled.indexOf(activeIndex.value)
  const next =
    pos === -1
      ? delta > 0
        ? 0
        : enabled.length - 1
      : (((pos + delta) % enabled.length) + enabled.length) % enabled.length
  activeIndex.value = enabled[next]!
}

function selectItem(item: T, close: () => void) {
  if (item.disabled) return
  emit('select', item)
  if (props.closeOnSelect) close()
}

function onInputKeydown(event: KeyboardEvent, close: () => void) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      return
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      return
    case 'Enter': {
      event.preventDefault()
      const item = filteredItems.value[activeIndex.value]
      if (item) selectItem(item, close)
      return
    }
    default:
      return
  }
}

const dialogRef = useTemplateRef<InstanceType<typeof Dialog>>('dialogRef')

function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const tokens = shortcut
    .toLowerCase()
    .split('+')
    .map((t) => t.trim())
  const key = tokens[tokens.length - 1]
  const mods = tokens.slice(0, -1)
  if (mods.includes('mod') && !(event.metaKey || event.ctrlKey)) return false
  if (mods.includes('ctrl') && !event.ctrlKey) return false
  if (mods.includes('meta') && !event.metaKey) return false
  if (mods.includes('shift') && !event.shiftKey) return false
  if (mods.includes('alt') && !event.altKey) return false
  return event.key.toLowerCase() === key
}

useEventListener(
  () => (props.shortcut && typeof window !== 'undefined' ? window : undefined),
  'keydown',
  (event: KeyboardEvent) => {
    if (!props.shortcut || !matchesShortcut(event, props.shortcut)) return
    event.preventDefault()
    if (open.value) dialogRef.value?.close()
    else open.value = true
  },
)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.commandPalette,
  () => props.ui,
)
const dialogUi = computed(() => ({
  panel: resolveUiPart(cx, themedUi()?.panel, 'ui-command-palette-panel'),
  body: 'ui-command-palette-body',
}))
const inputPart = computed(() => resolveUiPart(cx, themedUi()?.input, 'ui-command-palette-input'))
const listPart = computed(() => resolveUiPart(cx, themedUi()?.list, 'ui-command-palette-list'))
const groupLabelPart = computed(() =>
  resolveUiPart(cx, themedUi()?.groupLabel, 'ui-command-palette-group-label'),
)
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-command-palette-item'))
const emptyPart = computed(() => resolveUiPart(cx, themedUi()?.empty, 'ui-command-palette-empty'))

const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

defineExpose({
  /** Panel element (null while closed). */
  panelEl: computed(() => dialogRef.value?.panelEl ?? null),
  /** `true` while a `beforeClose` close is pending. */
  isClosing: computed(() => dialogRef.value?.isClosing ?? false),
  /** Closes the palette, running `@open-change` and `beforeClose` first. */
  close: () => dialogRef.value?.close(),
  /** Cancels a close pending in `beforeClose` and keeps the palette open. */
  cancelClose: () => dialogRef.value?.cancelClose(),
  /** Search input element (null while closed). */
  inputEl,
  /** Results list element (null while closed). */
  listEl,
  /** Items matching the current query, in `items` order. */
  filteredItems,
  /** Index of the highlighted item in `filteredItems` (`-1` when none). */
  activeIndex,
})
</script>
