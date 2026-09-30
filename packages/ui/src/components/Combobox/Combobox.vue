<template>
  <Input
    ref="inputRef"
    v-bind="attrs"
    v-model="query"
    :placeholder="placeholder"
    :size="size"
    :disabled="disabled"
    :invalid="isInvalid"
    role="combobox"
    aria-haspopup="listbox"
    :aria-expanded="open"
    :aria-controls="listboxId"
    :aria-activedescendant="open ? activeId : undefined"
    aria-autocomplete="list"
    autocomplete="off"
    :data-open="open || undefined"
    :ui="innerUi"
    @input="onQueryInput"
    @keydown="onInputKeydown"
    @focus="onInputFocus"
    @blur="onInputBlur"
  >
    <template v-if="multiple || $slots.start" #start>
      <!-- v-if="multiple" not && selectedItems.length: empty wrapper keeps last chip's leave transition -->
      <TransitionGroup
        v-if="multiple"
        name="ui-chip-item"
        tag="span"
        class="ui-combobox-chips"
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
          @remove="removeItem(item)"
        />
        <span
          v-if="hiddenChipCount > 0"
          key="__overflow"
          class="ui-chip ui-chip--md ui-select-chip--overflow"
        >
          +{{ hiddenChipCount }}
        </span>
      </TransitionGroup>
      <slot name="start" />
    </template>
    <template #end>
      <slot name="end" />
      <Transition name="ui-clear">
        <button
          v-if="clearable && !isDisabled && (hasValue || query.length > 0)"
          type="button"
          class="ui-combobox-clear"
          :aria-label="messages.combobox.clear"
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
      <button
        type="button"
        class="ui-combobox-chevron"
        :aria-label="messages.combobox.toggle"
        :aria-expanded="open"
        :disabled="isDisabled"
        tabindex="-1"
        @mousedown.prevent
        @click="onChevronClick"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </template>
  </Input>

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
          <SelectListBody
            ref="listBody"
            :items="listItems"
            :get-label="(item: T) => item.label"
            :is-selected="isSelected"
            :active-index="activeIndex"
            :listbox-id="listboxId"
            :multiple="multiple"
            :loading="loading"
            :empty-text="messages.combobox.empty"
            :item-size="virtualizeConfig?.itemSize"
            :overscan="effectiveOverscan"
            :scroll-fade="scrollFade"
            :ui="{ list: themedUi()?.list, option: themedUi()?.option }"
            @select="(item: T, index: number) => selectItem(item, index)"
            @hover="setActive"
            @reach-end="emit('reach-end')"
          >
            <template #item="slotProps">
              <slot
                v-if="isCreateRow(slotProps.item)"
                name="create"
                :query="trimmedQuery"
                :active="slotProps.active"
              >
                <svg
                  class="ui-combobox-create-icon"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8 3.5v9M3.5 8h9"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
                <span class="ui-select-option-label">{{ createLabel }}</span>
              </slot>
              <slot v-else name="item" v-bind="slotProps" :query="trimmedQuery">
                <span class="ui-select-option-label">{{ slotProps.item.label }}</span>
                <span v-if="slotProps.selected" class="ui-select-option-check" aria-hidden="true"
                  >✓</span
                >
              </slot>
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
import type { SelectVirtualizeConfig } from '../Select/Select.vue'

export type ComboboxSide = Side
export type ComboboxAlign = Align
export type { SelectItemData }

export type ComboboxFilter<T> = boolean | ((item: T, query: string) => boolean)

/** `option`: the Create row was picked. `enter`: Enter with no row active (`createOption` off). `tab`: `tabBehavior`. `blur`: `commitOnBlur`. */
export type ComboboxCreateReason = 'option' | 'enter' | 'tab' | 'blur'

export type ComboboxTabBehavior = 'select' | 'create'

export interface ComboboxCreateDetails {
  reason: ComboboxCreateReason
  /** Vetoes the commit: the model is left untouched. */
  cancel: () => void
}
</script>

<!-- Combobox absorbs Autocomplete (one component). Shares Select's internals: usePopover + useListbox + SelectListBody.
     Trigger: Input.vue instead of button (for Field wiring, frame, float/inset label).
     Focus stays in input; only ArrowDown/Up/Home/End forwarded to listbox (typeahead disabled here for live filtering).
     allowCustom: the Create row is a real option inside the list, not footer content, so it's keyboard-reachable even when
     the typed text partially matches an existing item ("tu" inside "feature"). commitOnBlur defaults off because clicking
     away is rarely an intent to create — only an explicit pick of the Create row (or Enter) commits. -->
<script setup lang="ts" generic="T extends SelectItemData = SelectItemData">
import './Combobox.css'
import '../shared/tokens.css'
import '../shared/select-panel.css'
import '../shared/select-value.css'
import '../shared/select-list.css'
import '../shared/chip.css'
import { computed, inject, nextTick, ref, useAttrs, useId, useTemplateRef, watch } from 'vue'
import Input from '../Input/Input.vue'
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
import Chip from '../Chip/Chip.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

/** Selected value, or an array of values when `multiple`. @default null */
const model = defineModel<string | number | (string | number)[] | null>({ default: null })
/**
 * Input text. Holds the selected label in single mode; clears after each pick when `multiple`.
 * @default ''
 */
const query = defineModel<string>('query', { default: '' })

const props = withDefaults(
  defineProps<{
    /** Options to choose from. */
    items: ReadonlyArray<T>
    /** Text shown in the input while it's empty. */
    placeholder?: string
    /** Lets you select several items. The model becomes an array, the panel stays open on pick, and
     * selections show as removable chips.
     * @default false
     */
    multiple?: boolean
    /** `multiple` only: how many chips show before the rest collapse into a "+N" chip. Unset, all show. */
    maxLabels?: number
    /** Disables the input and blocks interaction. @default false */
    disabled?: boolean
    /** Marks the field invalid. ORed with the nearest Field's `error` state. @default false */
    invalid?: boolean
    /** Input size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Shows a spinner in place of an empty list, or below the rows while more load. @default false */
    loading?: boolean
    /** Shows a clear button once there's a selection or typed text; clearing empties both. @default false */
    clearable?: boolean
    /** `true`/`false` forces virtualization on/off; an object also tunes `itemSize`/`overscan`. Unset, it auto-virtualizes past 100 items. */
    virtualize?: boolean | SelectVirtualizeConfig
    /** Renders hidden `<input>`(s) so a plain `<form>` post carries the selection, repeating `name` when `multiple`. */
    name?: string
    /** How typed text filters `items`. `true` matches labels ignoring case and accents; a function
     * matches your way. `false` shows `items` as-is so you can filter them yourself.
     * @default true
     */
    filter?: ComboboxFilter<T>
    /** Lets typed text that isn't an item become the value, after a cancelable `@create`. Add it to
     * `items` yourself if it should become a real option.
     * @default false
     */
    allowCustom?: boolean
    /** `allowCustom` only: appends a `Create "…"` row whenever the typed text
     * isn't already an item's label. Customize it with `#create`.
     * @default true
     */
    createOption?: boolean
    /** `allowCustom` only: leaving the field with uncommitted text commits it
     * (reason `'blur'`). When `false`, the text reverts instead.
     * @default false
     */
    commitOnBlur?: boolean
    /** What Tab commits before focus moves on. `'select'`: the highlighted row, once you type or move
     * the highlight with the keyboard. `'create'` (`allowCustom` only): the typed text, or the item it names. */
    tabBehavior?: ComboboxTabBehavior
    /** Opens the panel on focus, before you type. Unset means on; set `false` to require typing first. */
    openOnFocus?: boolean
    /** Which side of the input the panel opens on. @default 'bottom' */
    side?: ComboboxSide
    /** How the panel aligns against the input along that side. @default 'start' */
    align?: ComboboxAlign
    /** Gap between the input and the panel, in pixels. @default 8 */
    sideOffset?: number
    /** Shifts the panel along the alignment axis, in pixels. @default 0 */
    alignOffset?: number
    /** Escape key closes the panel (and reverts uncommitted typing). @default true */
    closeOnEsc?: boolean
    /** Clicking outside the panel, or tabbing away, closes it. @default true */
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
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
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
    filter: true,
    allowCustom: false,
    createOption: true,
    commitOnBlur: false,
    tabBehavior: undefined,
    virtualize: undefined,
    // Explicit undefined: distinguishes "not set" from "true".
    openOnFocus: undefined,
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
  },
)

const emit = defineEmits<{
  /** Fires before the panel closes; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  /** Fires when you change the value, including custom values, chip removal and clear. */
  change: [value: string | number | (string | number)[] | null]
  /** Fires when the list's last rows render, for loading more. Re-arms when the item count changes. */
  'reach-end': []
  /** Fires when you pick an item, including a pick that deselects it in `multiple` mode. */
  select: [item: T]
  /** Fires before the typed text commits as a custom value. Call `details.cancel()` to veto it,
   * for validation or an async create that sets the model itself. */
  create: [query: string, details: ComboboxCreateDetails]
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
  /** Content before the input text, after any chips. */
  start(): unknown
  /** Content before the built-in clear button and chevron, inside Input's `#end`. */
  end(): unknown
  /** Content above the listbox, inside the popover panel. `count` and `total` support a result-count readout. */
  header(props: { count: number; total: number }): unknown
  /** Custom row content for each option. `query` is the trimmed typed text, for highlighting the match. */
  item(props: {
    item: T
    index: number
    active: boolean
    selected: boolean
    query: string
  }): unknown
  /** Content of the `allowCustom` Create row. */
  create(props: { query: string; active: boolean }): unknown
  /** Replaces the text shown when no items match. */
  empty(): unknown
  /** Content below the listbox, inside the popover panel. */
  footer(): unknown
}>()

const messages = useUiMessages()
const fieldControl = useFieldControl()
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

// True only once the user has actually typed - query also holds the selected item's label
// passively (mount-synced, or set by selectItem/onClear), and that shouldn't narrow the list
// down to a single row the moment the panel opens; only real keystrokes should filter.
const queryDirty = ref(false)
// Arrow/Home/End since the panel opened — tabBehavior 'select' treats that as intent, like typing.
const keyboardNavigated = ref(false)

const filteredItems = computed<T[]>(() => {
  if (props.filter === false || !queryDirty.value) return [...props.items]
  const q = query.value.trim()
  if (!q) return [...props.items]
  if (typeof props.filter === 'function') {
    const match = props.filter
    return props.items.filter((item) => match(item, q))
  }
  const nq = normalizeText(q)
  return props.items.filter((item) => normalizeText(item.label).includes(nq))
})

const CREATE_ROW = Symbol('combobox-create-row')
function isCreateRow(item: T): boolean {
  return (item as { [CREATE_ROW]?: true })[CREATE_ROW] === true
}
const trimmedQuery = computed(() => query.value.trim())
const showCreateRow = computed(() => {
  if (!props.allowCustom || !props.createOption || !queryDirty.value || props.loading) return false
  const raw = trimmedQuery.value
  if (!raw) return false
  const nq = normalizeText(raw)
  if (props.items.some((item) => normalizeText(item.label) === nq)) return false
  if (props.multiple) return !(Array.isArray(model.value) && model.value.includes(raw))
  return model.value !== raw
})
const listItems = computed<T[]>(() =>
  showCreateRow.value
    ? [
        ...filteredItems.value,
        {
          label: trimmedQuery.value,
          value: trimmedQuery.value,
          [CREATE_ROW]: true,
        } as unknown as T,
      ]
    : filteredItems.value,
)
const createLabel = computed(() =>
  messages.value.combobox.create.replace('{query}', trimmedQuery.value),
)

function labelFor(value: string | number | (string | number)[] | null): string {
  if (value == null || Array.isArray(value)) return ''
  return props.items.find((item) => item.value === value)?.label ?? String(value)
}

function isSelected(item: T): boolean {
  if (isCreateRow(item)) return false
  if (props.multiple) return Array.isArray(model.value) && model.value.includes(item.value)
  return model.value != null && item.value === model.value
}
// Filter full item list (not map raw values) so chips show current label on reload.
const selectedItems = computed<T[]>(() => (props.multiple ? props.items.filter(isSelected) : []))
const visibleChips = computed<T[]>(() =>
  props.maxLabels != null ? selectedItems.value.slice(0, props.maxLabels) : selectedItems.value,
)
const hiddenChipCount = computed(() =>
  props.maxLabels != null ? Math.max(0, selectedItems.value.length - props.maxLabels) : 0,
)
const hasValue = computed(() =>
  props.multiple ? Array.isArray(model.value) && model.value.length > 0 : model.value != null,
)
// Same array-splice as selectItem (for toggle), just from chip removal.
function removeItem(item: T) {
  if (!Array.isArray(model.value)) return
  const next = model.value.filter((value) => value !== item.value)
  model.value = next
  emit('change', next)
}

/** Whether the panel is open. @default false */
const open = defineModel<boolean>('open', { default: false })
const inputRef = useTemplateRef('inputRef')
const el = computed(() => inputRef.value?.el ?? null)
const inputEl = computed(() => inputRef.value?.inputEl ?? null)
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
// Same manual-shape rationale as Select.vue's own listBody ref.
const listBody = useTemplateRef<{
  listEl: HTMLElement | null
  scrollToIndex: (index: number, align?: ScrollAlign) => void
}>('listBody')

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.combobox,
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
  triggerEl: el,
  positionerEl,
  side: () => props.side,
  align: () => props.align,
  sideOffset: () => props.sideOffset,
  alignOffset: () => props.alignOffset,
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

// Multiple: stays open, query clears; single: closes.
function selectItem(item: T, _index: number, createReason: ComboboxCreateReason = 'option') {
  if (isCreateRow(item)) {
    commitCustom(createReason)
    return
  }
  if (item.disabled) return
  if (props.multiple) {
    const current = Array.isArray(model.value) ? [...model.value] : []
    const pos = current.indexOf(item.value)
    if (pos === -1) current.push(item.value)
    else current.splice(pos, 1)
    model.value = current
    query.value = ''
    queryDirty.value = false
    emit('select', item)
    emit('change', model.value)
    // Stays open (multiple mode)
    return
  }
  model.value = item.value
  query.value = item.label
  queryDirty.value = false
  emit('select', item)
  emit('change', model.value)
  close()
}

function commitCustom(reason: ComboboxCreateReason): boolean {
  const raw = trimmedQuery.value
  if (!raw) return false
  let cancelled = false
  emit('create', raw, {
    reason,
    cancel: () => {
      cancelled = true
    },
  })
  if (cancelled) return false
  if (props.multiple) {
    const current = Array.isArray(model.value) ? [...model.value] : []
    if (!current.includes(raw)) current.push(raw)
    model.value = current
    query.value = ''
  } else {
    model.value = raw
    query.value = raw
  }
  queryDirty.value = false
  emit('change', model.value)
  if (!props.multiple && reason !== 'blur') close()
  return true
}

function revertQuery() {
  query.value = props.multiple ? '' : labelFor(model.value)
  queryDirty.value = false
}

const {
  activeIndex,
  activeId,
  setActive,
  onKeydown: listboxKeydown,
} = useListbox<T>({
  items: () => listItems.value,
  getLabel: (item) => item.label,
  isDisabled: (item) => !!item.disabled,
  onSelect: (item, index) => selectItem(item, index),
  onActiveChange: (index) => listBody.value?.scrollToIndex(index),
  listboxId,
})

// Priority: a row whose label IS the typed text, then the current selection, then the first
// enabled row. `multiple` has no single selection to re-focus, so it skips the middle step.
function computeInitialActive(): number {
  const list = listItems.value
  if (queryDirty.value && trimmedQuery.value) {
    const nq = normalizeText(trimmedQuery.value)
    const exact = list.findIndex(
      (item) => !item.disabled && !isCreateRow(item) && normalizeText(item.label) === nq,
    )
    if (exact >= 0) return exact
  }
  if (!props.multiple && model.value != null) {
    const index = list.findIndex((item) => !item.disabled && item.value === model.value)
    if (index >= 0) return index
  }
  return list.findIndex((item) => !item.disabled)
}

const openOnFocusResolved = computed(() => props.openOnFocus ?? true)
const isFocused = ref(false)

// Resyncs query from an externally-changed model (mount, or a parent swap) - skipped while focused so it can't clobber in-progress typing, and skipped in `multiple` mode where query is search text, not a label.
watch(
  [model, () => props.items],
  ([value]) => {
    if (props.multiple || isFocused.value) return
    query.value = labelFor(value)
    queryDirty.value = false
  },
  { immediate: true },
)

function onQueryInput() {
  if (isDisabled.value) return
  queryDirty.value = true
  if (!open.value) open.value = true
}
function onInputFocus() {
  isFocused.value = true
  if (!isDisabled.value && openOnFocusResolved.value) open.value = true
}
function onInputBlur(event?: FocusEvent) {
  isFocused.value = false
  // Focus leaving for good (Tab, programmatic) closes the panel too; focus moving INTO it (a #footer button) doesn't.
  const next = event?.relatedTarget as Node | null | undefined
  if (props.closeOnOutside && !(next && panelEl.value?.contains(next))) close()
  // Multiple: query is search text, not committed label; chips are source of truth.
  if (props.multiple ? !trimmedQuery.value : query.value === labelFor(model.value)) return
  if (props.allowCustom && props.commitOnBlur && commitCustom('blur')) return
  revertQuery()
}

function onInputKeydown(event: KeyboardEvent) {
  if (isDisabled.value) return
  // usePopover's capture-phase listener has already closed the panel by now, so this can't sit behind the `open` check below.
  if (event.key === 'Escape') {
    if (props.closeOnEsc && queryDirty.value) revertQuery()
    return
  }
  // Backspace on empty query removes last chip (tag-input convention).
  if (props.multiple && event.key === 'Backspace' && query.value === '') {
    const current = Array.isArray(model.value) ? model.value : []
    if (current.length > 0) {
      event.preventDefault()
      const next = current.slice(0, -1)
      model.value = next
      emit('change', next)
    }
    return
  }
  if (event.key === 'Tab') {
    onTab()
    return
  }
  if (!open.value) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      open.value = true
    }
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const active = listItems.value[activeIndex.value]
    if (active) selectItem(active, activeIndex.value)
    else if (props.allowCustom) commitCustom('enter')
    return
  }
  if (
    event.key === 'ArrowDown' ||
    event.key === 'ArrowUp' ||
    event.key === 'Home' ||
    event.key === 'End'
  ) {
    keyboardNavigated.value = true
    listboxKeydown(event)
  }
}

// Never preventDefault: focus still moves on, this only decides what's committed first.
function onTab() {
  if (props.tabBehavior === 'select') {
    if (!open.value || !(queryDirty.value || keyboardNavigated.value)) return
    const active = listItems.value[activeIndex.value]
    if (!active || active.disabled || (props.multiple && isSelected(active))) return
    selectItem(active, activeIndex.value, 'tab')
  } else if (props.tabBehavior === 'create') {
    if (!props.allowCustom || !queryDirty.value || !trimmedQuery.value) return
    const nq = normalizeText(trimmedQuery.value)
    const named = props.items.find((item) => !item.disabled && normalizeText(item.label) === nq)
    if (!named) commitCustom('tab')
    else if (props.multiple && isSelected(named)) revertQuery()
    else selectItem(named, -1)
  }
}

function onChevronClick() {
  if (isDisabled.value) return
  if (open.value) {
    close()
    return
  }
  open.value = true
  inputEl.value?.focus()
}

function onClear(event: MouseEvent) {
  event.preventDefault()
  model.value = props.multiple ? [] : null
  query.value = ''
  queryDirty.value = false
  emit('change', model.value)
  inputEl.value?.focus()
}

// Center active row on initial open only (re-center on every keystroke would fight typing)
watch(
  () => open.value && positionerStyle.value.visibility === 'visible',
  (ready) => {
    if (!ready) return
    nextTick(() => {
      const initial = computeInitialActive()
      setActive(initial)
      const selectedIndex =
        !props.multiple && model.value != null
          ? filteredItems.value.findIndex((item) => item.value === model.value)
          : -1
      if (selectedIndex >= 0) listBody.value?.scrollToIndex(selectedIndex, 'center')
    })
  },
)
watch(listItems, () => {
  if (open.value) setActive(computeInitialActive())
})
watch(open, (value) => {
  if (value) keyboardNavigated.value = false
})

const AUTO_VIRTUALIZE_THRESHOLD = 100
const DEFAULT_OVERSCAN = 8
const virtualizeConfig = computed<SelectVirtualizeConfig | null>(() => {
  if (props.virtualize === false) return null
  if (props.virtualize === true) return {}
  if (props.virtualize && typeof props.virtualize === 'object') return props.virtualize
  return filteredItems.value.length > AUTO_VIRTUALIZE_THRESHOLD ? {} : null
})
const effectiveOverscan = computed(() =>
  virtualizeConfig.value
    ? (virtualizeConfig.value.overscan ?? DEFAULT_OVERSCAN)
    : listItems.value.length,
)

const panelMaxHeightStyle = computed(() =>
  maxHeight.value != null ? { maxHeight: `${maxHeight.value}px` } : {},
)

const innerUi = computed(() => ({
  root: resolveUiPart(
    cx,
    themedUi()?.root,
    props.multiple && props.maxLabels == null && 'ui-combobox-input--wrap',
  ),
  input: themedUi()?.input,
}))
const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-select-positioner', 'ui-combobox-positioner'),
)
const panelPart = computed(() =>
  resolveUiPart(cx, themedUi()?.panel, 'ui-select-panel', 'ui-combobox-panel'),
)
const headerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.header, 'ui-select-header', 'ui-combobox-header'),
)
const footerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.footer, 'ui-select-footer', 'ui-combobox-footer'),
)

const resolvedSide = computed(() => placement.value.split('-')[0] as ComboboxSide)
const resolvedAlign = computed<ComboboxAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

const listEl = computed(() => listBody.value?.listEl ?? null)
function scrollToIndex(index: number, align?: ScrollAlign) {
  listBody.value?.scrollToIndex(index, align)
}

defineExpose({
  /** Root element (the input's frame). */
  el,
  /** Native `<input>` element. */
  inputEl,
  /** Panel element (null while closed). */
  panelEl,
  /** Positioning wrapper around the panel (null while closed). */
  positionerEl,
  /** Scrollable listbox element (null while closed). */
  listEl,
  /** Resolved placement after flipping, e.g. `'bottom-start'`. */
  placement,
  /** Inline positioning styles applied to the positioner. */
  positionerStyle,
  /** True while a `beforeClose` close is pending. */
  isClosing,
  /** Opens the panel (no-op while disabled). */
  open: () => {
    if (!isDisabled.value) open.value = true
  },
  /** Closes the panel, running `@open-change` and `beforeClose` first. */
  close,
  /** Cancels a close pending in `beforeClose` and keeps the panel open. */
  cancelClose,
  /** Index of the highlighted row in the list (-1 for none). */
  activeIndex,
  /** Scrolls the list to the row at `index`. */
  scrollToIndex,
})
</script>
