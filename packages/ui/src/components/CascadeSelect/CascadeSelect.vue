<template>
  <div ref="root" class="ui-cascade-select" :data-disabled="isDisabled || undefined">
    <Menu
      ref="menuRef"
      v-model:open="open"
      :items="mappedItems"
      :open-path="openKeyPath"
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      :align-offset="alignOffset"
      :close-on-esc="closeOnEsc"
      :close-on-outside="closeOnOutside"
      :before-close="beforeClose"
      :force-mount="forceMount"
      :motion="menuMotion"
      :teleport-to="teleportTo"
      :scroll-fade="scrollFade"
      :ui="{
        positioner: themedUi()?.positioner,
        panel: panelUi,
        header: themedUi()?.header,
        footer: themedUi()?.footer,
      }"
      @open-change="onOpenChange"
      @select="onMenuSelect"
    >
      <template v-if="$slots.header || filter !== undefined" #header>
        <slot name="header" />
        <div v-if="filter !== undefined" :class="filterPart.class" :style="filterPart.style">
          <Input
            ref="filterInputRef"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            enterkeyhint="enter"
            v-model="query"
            :placeholder="filterPlaceholder"
            size="sm"
            :aria-label="filterPlaceholder"
            data-menu-autofocus
            @keydown="onFilterKeydown"
          >
            <template #start>
              <svg
                :class="filterIconPart.class"
                :style="filterIconPart.style"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M13 13l-2.5-2.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </template>
          </Input>
        </div>
      </template>
      <template #trigger="{ open: menuOpen }">
        <!-- A menu button (Menu sets its popup state); the clear button sits beside it, not in it. -->
        <div
          ref="triggerEl"
          :data-ui-frame="props.size"
          :class="triggerClass"
          :style="[triggerStyle, attrs.style as never]"
          tabindex="-1"
          :data-state="menuOpen ? 'open' : 'closed'"
          :data-invalid="isInvalid || undefined"
          :data-placeholder="isEmpty || undefined"
          @click="onTriggerClick"
          @focus="focusControl"
        >
          <span v-if="ownLabel" :id="ownLabelId" hidden>{{ ownLabel }}</span>
          <!-- Start and end sit outside the button, so they don't join its accessible name. -->
          <span v-if="$slots.start" :class="startPart.class" :style="startPart.style"
            ><slot name="start"
          /></span>
          <div
            :id="controlId"
            ref="controlEl"
            class="ui-cascade-select-control"
            role="button"
            data-menu-trigger
            v-bind="restAttrs"
            :tabindex="isDisabled ? -1 : 0"
            :aria-disabled="isDisabled || undefined"
            :aria-describedby="fieldControl.describedBy()"
            :aria-labelledby="controlLabelledBy"
            :aria-invalid="isInvalid || undefined"
            :aria-required="fieldControl.required() || undefined"
            @keydown="onTriggerKeydown"
            @focus="onTriggerFocus"
            @blur="onTriggerBlur"
          >
            <span ref="valueEl" :class="valuePart.class" :style="valuePart.style">
              <slot name="value" :selected="selectedForSlot" :path="pathForSlot">
                <!-- The placeholder is the same text element, so the first choice crossfades in too. -->
                <LazyAnimatedText
                  v-if="!multiple"
                  :class="isEmpty && 'ui-cascade-select-placeholder'"
                  :value="isEmpty ? (placeholder ?? '') : (selectedItem?.label ?? '')"
                  :motion="!!props.motion"
                />
                <span
                  v-else-if="isEmpty && display !== 'chip'"
                  class="ui-cascade-select-placeholder"
                  >{{ placeholder }}</span
                >
                <span v-else-if="display === 'text'">{{ displayLabel }}</span>
                <span v-else-if="display === 'count'">{{ selectedCountLabel }}</span>
                <!-- The chips group stays mounted when the last chip goes, so it leaves like the others;
                     the placeholder slides in behind it. -->
                <template v-else>
                  <TransitionGroup
                    v-bind="chipsTransition"
                    :data-motion="props.motion ? undefined : 'off'"
                    tag="span"
                    class="ui-cascade-select-chips"
                  >
                    <Chip
                      v-for="match in visibleChips"
                      :key="match.item.value"
                      :label="match.item.label"
                      removable
                      :disabled="isDisabled"
                      @remove="removeChip(match.item)"
                    />
                    <span
                      v-if="hiddenChipCount > 0"
                      key="__overflow"
                      class="ui-chip ui-chip--md ui-cascade-select-chip--overflow"
                    >
                      +{{ hiddenChipCount }}
                    </span>
                  </TransitionGroup>
                  <span v-if="isEmpty" class="ui-cascade-select-placeholder">{{
                    placeholder
                  }}</span>
                </template>
              </slot>
            </span>
          </div>
          <span v-if="$slots.end" :class="endPart.class" :style="endPart.style"
            ><slot name="end"
          /></span>
          <Transition
            name="ui-clear"
            :css="!!props.motion"
            @enter="measureClearSpace"
            @leave="startClearLeave"
            @leave-cancelled="resetLeaveStyles"
          >
            <button
              v-if="clearable && !isEmpty && !isDisabled"
              type="button"
              :class="clearPart.class"
              :style="clearPart.style"
              :aria-label="messages.cascadeSelect.clear"
              @click.stop="onClear"
              @mousedown.stop.prevent
            >
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </Transition>
          <svg
            :class="chevronPart.class"
            :style="chevronPart.style"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </template>
      <!-- Empty tree: fall through to Menu's #default escape hatch. Non-empty: use #item to reproduce Menu's label+chevron. -->
      <template v-if="mappedItems.length === 0" #default>
        <div class="ui-cascade-select-empty" role="presentation">
          <slot name="empty">{{ messages.cascadeSelect.empty }}</slot>
        </div>
      </template>
      <template v-else #item="{ item: entry }">
        <slot
          name="item"
          :item="resolveItem(entry) as T"
          :has-children="!!entry.items"
          :path="pathOf(entry) as T[]"
        >
          <span class="ui-menu-item-label">{{ entry.label }}</span>
          <!-- The leading space keeps "Accra Africa / Ghana" apart when read as one name. -->
          <span v-if="searching && pathOf(entry).length" class="ui-cascade-select-path">{{
            ' ' +
            pathOf(entry)
              .map((ancestor) => ancestor.label)
              .join(' / ')
          }}</span>
          <span v-if="entry.items" class="ui-menu-item-chevron" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </slot>
      </template>
      <template v-if="$slots.footer" #footer>
        <slot name="footer" />
      </template>
    </Menu>
    <template v-if="name">
      <input v-if="!multiple" type="hidden" :name="name" :value="model ?? ''" />
      <template v-else>
        <input
          v-for="value in Array.isArray(model) ? model : []"
          :key="value"
          type="hidden"
          :name="name"
          :value="value"
        />
      </template>
    </template>
  </div>
</template>

<script lang="ts">
/**
 * One node in a CascadeSelect hierarchy. A node with `children` is a branch: it opens a nested
 * level on hover, click or ArrowRight instead of committing a selection. A node with no `children`
 * (or an empty array) is a leaf, the only kind of node that can become the model value.
 */
export interface CascadeSelectItem {
  label: string
  value: string | number
  disabled?: boolean
  children?: readonly CascadeSelectItem[]
}

/** Root-to-leaf sequence of `value`s for the current selection. */
export type CascadeSelectPath = (string | number)[]

/** See the `filter` prop. A function gets each leaf, the typed text and the items above the leaf. */
export type CascadeSelectFilter<T> =
  | boolean
  | ((item: T, query: string, path: readonly T[]) => boolean)
</script>

<!-- Wraps Menu's submenu engine; nodeByKey side-table preserves type at all depths. -->
<script
  setup
  lang="ts"
  generic="
    T extends CascadeSelectItem = CascadeSelectItem,
    V extends string | number | (string | number)[] | null = string | number | null
  "
>
import type { BeforeClose, CascadeSelectMotion } from '../../motion/types'
import type { PopoverCloseReason } from '../../composables/usePopover'
import './CascadeSelect.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import '../shared/clear-transition.css'
import { measureClearSpace, resetLeaveStyles, startClearLeave } from '../../composables/dom'
import { useChipRowWidth } from '../../composables/useChipRowWidth'
import { useChipTransition } from '../../composables/useChipTransition'
import '../shared/chip.css'
import { computed, nextTick, provide, useAttrs, useId, useTemplateRef, watch } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import Menu from '../Menu/Menu.vue'
import Chip, { chipFocusFallbackKey } from '../Chip/Chip.vue'
import LazyAnimatedText from '../internal/LazyAnimatedText.vue'
import Input from '../Input/Input.vue'
import { normalizeText } from '../../composables/normalizeText'
import { useEasedHeight } from '../../composables/useEasedHeight'
import type { MenuAlign, MenuItemData, MenuSide } from '../Menu/Menu.vue'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useFieldControl } from '../../composables/useFieldControl'
import { useFormReset } from '../../composables/useFormReset'
import { omitAttrs, useForwardedListener } from '../../composables/forwardedListeners'
import { useMessages, cascadeSelectMessages } from '../../messages'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

/**
 * Selected leaf value, or an array of leaf values with `multiple`.
 * @default null
 */
const model = defineModel<V>()
/** Whether the panel is open. @default false */
const open = defineModel<boolean>('open', { default: false })
/** Search box text. Clears when the panel closes. @default '' */
const query = defineModel<string>('query', { default: '' })

const rawProps = withDefaults(
  defineProps<{
    /** Tree of options; only leaves (nodes without `children`) can be selected. */
    items: readonly T[]
    /** Text shown in the trigger when nothing is selected. */
    placeholder?: string
    /**
     * Selects several leaves: the model becomes an array and the panel stays open on pick.
     * @default false
     */
    multiple?: boolean
    /** `multiple` only: chips shown before the rest collapse into a "+N" chip. */
    maxLabels?: number
    /** `multiple` only: `'chip'` shows chips, `'text'` joined labels, `'count'` "N selected".
     * @default 'chip'
     */
    display?: 'chip' | 'text' | 'count'
    /**
     * Disables the trigger and keeps the panel from opening. A disabled parent Field also disables it.
     * @default false
     */
    disabled?: boolean
    /** Shows a clear button in the trigger while a value is selected. @default false */
    clearable?: boolean
    /** Standalone override; ORed with the nearest Field's `error` state. @default false */
    invalid?: boolean
    /** Control size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Renders hidden inputs so a plain `<form>` post carries the selection. */
    name?: string
    /** Which side of the trigger the panel opens on. @default 'bottom' */
    side?: MenuSide
    /** How the panel aligns against the trigger along that side. @default 'start' */
    align?: MenuAlign
    /** Gap between the trigger and the panel, in pixels. @default 8 */
    sideOffset?: number
    /** Shifts the panel along the alignment axis, in pixels. @default 0 */
    alignOffset?: number
    /** Escape key closes the panel. @default true */
    closeOnEsc?: boolean
    /** Clicking outside the panel closes it. @default true */
    closeOnOutside?: boolean
    /** Runs before the panel closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. The panel stays open while the promise is pending. */
    beforeClose?: BeforeClose<PopoverCloseReason>
    /** Keeps it mounted while closed, toggled with `v-show`, so its content keeps its state. vael-ui then leaves its motion to you. @default false */
    forceMount?: boolean
    /** Teleport target: a CSS selector or element. @default 'body' */
    teleportTo?: string | HTMLElement
    /** Adds a search box to the panel. While you type, the levels become one list of the matching
     * leaves, each with its path. `true` matches every word against the whole path, ignoring case
     * and accents; a function matches your way; `false` leaves filtering to you via `v-model:query`.
     */
    filter?: CascadeSelectFilter<T>
    /** Placeholder for the search box. @default 'Search...' */
    filterPlaceholder?: string
    /**
     * Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more.
     * @default true
     */
    scrollFade?: boolean
    /**
     * How it moves. `false` skips all of it: the menu opening and easing to its new height as you
     * search, the clear button and the chips. An object moves the menu your way, like
     * Menu's: values for the `panel` part, `{ spring }`, or `enter` / `leave` hooks. `chips` does
     * the same for the chips (`{ chips: { initial: { chip: { opacity: 0, y: 4 } } } }`).
     * @default true
     */
    motion?: CascadeSelectMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      filter: UiPartValue
      footer: UiPartValue
      /** Wraps the `#start` slot, before the value. */
      start: UiPartValue
      /** Wraps the `#end` slot, before the clear button and chevron. */
      end: UiPartValue
      /** The clear button. */
      clear: UiPartValue
      /** The chevron at the end of the trigger. */
      chevron: UiPartValue
      /** The search icon at the start of the filter box. */
      filterIcon: UiPartValue
    }>
  }>(),
  {
    placeholder: undefined,
    multiple: false,
    maxLabels: undefined,
    display: 'chip',
    disabled: false,
    clearable: false,
    invalid: false,
    name: undefined,
    side: 'bottom',
    align: 'start',
    sideOffset: 8,
    alignOffset: 0,
    closeOnEsc: true,
    closeOnOutside: true,
    beforeClose: undefined,
    forceMount: false,
    teleportTo: 'body',
    filter: undefined,
    filterPlaceholder: 'Search...',
    scrollFade: true,
    motion: undefined,
    ui: undefined,
  },
)
const props = withProviderDefaults(rawProps, { size: 'md', motion: true })

const emit = defineEmits<{
  /** Fires before the panel closes, with the reason; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  /** Fires when you change the selection: picking a leaf, removing a chip, or clearing. */
  change: [value: V]
  /** Fires when a leaf is picked or unpicked, with the item and its root-to-leaf path. */
  select: [item: T, path: CascadeSelectPath]
}>()

// The menu's motion: yours without `chips`, which the chips row reads.
const menuMotion = computed(() => {
  if (typeof props.motion !== 'object') return props.motion
  const { chips: _chips, ...menu } = props.motion
  return menu
})
const chipsTransition = useChipTransition(
  () => rawProps.motion,
  () => !!props.motion,
  'cascadeSelect',
  'CascadeSelect',
)

defineSlots<{
  /** Content at the start of the trigger, such as an icon, before the value. */
  start(): unknown
  /** Content before the built-in clear button and chevron. */
  end(): unknown
  /** Custom trigger content; receives the selected leaf and its path, or arrays of both. */
  value(props: {
    selected: V extends unknown[] ? T[] : T | null
    path: V extends unknown[] ? CascadeSelectPath[] : CascadeSelectPath
  }): unknown
  /** Content above the row list, forwarded to the underlying Menu's `#header`. */
  header(): unknown
  /** Custom row content at any level; the row keeps its expand and select behavior. `path` is the
   * items above it, so `path.length` is how deep it sits, even in search results. */
  item(props: { item: T; hasChildren: boolean; path: T[] }): unknown
  /** Replaces the localized "no options" row shown when `items` is empty. */
  empty(): unknown
  /** Content below the row list, forwarded to the underlying Menu's `#footer`. */
  footer(): unknown
}>()

interface LeafMatch {
  item: CascadeSelectItem
  path: CascadeSelectPath
}

// First leaf per value, in tree order; stops once every value is found.
function collectLeaves(
  items: readonly CascadeSelectItem[],
  pending: Set<string | number>,
  path: CascadeSelectPath,
  out: LeafMatch[],
) {
  for (const item of items) {
    if (pending.size === 0) return
    const nextPath = [...path, item.value]
    if (item.children && item.children.length > 0) {
      collectLeaves(item.children, pending, nextPath, out)
    } else if (pending.has(item.value)) {
      pending.delete(item.value)
      out.push({ item, path: nextPath })
    }
  }
}

const selectedValues = computed<(string | number)[]>(() => {
  const value = model.value
  if (props.multiple) return Array.isArray(value) ? value : []
  return value == null || Array.isArray(value) ? [] : [value]
})
const selectedSet = computed(() => new Set(selectedValues.value))

// Derive from model + tree at render time, not capture at selection; handles programmatic resets.
const selectedMatches = computed<LeafMatch[]>(() => {
  const out: LeafMatch[] = []
  collectLeaves(props.items, new Set(selectedSet.value), [], out)
  return out
})
const selectedItem = computed(() =>
  props.multiple ? null : ((selectedMatches.value[0]?.item as T | undefined) ?? null),
)
const selectedPath = computed<CascadeSelectPath>(() =>
  props.multiple ? [] : (selectedMatches.value[0]?.path ?? []),
)
const isEmpty = computed(() => selectedMatches.value.length === 0)
const selectedForSlot = computed(
  () =>
    (props.multiple
      ? selectedMatches.value.map((match) => match.item)
      : selectedItem.value) as V extends unknown[] ? T[] : T | null,
)
const pathForSlot = computed(
  () =>
    (props.multiple
      ? selectedMatches.value.map((match) => match.path)
      : selectedPath.value) as V extends unknown[] ? CascadeSelectPath[] : CascadeSelectPath,
)
const displayLabel = computed(() =>
  selectedMatches.value.map((match) => match.item.label).join(', '),
)
const visibleChips = computed(() =>
  props.maxLabels != null ? selectedMatches.value.slice(0, props.maxLabels) : selectedMatches.value,
)
const hiddenChipCount = computed(() =>
  props.maxLabels != null ? Math.max(0, selectedMatches.value.length - props.maxLabels) : 0,
)
const selectedCountLabel = computed(() =>
  messages.value.cascadeSelect.selectedCount.replace(
    '{count}',
    String(selectedMatches.value.length),
  ),
)

// Rebuilt each render: maps synthetic Menu keys back to their node, path and ancestors.
interface MenuNode extends LeafMatch {
  ancestors: CascadeSelectItem[]
}
const nodeByKey = new Map<string, MenuNode>()
let nodeSeq = 0

// `paths`: the rest of each selected path through this level; those rows get `data-cascade-selected`.
function buildEntries(
  items: readonly CascadeSelectItem[],
  paths: readonly CascadeSelectPath[],
  parentPath: CascadeSelectPath,
  ancestors: CascadeSelectItem[] = [],
): MenuItemData[] {
  const restByHead = new Map<string | number, CascadeSelectPath[]>()
  for (const path of paths) {
    if (path.length === 0) continue
    const rest = restByHead.get(path[0]!)
    if (rest) rest.push(path.slice(1))
    else restByHead.set(path[0]!, [path.slice(1)])
  }
  return items.map((item) => {
    const key = String(nodeSeq++)
    const path = [...parentPath, item.value]
    nodeByKey.set(key, { item, path, ancestors })
    const hasChildren = !!item.children && item.children.length > 0
    const rest = restByHead.get(item.value)
    return {
      label: item.label,
      value: key,
      disabled: item.disabled,
      attrs: rest ? { 'data-cascade-selected': '' } : undefined,
      ...(props.multiple && !hasChildren
        ? { checked: selectedSet.value.has(item.value), keepOpen: true }
        : {}),
      items: hasChildren
        ? buildEntries(item.children!, rest ?? [], path, [...ancestors, item])
        : undefined,
    }
  })
}

// Searching: every enabled leaf whose path matches, as one flat level. A disabled branch hides
// its leaves, since they can't be reached in the levels either.
const searching = computed(
  () => props.filter !== undefined && props.filter !== false && query.value.trim() !== '',
)
function matcher(): (item: CascadeSelectItem, ancestors: CascadeSelectItem[]) => boolean {
  const q = query.value.trim()
  const filter = props.filter
  if (typeof filter === 'function') {
    return (item, ancestors) => filter(item as T, q, ancestors as T[])
  }
  const words = normalizeText(q).split(/\s+/).filter(Boolean)
  return (item, ancestors) => {
    const text = normalizeText([...ancestors, item].map((node) => node.label).join(' '))
    return words.every((word) => text.includes(word))
  }
}
function searchResults(): MenuNode[] {
  const matches = matcher()
  const out: MenuNode[] = []
  const walk = (
    items: readonly CascadeSelectItem[],
    path: CascadeSelectPath,
    ancestors: CascadeSelectItem[],
  ) => {
    for (const item of items) {
      const nextPath = [...path, item.value]
      if (item.children && item.children.length > 0) {
        if (!item.disabled) walk(item.children, nextPath, [...ancestors, item])
      } else if (matches(item, ancestors)) {
        out.push({ item, path: nextPath, ancestors })
      }
    }
  }
  walk(props.items, [], [])
  return out
}

const mappedItems = computed(() => {
  nodeByKey.clear()
  nodeSeq = 0
  if (searching.value) {
    return searchResults().map((node): MenuItemData => {
      const key = String(nodeSeq++)
      nodeByKey.set(key, node)
      const picked = selectedSet.value.has(node.item.value)
      return {
        label: node.item.label,
        value: key,
        disabled: node.item.disabled,
        attrs: picked ? { 'data-cascade-selected': '' } : undefined,
        ...(props.multiple ? { checked: picked, keepOpen: true } : {}),
      }
    })
  }
  return buildEntries(
    props.items,
    selectedMatches.value.map((match) => match.path),
    [],
  )
})

function pathOf(entry: MenuItemData): CascadeSelectItem[] {
  const node = entry.value !== undefined ? nodeByKey.get(entry.value) : undefined
  return node?.ancestors ?? []
}

// Menu keys along the (first) selected path: reopening reveals it instead of the first row.
const openKeyPath = computed(() => {
  const keys: string[] = []
  let level: readonly MenuItemData[] | undefined = mappedItems.value
  while (level) {
    const entry: MenuItemData | undefined = level.find(
      (e) => e.attrs?.['data-cascade-selected'] !== undefined,
    )
    if (!entry?.value) break
    keys.push(entry.value)
    level = entry.items as MenuItemData[] | undefined
  }
  return keys
})

function resolveItem(entry: MenuItemData): CascadeSelectItem {
  const node = entry.value !== undefined ? nodeByKey.get(entry.value) : undefined
  // Every rendered entry is from mappedItems, so this can't miss (fallback for type safety).
  return node?.item ?? { label: entry.label, value: entry.value ?? '' }
}

function commit(value: string | number | (string | number)[] | null) {
  model.value = value as V
  emit('change', value as V)
}

function onMenuSelect(entry: MenuItemData) {
  const node = entry.value !== undefined ? nodeByKey.get(entry.value) : undefined
  if (!node) return
  const { item, path } = node
  let next: string | number | (string | number)[] = item.value
  if (props.multiple) {
    next = [...selectedValues.value]
    const pos = next.indexOf(item.value)
    if (pos === -1) next.push(item.value)
    else next.splice(pos, 1)
  }
  model.value = next as V
  emit('select', item as T, path)
  emit('change', next as V)
}

function removeChip(item: CascadeSelectItem) {
  commit(selectedValues.value.filter((value) => value !== item.value))
}

function onOpenChange(value: boolean, details: PopoverOpenChangeDetails) {
  emit('open-change', value, details)
}

const filterInputRef = useTemplateRef<{ inputEl: HTMLInputElement | null }>('filterInputRef')
const valueEl = useTemplateRef<HTMLElement>('valueEl')
useChipRowWidth({
  row: () => valueEl.value,
  empty: () => isEmpty.value,
  active: () => props.multiple && props.display === 'chip' && !!props.motion,
  placeholder: '.ui-cascade-select-placeholder',
})
function rows(): HTMLElement[] {
  const list = menuRef.value?.listEl
  if (!list) return []
  return [
    ...list.querySelectorAll<HTMLElement>(
      ':is([role="menuitem"], [role="menuitemcheckbox"]):not([aria-disabled="true"])',
    ),
  ]
}
function focusSearch() {
  const input = filterInputRef.value?.inputEl
  if (!input) return
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
}

// Arrow Down moves into the results; Enter picks the first one, as in Select.
function onFilterKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    rows()[0]?.focus()
  } else if (event.key === 'Enter' && searching.value) {
    event.preventDefault()
    const first = mappedItems.value.find((entry) => !entry.disabled)
    if (!first) return
    onMenuSelect(first)
    if (!props.multiple) menuRef.value?.close()
  }
}

// On a row, typing goes back to the search box, and ArrowUp from the first row returns to it.
// Capture phase on the positioner, so it runs before Menu's own type-to-find, at every level.
function onRowsKeydown(event: KeyboardEvent) {
  if (props.filter === undefined || event.target === filterInputRef.value?.inputEl) return
  const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
  if (printable || event.key === 'Backspace') {
    event.preventDefault()
    event.stopPropagation()
    query.value = event.key === 'Backspace' ? query.value.slice(0, -1) : query.value + event.key
    nextTick(focusSearch)
  } else if (event.key === 'ArrowUp' && event.target === rows()[0]) {
    event.preventDefault()
    event.stopPropagation()
    focusSearch()
  }
}

// Trigger is a div (role="button"), not a real <button> — a click that
// bubbles up still reaches Menu's own wrapping span (which toggles), so this
// only needs to swallow the click while disabled; opening itself is Menu's job.
function onTriggerClick(event: MouseEvent) {
  try {
    if (isDisabled.value) event.stopPropagation()
  } finally {
    forward('onClick', event)
  }
}

function onTriggerFocus(event: FocusEvent) {
  try {
    fieldControl.onFocus()
  } finally {
    forward('onFocus', event)
  }
}

function onTriggerBlur(event: FocusEvent) {
  try {
    fieldControl.onBlur()
  } finally {
    forward('onBlur', event)
  }
}

function onTriggerKeydown(event: KeyboardEvent) {
  try {
    if (isDisabled.value || event.target !== event.currentTarget) return
    // Chips' remove buttons are pointer-only, so the keyboard removes the last chip, as in Combobox.
    if ((event.key === 'Backspace' || event.key === 'Delete') && props.multiple) {
      const last = props.display === 'chip' ? selectedMatches.value.at(-1) : undefined
      if (last) {
        event.preventDefault()
        removeChip(last.item)
      }
      return
    }
    if (open.value) return
    // No native <button> to auto-activate on Enter/Space anymore; drive `open` directly.
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      open.value = true
    }
  } finally {
    forward('onKeydown', event)
  }
}

function onClear(event: MouseEvent) {
  event.preventDefault()
  commit(props.multiple ? [] : null)
  // The clear button goes with the value, so focus goes back to the trigger.
  controlEl.value?.focus()
}

const messages = useMessages({ cascadeSelect: cascadeSelectMessages })
const fieldControl = useFieldControl({
  filled: () => (props.multiple ? !isEmpty.value : model.value != null),
  frame: { el: () => triggerEl.value, size: () => props.size },
})
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

const root = useTemplateRef<HTMLElement>('root')
useFormReset(model, () => root.value)
const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
const controlEl = useTemplateRef<HTMLElement>('controlEl')
function focusControl() {
  controlEl.value?.focus()
}
provide(chipFocusFallbackKey, () => controlEl.value)
const menuRef = useTemplateRef<ComponentExposed<typeof Menu>>('menuRef')

const attrs = useAttrs()
const forward = useForwardedListener(attrs)
// Your `aria-label` names it through a hidden copy (below): on the button it would replace the value.
const restAttrs = computed(() =>
  omitAttrs(attrs, ['class', 'style', 'onClick', 'onKeydown', 'onFocus', 'onBlur', 'aria-label']),
)
const controlId = computed(() => (attrs.id as string | undefined) ?? fieldControl.id)
// A button is named by its label, so the label leads and its own text (the value) follows. Your
// `aria-label` takes the label's place, through a hidden copy, so the value still follows it.
const ownLabel = computed(() => attrs['aria-label'] as string | undefined)
const ownLabelId = useId()
const controlLabelledBy = computed(() => {
  const label =
    (attrs['aria-labelledby'] as string | undefined) ??
    fieldControl.labelledBy() ??
    (ownLabel.value ? ownLabelId : undefined)
  return label ? `${label} ${controlId.value}` : undefined
})

const cx = useClassMerge()
// The panel is teleported, so motion off is marked on it for the CSS that follows it (Menu.css).
const panelUi = computed<UiPartValue | undefined>(() => {
  if (props.motion) return themedUi()?.panel
  const { class: panelClass, style } = splitUiPart(themedUi()?.panel)
  return { class: cx('ui-motion-off', panelClass), style }
})
const themedUi = useThemedUi(
  (theme) => theme.cascadeSelect,
  () => props.ui,
)
const triggerSplit = computed(() => splitUiPart(themedUi()?.trigger))
const triggerClass = computed(() =>
  cx(
    'ui-cascade-select-trigger',
    `ui-cascade-select-trigger--${props.size}`,
    isDisabled.value && 'ui-cascade-select-trigger--disabled',
    triggerSplit.value.class,
    attrs.class as string | undefined,
  ),
)
const triggerStyle = computed(() => triggerSplit.value.style)
const valuePart = computed(() => resolveUiPart(cx, themedUi()?.value, 'ui-cascade-select-value'))
const filterPart = computed(() => resolveUiPart(cx, themedUi()?.filter, 'ui-cascade-select-filter'))
const startPart = computed(() => resolveUiPart(cx, themedUi()?.start, 'ui-cascade-select-start'))
const endPart = computed(() => resolveUiPart(cx, themedUi()?.end, 'ui-cascade-select-end'))
const clearPart = computed(() => resolveUiPart(cx, themedUi()?.clear, 'ui-cascade-select-clear'))
const chevronPart = computed(() =>
  resolveUiPart(cx, themedUi()?.chevron, 'ui-cascade-select-chevron'),
)
const filterIconPart = computed(() =>
  resolveUiPart(cx, themedUi()?.filterIcon, 'ui-cascade-select-search-icon'),
)

// After menuRef exists: the watcher reads it straight away.
// Searching eases the menu to its new height, the same as Select's and Combobox's lists.
useEasedHeight({
  el: () => menuRef.value?.listEl,
  source: [query, () => props.items],
  enabled: () => props.motion && props.filter !== undefined,
})
watch(
  () => menuRef.value?.positionerEl,
  (el, _old, onCleanup) => {
    if (!el) return
    el.addEventListener('keydown', onRowsKeydown, true)
    onCleanup(() => el.removeEventListener('keydown', onRowsKeydown, true))
  },
)
watch(open, (isOpen) => {
  if (!isOpen) query.value = ''
})

defineExpose({
  /** Root element. */
  el: root,
  /** Trigger element: the frame around the button and its clear button. Focusing it focuses the button. */
  triggerEl,
  /** Panel element (null while closed). */
  panelEl: computed(() => menuRef.value?.panelEl ?? null),
  /** Positioning wrapper around the panel (null while closed). */
  positionerEl: computed(() => menuRef.value?.positionerEl ?? null),
  /** Top-level row list element (null while closed). */
  listEl: computed(() => menuRef.value?.listEl ?? null),
  /** `true` while a `beforeClose` close is pending. */
  isClosing: computed(() => menuRef.value?.isClosing ?? false),
  /** Selected leaf item, or `null`; always `null` with `multiple`. */
  selectedItem,
  /** Root-to-leaf `value` path of the selection; empty when nothing is selected or with `multiple`. */
  selectedPath,
  /** Opens the panel. */
  open: () => {
    open.value = true
  },
  /** Closes the panel, running `@open-change` and `beforeClose` first. */
  close: () => menuRef.value?.close(),
  /** Cancels a close pending in `beforeClose` and keeps the panel open. */
  cancelClose: () => menuRef.value?.cancelClose(),
})
</script>
