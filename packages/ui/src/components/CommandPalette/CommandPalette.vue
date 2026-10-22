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
    :motion="dialogMotion"
    :before-close="beforeClose"
    :teleport-to="teleportTo"
    :container="container"
    :scroll-target="scrollTarget"
    :scroll-fade="false"
    :initial-focus="() => inputEl"
    :aria-label="messages.commandPalette.label"
    :ui="dialogUi"
    @open-change="(value, details) => emit('open-change', value, details)"
  >
    <template #default="{ close }">
      <input
        ref="inputEl"
        :value="query"
        enterkeyhint="go"
        autocapitalize="off"
        autocorrect="off"
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
        @input="onInput"
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
        v-bind="rowsTransition"
      >
        <li
          key="indicator"
          ref="indicatorEl"
          role="none"
          aria-hidden="true"
          class="ui-indicator ui-command-palette-indicator"
          :style="indicatorStyle"
        />
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
          <slot
            v-if="row.kind === 'group'"
            name="group-label"
            :group="row.label"
            :items="row.items"
            >{{ row.label }}</slot
          >
          <slot
            v-else
            name="item"
            :item="row.item"
            :index="row.index"
            :active="row.index === activeIndex"
            :group="row.item.group"
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
      <div v-if="$slots.footer" :class="footerPart.class" :style="footerPart.style">
        <slot name="footer" :active-item="activeItem" :query="query" />
      </div>
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
import type { DialogCloseReason } from '../../composables/useDialog'
import type { BeforeClose } from '../../motion/types'
import './CommandPalette.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useEasedHeight } from '../../composables/useEasedHeight'
import { useTabIndicator } from '../../composables/useTabIndicator'
import '../shared/indicator.css'
import Dialog from '../Dialog/Dialog.vue'
import type { DialogExposed } from '../Dialog/Dialog.vue'
import type { DialogPosition, DialogSize } from '../Dialog/Dialog.vue'
import type { DialogOpenChangeDetails } from '../../composables/useDialog'
import { scrollIntoContainer } from '../../composables/dom'
import type { DOMTarget } from '../../composables/dom'
import Kbd from '../Kbd/Kbd.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'
import { vScrollMask } from '../../directives/vScrollMask'
import { useComponentList } from '../../motion/useMotion'
import { useMotionStyle } from '../../motion/context'
import type { CommandPaletteMotion } from '../../motion/types'

interface CommandPaletteGroupView {
  group: string | undefined
  entries: { item: T; index: number }[]
}

/** Whether the palette is open. @default false */
const open = defineModel<boolean>('open', { default: false })
/** Search text. Resets to empty each time the palette opens. @default '' */
const query = defineModel<string>('query', { default: '' })

const rawProps = withDefaults(
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
    /** Runs before the palette closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. The palette stays open while the promise is pending. CommandPalette passes it to its Dialog. */
    beforeClose?: BeforeClose<DialogCloseReason>
    /**
     * Keeps it mounted while closed, toggled with `v-show`, so its content keeps its state. vael-ui
     * then leaves its motion to you. Forwarded to the underlying Dialog.
     * @default false
     */
    forceMount?: boolean
    /**
     * How it moves. `false` skips all of it: opening, closing, and the results easing to their new
     * height as you type (rows change at once). An object moves the dialog your way, like Dialog's:
     * values for its parts, `{ spring }`, or `enter` / `leave` hooks. `items` animates the rows
     * (`{ items: { initial: { item: { opacity: 0 } } } }`).
     * @default true
     */
    motion?: CommandPaletteMotion
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
      footer: UiPartValue
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
    motion: undefined,
  },
)
const props = withProviderDefaults(rawProps, { motion: true })

const emit = defineEmits<{
  /** Fires when you pick an enabled item by click or Enter. */
  select: [item: T]
  /** Fires before the palette closes, with the reason; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: DialogOpenChangeDetails]
}>()

// Yours (an object, or a shared style): rows come and go on the motion system, which eases the
// list's height too. Otherwise rows change at once and the list eases its height itself.
const style = useMotionStyle()
const itemsOf = (source: unknown) => (source as { items?: object } | undefined)?.items
const items = () => itemsOf(rawProps.motion) ?? itemsOf(style?.value?.commandPalette)
const listMotion =
  (typeof items() === 'object' || style?.value?.list) && props.motion !== false
    ? useComponentList(items, {
        key: 'list',
        part: 'item',
        name: 'CommandPalette',
        look: { opacity: 0 },
      })
    : undefined
const rowsTransition = computed(() =>
  listMotion
    ? listMotion.transition
    : {
        name: props.motion ? 'ui-command-palette-row' : undefined,
        css: !!props.motion,
        moveClass: 'ui-command-palette-row-move',
      },
)

defineSlots<{
  /** Custom row content for each item; call `select()` to pick it. `group` is its group's name. */
  item(props: {
    item: T
    index: number
    active: boolean
    group: string | undefined
    select: () => void
  }): unknown
  /** Custom content for a group's heading. `group` is its name; `items` are its items still
   * showing. */
  'group-label'(props: { group: string; items: T[] }): unknown
  /** Replaces the localized "no results" row shown when nothing matches. */
  empty(): unknown
  /** A strip under the list, such as key hints. `activeItem` is the highlighted item, if any. */
  footer(props: { activeItem: T | undefined; query: string }): unknown
}>()

const messages = useUiMessages()

function defaultFilter(item: T, q: string): boolean {
  if (item.label.toLowerCase().includes(q)) return true
  return item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false
}

// Matches, gathered by group in first-seen order: the order rows show in, so arrow keys and
// indexes follow the screen even when a group is spread through `items`.
const filteredItems = computed<T[]>(() => {
  const q = query.value.trim().toLowerCase()
  const test = props.filter ?? defaultFilter
  const matched = q ? props.items.filter((item) => test(item, q)) : props.items
  const byGroup = new Map<string | undefined, T[]>()
  for (const item of matched) {
    const bucket = byGroup.get(item.group)
    if (bucket) bucket.push(item)
    else byGroup.set(item.group, [item])
  }
  return [...byGroup.values()].flat()
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
      ? [
          {
            kind: 'group' as const,
            key: `group:${group.group}`,
            label: group.group,
            items: group.entries.map((entry) => entry.item),
          },
        ]
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
const activeItem = computed<T | undefined>(() => filteredItems.value[activeIndex.value])

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
// The highlight slides between items, Tabs-style; a long jump (a new search) lands at once.
const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
const { style: indicatorStyle } = useTabIndicator(() => [activeIndex.value, rows.value], {
  listEl,
  orientation: 'vertical',
  selector: '[role="option"][data-active]',
  scroller: true,
  matchCross: true,
  maxGlide: 3,
  motion: () => !!props.motion,
  indicatorEl,
  position: 'translate',
})

// The list eases its own height (with a soft edge): the panel mustn't ease the same change too.
// The dialog gets yours without `items`, which the rows read.
const dialogMotion = computed(() => {
  if (props.forceMount) return undefined
  if (props.motion === false) return false
  if (typeof props.motion !== 'object') return { resize: false }
  const { items: _items, ...dialog } = props.motion
  return { resize: false, ...dialog }
})
useEasedHeight({
  el: () => listEl.value,
  source: rows,
  enabled: () => !!props.motion && !listMotion,
  edgeProperty: '--ui-command-palette-edge',
})

watch(activeIndex, (index) => {
  if (index < 0) return
  nextTick(() => {
    const list = listEl.value
    const row = list?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`)
    if (!list || !row) return
    // A group's heading sticks to the top of the list, so moving up, the row has to stop below
    // its own heading instead of scrolling under it.
    let heading = row.previousElementSibling
    while (heading && heading.getAttribute('role') !== 'presentation') {
      heading = heading.previousElementSibling
    }
    // It sticks inside the list's top padding, so the room it takes is both together.
    const padding = Number.parseFloat(getComputedStyle(list).paddingTop) || 0
    list.style.scrollPaddingBlockStart =
      heading instanceof HTMLElement ? `${heading.offsetHeight + padding}px` : ''
    scrollIntoContainer(list, row)
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

// Not v-model: it skips input while a keyboard composes, and Android
// keyboards compose a whole word, so the list would wait for the space bar.
function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
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

const dialogRef = useTemplateRef<DialogExposed>('dialogRef')

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
const footerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.footer, 'ui-command-palette-footer'),
)

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
  /** The hover and keyboard highlight, sliding between items (null while closed). With `motion: false` it moves at once, for your own animation. */
  highlightEl: indicatorEl,
  /** Items matching the current query, in `items` order. */
  filteredItems,
  /** Index of the highlighted item in `filteredItems` (`-1` when none). */
  activeIndex,
  /** The highlighted item, for acting on it from your own keys (copy, open in a new tab). */
  activeItem,
})
</script>
