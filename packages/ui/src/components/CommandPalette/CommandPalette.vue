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
      <TransitionGroup
        :id="listId"
        :ref="registerListEl"
        tag="ul"
        role="listbox"
        v-scroll-mask
        :class="listPart.class"
        :style="listPart.style"
        :name="motionCss ? 'ui-command-palette-row' : undefined"
        :css="motionCss"
        move-class="ui-command-palette-row-move"
        @enter="enterHook"
        @leave="leaveHook"
      >
        <li
          v-if="filteredItems.length === 0"
          key="empty"
          :class="emptyPart.class"
          :style="emptyPart.style"
        >
          <slot name="empty">{{ messages.commandPalette.empty }}</slot>
        </li>
        <li
          v-for="row in rows"
          :id="row.kind === 'item' ? optionId(row.index) : undefined"
          :key="row.key"
          :role="row.kind === 'item' ? 'option' : 'presentation'"
          :aria-selected="row.kind === 'item' ? row.index === activeIndex : undefined"
          :data-active="(row.kind === 'item' && row.index === activeIndex) || undefined"
          :data-disabled="(row.kind === 'item' && row.item.disabled) || undefined"
          :class="row.kind === 'item' ? itemPart.class : groupLabelPart.class"
          :style="row.kind === 'item' ? itemPart.style : groupLabelPart.style"
          @mousemove="row.kind === 'item' && (activeIndex = row.index)"
          @click="row.kind === 'item' && selectItem(row.item, close)"
        >
          <template v-if="row.kind === 'group'">{{ row.label }}</template>
          <slot
            v-else
            name="item"
            :item="row.item"
            :index="row.index"
            :active="row.index === activeIndex"
            :select="() => selectItem(row.item, close)"
          >
            <component
              :is="row.item.icon"
              v-if="row.item.icon"
              aria-hidden="true"
              class="ui-command-palette-item-icon"
            />
            <span class="ui-command-palette-item-body">
              <span class="ui-command-palette-item-label">{{ row.item.label }}</span>
              <span v-if="row.item.description" class="ui-command-palette-item-description">{{
                row.item.description
              }}</span>
            </span>
            <span v-if="row.item.shortcut?.length" class="ui-command-palette-item-shortcut">
              <Kbd v-for="key in row.item.shortcut" :key="key">{{ key }}</Kbd>
            </span>
          </slot>
        </li>
      </TransitionGroup>
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
    /**
     * The results list eases to its new height as you type. `false` turns that off and hands
     * each appearing and disappearing row to `@item-enter`/`@item-leave` instead.
     * @default true
     */
    motionCss?: boolean
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
    motionCss: true,
  },
)

const emit = defineEmits<{
  /** Fires when you pick an enabled item by click or Enter. */
  select: [item: T]
  /** Fires before the palette closes, with the reason; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: DialogOpenChangeDetails]
  /** Fires as a row appears while you type, only while `motionCss` is `false`. Run your own
   * animation, then call `done()`. */
  'item-enter': [el: Element, done: () => void]
  /** Same as `@item-enter`, for a row disappearing. */
  'item-leave': [el: Element, done: () => void]
}>()

const enterHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('item-enter', el, done),
)
const leaveHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('item-leave', el, done),
)

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

const rows = computed(() =>
  groupedItems.value.flatMap((group) => [
    ...(group.group
      ? [{ kind: 'group' as const, key: `group:${group.group}`, label: group.group }]
      : []),
    ...group.entries.map(({ item, index }) => ({
      kind: 'item' as const,
      key: `item:${item.id}`,
      item,
      index,
    })),
  ]),
)

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

// TransitionGroup's ref is a component. Vapor gives no `$el` and calls this pre-mount: use the id.
const listEl = shallowRef<HTMLElement | null>(null)
function registerListEl(el: Element | { $el?: unknown } | null) {
  if (!el) listEl.value = null
  else if (el instanceof HTMLElement) listEl.value = el
  else if ('$el' in el && el.$el instanceof HTMLElement) listEl.value = el.$el
  else nextTick(() => (listEl.value = document.getElementById(listId)))
}

// Ease to the new height from the current one, so a restart mid-animation doesn't jump.
watch(
  rows,
  () => {
    const el = listEl.value
    if (!el || !props.motionCss || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const from = el.getBoundingClientRect().height
    nextTick(() => {
      el.style.transition = 'none'
      el.style.blockSize = ''
      const to = el.getBoundingClientRect().height
      if (Math.abs(to - from) >= 1) {
        el.dataset.resizing = el.scrollHeight > el.clientHeight + 1 ? 'scroll' : 'fit'
        if (to > from) el.dataset.growing = ''
        else delete el.dataset.growing
        el.style.blockSize = `${from}px`
        void el.offsetHeight
        el.style.blockSize = `${to}px`
      } else {
        delete el.dataset.resizing
        delete el.dataset.growing
      }
      el.style.transition = ''
    })
  },
  { flush: 'pre' },
)
function releaseHeight(event: TransitionEvent) {
  const el = listEl.value
  if (!el || event.target !== el) return
  const heightDone = event.propertyName === 'block-size' || event.propertyName === 'height'
  // A list that fits eases its soft edge away first. One that scrolls hands it to its scroll fade.
  if (heightDone && el.dataset.growing !== undefined && el.dataset.resizing === 'fit') {
    delete el.dataset.growing
    return
  }
  if (heightDone || event.propertyName === '--ui-command-palette-edge') {
    el.style.blockSize = ''
    delete el.dataset.resizing
    delete el.dataset.growing
  }
}
// Not transitioncancel: a restart cancels the previous run after setting the new height.
useEventListener(listEl, 'transitionend', releaseHeight)

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
