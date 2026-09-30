<template>
  <div
    ref="triggerEl"
    role="combobox"
    :id="fieldControl.id"
    :class="rootPart.class"
    :style="[rootPart.style, attrs.style as never]"
    :tabindex="isDisabled ? -1 : 0"
    :aria-disabled="isDisabled || undefined"
    aria-haspopup="listbox"
    :aria-expanded="open"
    :aria-controls="listboxId"
    :aria-activedescendant="open ? activeId : undefined"
    :aria-describedby="fieldControl.describedBy()"
    :aria-invalid="isInvalid || undefined"
    :aria-required="fieldControl.required() || undefined"
    :data-state="open ? 'open' : 'closed'"
    :data-invalid="isInvalid || undefined"
    @click="onTriggerClick"
    @keydown="onTriggerKeydown"
    @focus="fieldControl.onFocus"
    @blur="fieldControl.onBlur"
  >
    <span :class="valuePart.class" :style="valuePart.style">
      <slot name="value" :selected="selectedForSlot">
        <span v-if="isEmpty" class="ui-select-placeholder">{{ placeholder }}</span>
        <span v-else-if="!multiple || display === 'text'">{{ displayLabel }}</span>
        <span v-else-if="display === 'count'">{{ selectedCountLabel }}</span>
        <TransitionGroup
          v-else
          name="ui-chip-item"
          tag="span"
          class="ui-select-chips"
          :css="motionCss"
          :data-motion="motionCss ? undefined : 'off'"
          @enter="chipEnterHook"
          @leave="chipLeaveHook"
        >
          <Chip
            v-for="item in visibleChips"
            :key="item.value"
            :label="item.label"
            removable
            :disabled="isDisabled"
            @remove="removeChip(item)"
          />
          <span
            v-if="hiddenChipCount > 0"
            key="__overflow"
            class="ui-chip ui-chip--md ui-select-chip--overflow"
          >
            +{{ hiddenChipCount }}
          </span>
        </TransitionGroup>
      </slot>
    </span>
    <Transition name="ui-clear">
      <button
        v-if="clearable && !isEmpty && !isDisabled"
        type="button"
        class="ui-select-clear"
        :aria-label="messages.select.clear"
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
    <span class="ui-select-chevron" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </div>

  <Teleport :to="teleportTo">
    <Transition name="ui-select" :css="!forceMount">
      <div
        v-if="forceMount || open"
        v-show="open"
        ref="positioner"
        :class="positionerPart.class"
        :style="[positionerStyle, { zIndex }, positionerPart.style]"
        :data-ui-theme="themeScope"
        :data-state="isClosing ? 'closing' : 'open'"
        :data-side="resolvedSide"
        :data-align="resolvedAlign"
      >
        <div
          ref="panel"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelMaxHeightStyle, panelPart.style]"
          v-bind="$attrs"
        >
          <div v-if="$slots.header" :class="headerPart.class" :style="headerPart.style">
            <slot name="header" :count="filteredItems.length" :total="items.length" />
          </div>
          <div
            v-if="filter !== undefined || $slots.filter"
            :class="filterPart.class"
            :style="filterPart.style"
          >
            <slot name="filter" :query="query" :on-keydown="onFilterKeydown">
              <Input
                ref="filterInputRef"
                v-model="query"
                :placeholder="filterPlaceholder"
                size="sm"
                :aria-label="filterPlaceholder"
                @keydown="onFilterKeydown"
              >
                <template #start>
                  <slot name="filter-icon">
                    <svg
                      class="ui-select-search-icon"
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
                  </slot>
                </template>
              </Input>
            </slot>
          </div>
          <SelectListBody
            ref="listBody"
            :items="filteredItems"
            :get-label="(item: T) => item.label"
            :is-selected="isSelected"
            :active-index="activeIndex"
            :listbox-id="listboxId"
            :multiple="multiple"
            :loading="loading"
            :empty-text="messages.select.empty"
            :item-size="virtualizeConfig?.itemSize"
            :overscan="effectiveOverscan"
            :scroll-fade="scrollFade"
            :ui="{ list: themedUi()?.list, option: themedUi()?.option }"
            @select="(item: T, index: number) => selectItem(item, index)"
            @hover="setActive"
            @reach-end="emit('reach-end')"
          >
            <template v-if="$slots.item" #item="slotProps">
              <slot name="item" v-bind="slotProps" />
            </template>
            <template v-if="$slots.empty" #empty>
              <slot name="empty" />
            </template>
          </SelectListBody>
          <div v-if="$slots.footer" :class="footerPart.class" :style="footerPart.style">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

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
</template>

<script lang="ts">
import type { Side } from '@floating-ui/dom'
import type { Align } from '../../composables/useFloatingPosition'
import type { SelectItemData } from '../internal/SelectListBody.vue'

export type SelectSide = Side
export type SelectAlign = Align
export type { SelectItemData }

/** Explicit virtualization tuning — pass `true`/`false` for a blanket
 * on/off, or this shape to also override row size/overscan. */
export interface SelectVirtualizeConfig {
  itemSize?: number
  overscan?: number
}

/** See the `filter` prop's own doc comment for what each value does. */
export type SelectFilter<T> = boolean | ((item: T, query: string) => boolean)
</script>

<script setup lang="ts" generic="T extends SelectItemData = SelectItemData">
import './Select.css'
import '../shared/tokens.css'
import '../shared/select-panel.css'
import '../shared/select-value.css'
import '../shared/select-list.css'
import '../shared/chip.css'
import { computed, inject, nextTick, useAttrs, useId, useTemplateRef, watch } from 'vue'
import { usePopover } from '../../composables/usePopover'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useListbox } from '../../composables/useListbox'
import type { ScrollAlign } from '../../composables/useVirtualizer'
import { useFieldControl } from '../../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'
import { normalizeText } from '../../composables/normalizeText'
import SelectListBody from '../internal/SelectListBody.vue'
import Input from '../Input/Input.vue'
import Chip from '../Chip/Chip.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

/** Selected value, or an array of values when `multiple`. @default null */
const model = defineModel<string | number | (string | number)[] | null>({ default: null })

const props = withDefaults(
  defineProps<{
    /** Options to choose from. */
    items: ReadonlyArray<T>
    /** Text shown in the trigger while nothing is selected. */
    placeholder?: string
    /**
     * Lets you select several items. The model becomes an array and the panel stays open on pick.
     * @default false
     */
    multiple?: boolean
    /** Disables the trigger and blocks interaction. @default false */
    disabled?: boolean
    /** Marks the field invalid. ORed with the nearest Field's `error` state. @default false */
    invalid?: boolean
    /** Trigger size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Shows a spinner in place of an empty list, or below the rows while more load. @default false */
    loading?: boolean
    /** Shows a clear button once something is selected. @default false */
    clearable?: boolean
    /** `multiple` only: how many chips show before the rest collapse into a "+N" chip. Unset, all show. */
    maxLabels?: number
    /** `multiple` only: `'chip'` shows removable chips, `'text'` comma-joined labels, `'count'` an "N selected"
     * summary.
     * @default 'chip'
     */
    display?: 'chip' | 'text' | 'count'
    /** `true`/`false` forces virtualization on/off; an object also tunes `itemSize`/`overscan`. Unset, it auto-virtualizes past 100 items. */
    virtualize?: boolean | SelectVirtualizeConfig
    /** Renders hidden `<input>`(s) so a plain `<form>` post carries the selection, repeating `name` when `multiple`. */
    name?: string
    /** Which side of the trigger the panel opens on. @default 'bottom' */
    side?: SelectSide
    /** How the panel aligns against the trigger along that side. @default 'start' */
    align?: SelectAlign
    /** Gap between the trigger and the panel, in pixels. @default 8 */
    sideOffset?: number
    /** Shifts the panel along the alignment axis, in pixels. @default 0 */
    alignOffset?: number
    /** Escape key closes the panel. @default true */
    closeOnEsc?: boolean
    /** Clicking outside the panel closes it. @default true */
    closeOnOutside?: boolean
    /** Custom exit animation; call `done()` to finish closing. */
    beforeClose?: (done: () => void) => void
    /** Keeps it mounted, toggled with `v-show`, so you can own the enter/exit animation. @default false */
    forceMount?: boolean
    /** Teleport target: a CSS selector or element. @default 'body' */
    teleportTo?: string | HTMLElement
    /**
     * Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more.
     * @default true
     */
    scrollFade?: boolean
    /** Caps the panel height in pixels; the list scrolls past it. Unset, only the viewport limits it. */
    maxPanelHeight?: number
    /** `false` skips the built-in chip transitions (`multiple` only); animate them yourself via
     * `@chip-enter`/`@chip-leave`.
     * @default true
     */
    motionCss?: boolean
    /** Adds a search box to the panel. `true` matches labels ignoring case and accents, a function
     * matches your way, `false` leaves filtering to you via `v-model:query`. */
    filter?: SelectFilter<T>
    /** Placeholder for the search box. @default 'Search...' */
    filterPlaceholder?: string
    /** Class and style overrides for each part. */
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      filter: UiPartValue
      list: UiPartValue
      option: UiPartValue
      empty: UiPartValue
      footer: UiPartValue
    }>
  }>(),
  {
    multiple: false,
    disabled: false,
    invalid: false,
    size: 'md',
    loading: false,
    clearable: false,
    display: 'chip',
    virtualize: undefined,
    filter: undefined,
    side: 'bottom',
    align: 'start',
    sideOffset: 8,
    alignOffset: 0,
    closeOnEsc: true,
    closeOnOutside: true,
    forceMount: false,
    teleportTo: 'body',
    scrollFade: true,
    motionCss: true,
    filterPlaceholder: 'Search...',
  },
)

const emit = defineEmits<{
  /** Fires before the panel closes; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  /** Fires when you change the selection, including chip removal and clear. */
  change: [value: string | number | (string | number)[] | null]
  /** Fires when the list's last rows render, for loading more. Re-arms when the item count changes. */
  'reach-end': []
  /** Fires when you pick an item, including a pick that deselects it in `multiple` mode. */
  select: [item: T]
  /** Fires instead of the built-in CSS transition when `motionCss` is `false`. Call `done()` once your enter animation finishes. */
  'chip-enter': [el: Element, done: () => void]
  /** Same as `@chip-enter`, for a chip's removal. */
  'chip-leave': [el: Element, done: () => void]
}>()

// Same shape as SpeedDial's own enterHook/leaveHook.
const chipEnterHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('chip-enter', el, done),
)
const chipLeaveHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('chip-leave', el, done),
)

defineSlots<{
  /** Custom trigger content for the current selection (an array when `multiple`). */
  value(props: { selected: T | T[] | null }): unknown
  /** Content above the filter input (when `filter` is on) or the listbox. `count` and `total` support a result-count readout. */
  header(props: { count: number; total: number }): unknown
  /** Replaces the built-in filter row. Bind your input to `v-model:query`; pass keys to `onKeydown`
   * to keep arrow/Home/End/Enter list navigation. */
  filter(props: { query: string; onKeydown: (event: KeyboardEvent) => void }): unknown
  /** Replaces only the built-in filter row's leading icon and keeps its Input frame. */
  'filter-icon'(): unknown
  /** Custom row content for each option. */
  item(props: { item: T; active: boolean; selected: boolean }): unknown
  /** Replaces the text shown when no items match. */
  empty(): unknown
  /** Content below the listbox, such as a "create new" or "view all" action. */
  footer(): unknown
}>()

const messages = useUiMessages()

/** Search box text. Clears when the panel closes. @default '' */
const query = defineModel<string>('query', { default: '' })

const selectedSet = computed<Set<string | number>>(() => {
  if (props.multiple) return new Set(Array.isArray(model.value) ? model.value : [])
  return new Set(model.value == null ? [] : [model.value as string | number])
})
function isSelected(item: T): boolean {
  return selectedSet.value.has(item.value)
}
const filteredItems = computed<T[]>(() => {
  if (props.filter === false) return [...props.items]
  const q = query.value.trim()
  if (!q) return [...props.items]
  if (typeof props.filter === 'function') {
    const match = props.filter
    return props.items.filter((item) => match(item, q))
  }
  const nq = normalizeText(q)
  return props.items.filter((item) => normalizeText(item.label).includes(nq))
})
// Selection always resolves against the full list — an item filtered out of view stays selected.
const selectedItems = computed<T[]>(() => props.items.filter(isSelected))
const isEmpty = computed(() => selectedItems.value.length === 0)
const displayLabel = computed(() => selectedItems.value.map((item) => item.label).join(', '))
const selectedForSlot = computed<T | T[] | null>(() =>
  props.multiple ? selectedItems.value : (selectedItems.value[0] ?? null),
)
const visibleChips = computed<T[]>(() =>
  props.maxLabels != null ? selectedItems.value.slice(0, props.maxLabels) : selectedItems.value,
)
const hiddenChipCount = computed(() =>
  props.maxLabels != null ? Math.max(0, selectedItems.value.length - props.maxLabels) : 0,
)
const selectedCountLabel = computed(() =>
  messages.value.select.selectedCount.replace('{count}', String(selectedItems.value.length)),
)
// Removing one chip is narrower than onClear (which resets the whole
// selection) — the same array-splice selectItem itself does for a row
// click, just entered from the trigger side instead of the panel.
function removeChip(item: T) {
  if (!Array.isArray(model.value)) return
  const next = model.value.filter((value) => value !== item.value)
  model.value = next
  emit('change', next)
}

const fieldControl = useFieldControl({ filled: () => !isEmpty.value })
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

function onClear(event: MouseEvent) {
  event.preventDefault()
  model.value = props.multiple ? [] : null
  emit('change', model.value)
}

/** Whether the panel is open. @default false */
const open = defineModel<boolean>('open', { default: false })
const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const filterInputRef = useTemplateRef<{ el: HTMLElement | null; inputEl: HTMLInputElement | null }>(
  'filterInputRef',
)
// Manual shape since TS can't derive InstanceType from generic SFC.
const listBody = useTemplateRef<{
  listEl: HTMLElement | null
  scrollToIndex: (index: number, align?: ScrollAlign) => void
}>('listBody')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.select,
  () => props.ui,
)
const themeScope = inject(themeScopeKey, undefined)

const {
  positionerStyle,
  placement,
  transformOrigin,
  maxHeight,
  isClosing,
  close,
  cancelClose,
  layerIndex,
} = usePopover(open, {
  triggerEl,
  positionerEl,
  side: () => props.side,
  align: () => props.align,
  sideOffset: () => props.sideOffset,
  alignOffset: () => props.alignOffset,
  // Select-specific: match trigger width (Popover/Menu don't use this).
  matchReferenceWidth: true,
  closeOnEsc: () => props.closeOnEsc,
  closeOnOutside: () => props.closeOnOutside,
  beforeClose: () => props.beforeClose,
  maxHeightCap: () => props.maxPanelHeight,
  onOpenChange: (value, details) => emit('open-change', value, details),
})

// Same shared-layer-stack stacking as Popover.vue/Dialog.vue - see Popover's own comment.
const zIndex = computed(() => `calc(var(--ui-z-dialog, 50) + ${Math.max(0, layerIndex())})`)

const listboxId = useId()

function selectItem(item: T, _index: number) {
  if (item.disabled) return
  if (props.multiple) {
    const current = Array.isArray(model.value) ? [...model.value] : []
    const pos = current.indexOf(item.value)
    if (pos === -1) current.push(item.value)
    else current.splice(pos, 1)
    model.value = current
  } else {
    model.value = item.value
  }
  emit('select', item)
  emit('change', model.value)
  // Single-select commits and closes; multi-select stays open (same "keepOpen" as Menu).
  if (!props.multiple) close()
}

const {
  activeIndex,
  activeId,
  onKeydown: listboxKeydown,
  setActive,
} = useListbox<T>({
  items: () => filteredItems.value,
  getLabel: (item) => item.label,
  isDisabled: (item) => !!item.disabled,
  onSelect: (item, index) => selectItem(item, index),
  onActiveChange: (index) => listBody.value?.scrollToIndex(index),
  listboxId,
})

function openSelect() {
  if (isDisabled.value) return
  open.value = true
}
// Close goes through usePopover (respects beforeClose); open doesn't (nothing to defer).
function onTriggerClick() {
  if (isDisabled.value) return
  if (open.value) close()
  else openSelect()
}
function onTriggerKeydown(event: KeyboardEvent) {
  if (isDisabled.value) return
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openSelect()
    }
    return
  }
  if (event.key === 'Escape') return
  if (event.key === ' ') {
    // Space commits active row (select-only combobox, not editable input).
    event.preventDefault()
    const item = filteredItems.value[activeIndex.value]
    if (item) selectItem(item, activeIndex.value)
    return
  }
  listboxKeydown(event)
}
// Filter input owns focus while typing — Space must type a literal space, so only
// forward the navigation/commit keys onto the same listbox logic the trigger uses.
function onFilterKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
    case 'Home':
    case 'End':
    case 'Enter':
      listboxKeydown(event)
      return
    case 'Escape':
      event.preventDefault()
      close()
      triggerEl.value?.focus()
      return
    default:
      return
  }
}

function computeInitialActive(): number {
  const list = filteredItems.value
  if (list.length === 0) return -1
  const selectedIndex = list.findIndex((item) => isSelected(item))
  return selectedIndex >= 0 ? selectedIndex : 0
}

// Gate on visibility:hidden resolution (floating-ui's async computePosition).
watch(
  () => open.value && positionerStyle.value.visibility === 'visible',
  (ready) => {
    if (!ready) return
    nextTick(() => {
      const initial = computeInitialActive()
      setActive(initial)
      if (initial >= 0) listBody.value?.scrollToIndex(initial, 'center')
      if (props.filter) filterInputRef.value?.inputEl?.focus()
    })
  },
)
// Reopening starts unfiltered — a stale query silently hiding items would be confusing.
watch(open, (isOpen) => {
  if (!isOpen) query.value = ''
})
// Keep activeIndex valid (and pointed at something sensible) as filtering reshapes the list.
watch(filteredItems, () => {
  if (open.value) setActive(computeInitialActive())
})

const AUTO_VIRTUALIZE_THRESHOLD = 100
const DEFAULT_OVERSCAN = 8
const virtualizeConfig = computed<SelectVirtualizeConfig | null>(() => {
  if (props.virtualize === false) return null
  if (props.virtualize === true) return {}
  if (props.virtualize && typeof props.virtualize === 'object') return props.virtualize
  return filteredItems.value.length > AUTO_VIRTUALIZE_THRESHOLD ? {} : null
})
// Non-virtualized mode: overscan large enough that nothing clips (one code path).
const effectiveOverscan = computed(() =>
  virtualizeConfig.value
    ? (virtualizeConfig.value.overscan ?? DEFAULT_OVERSCAN)
    : filteredItems.value.length,
)

const panelMaxHeightStyle = computed(() =>
  maxHeight.value != null ? { maxHeight: `${maxHeight.value}px` } : {},
)

const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.trigger,
    'ui-select-trigger',
    `ui-select-trigger--${props.size}`,
    isDisabled.value && 'ui-select-trigger--disabled',
    attrs.class as string | undefined,
  ),
)
const valuePart = computed(() => resolveUiPart(cx, themedUi()?.value, 'ui-select-value'))
const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-select-positioner'),
)
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-select-panel'))
const headerPart = computed(() => resolveUiPart(cx, themedUi()?.header, 'ui-select-header'))
const filterPart = computed(() => resolveUiPart(cx, themedUi()?.filter, 'ui-select-filter'))
const footerPart = computed(() => resolveUiPart(cx, themedUi()?.footer, 'ui-select-footer'))

const resolvedSide = computed(() => placement.value.split('-')[0] as SelectSide)
const resolvedAlign = computed<SelectAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

const listEl = computed(() => listBody.value?.listEl ?? null)
function scrollToIndex(index: number, align?: ScrollAlign) {
  listBody.value?.scrollToIndex(index, align)
}

defineExpose({
  /** Trigger element. */
  triggerEl,
  /** Panel element (null while closed). */
  panelEl,
  /** Positioning wrapper around the panel (null while closed). */
  positionerEl,
  /** Scrollable listbox element (null while closed). */
  listEl,
  /** Built-in search Input instance (null without `filter`, with a `#filter` slot, or while closed). */
  filterInputRef,
  /** Resolved placement after flipping, e.g. `'bottom-start'`. */
  placement,
  /** Inline positioning styles applied to the positioner. */
  positionerStyle,
  /** True while a `beforeClose` close is pending. */
  isClosing,
  /** Opens the panel (no-op while disabled). */
  open: openSelect,
  /** Closes the panel, running `@open-change` and `beforeClose` first. */
  close,
  /** Cancels a close pending in `beforeClose` and keeps the panel open. */
  cancelClose,
  /** Index of the highlighted row in the filtered list (-1 for none). */
  activeIndex,
  /** Scrolls the list to the row at `index`. */
  scrollToIndex,
})
</script>
