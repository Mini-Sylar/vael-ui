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
      <TransitionGroup v-if="multiple" name="ui-chip-item" tag="span" class="ui-combobox-chips">
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
        :style="[positionerStyle, positionerPart.style]"
        :data-ui-theme="themeScope"
        :data-state="isClosing ? 'closing' : 'open'"
        :data-side="resolvedSide"
        :data-align="resolvedAlign"
      >
        <div
          ref="panel"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelPart.style]"
          v-bind="$attrs"
        >
          <SelectListBody
            ref="listBody"
            :style="bodyStyle"
            :items="filteredItems"
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
            <template v-if="$slots.item" #item="slotProps">
              <slot name="item" v-bind="slotProps" />
            </template>
            <template v-if="$slots.empty" #empty>
              <slot name="empty" />
            </template>
          </SelectListBody>
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
</script>

<!-- Combobox absorbs Autocomplete (one component). Shares Select's internals: usePopover + useListbox + SelectListBody.
     Trigger: Input.vue instead of button (for Field wiring, frame, float/inset label).
     Focus stays in input; only ArrowDown/Up/Home/End forwarded to listbox (typeahead disabled here for live filtering). -->
<script setup lang="ts" generic="T extends SelectItemData = SelectItemData">
import './Combobox.css'
import '../shared/tokens.css'
import '../shared/select-panel.css'
import '../shared/select-value.css'
import '../shared/select-list.css'
import '../shared/chip.css'
import { computed, inject, nextTick, useAttrs, useId, useTemplateRef, watch } from 'vue'
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
import SelectListBody from '../internal/SelectListBody.vue'
import Chip from '../Chip/Chip.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const model = defineModel<string | number | (string | number)[] | null>({ default: null })
const query = defineModel<string>('query', { default: '' })

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<T>
    placeholder?: string
    /** Model becomes `(string | number)[]`. Selecting adds an item without closing the panel; clicking a selected row removes it. Selections render as removable chips. */
    multiple?: boolean
    /** `multiple` only: how many selected items render as chips before collapsing the rest into a "+N" indicator. Default: uncollapsed. */
    maxLabels?: number
    disabled?: boolean
    invalid?: boolean
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    clearable?: boolean
    /** `true`/`false` forces virtualization on/off; an object also tunes `itemSize`/`overscan`. Default: auto-virtualizes past 100 items. */
    virtualize?: boolean | SelectVirtualizeConfig
    name?: string
    /** `true` (default): case/diacritic-insensitive local match on
     * `getLabel`. `false`: consumer filters (bind `items` to an async
     * result) — `filteredItems` becomes `items` verbatim. A function: fully
     * custom local match. */
    filter?: ComboboxFilter<T>
    /** Enter with no active option, or blur with unmatched text, commits
     * the raw typed string as the model value and emits `create`. */
    allowCustom?: boolean
    /** Opens the panel on focus before typing (the discoverability default). Set `false` to require typing first. */
    openOnFocus?: boolean
    side?: ComboboxSide
    align?: ComboboxAlign
    sideOffset?: number
    alignOffset?: number
    closeOnEsc?: boolean
    closeOnOutside?: boolean
    beforeClose?: (done: () => void) => void
    forceMount?: boolean
    teleportTo?: string | HTMLElement
    scrollFade?: boolean
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      list: UiPartValue
      option: UiPartValue
      empty: UiPartValue
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
  },
)

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  change: [value: string | number | (string | number)[] | null]
  'reach-end': []
  select: [item: T]
  /** `allowCustom` committed the raw typed text — no matching item. */
  create: [query: string]
}>()

defineSlots<{
  start(): unknown
  /** Renders before the library's own clear/chevron, inside Input's `#end`. */
  end(): unknown
  item(props: { item: T; active: boolean; selected: boolean }): unknown
  empty(): unknown
}>()

const messages = useUiMessages()
const fieldControl = useFieldControl()
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const filteredItems = computed<T[]>(() => {
  if (props.filter === false) return [...props.items]
  const q = query.value.trim()
  if (!q) return [...props.items]
  if (typeof props.filter === 'function') {
    const match = props.filter
    return props.items.filter((item) => match(item, q))
  }
  const nq = normalize(q)
  return props.items.filter((item) => normalize(item.label).includes(nq))
})

function isSelected(item: T): boolean {
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

const { positionerStyle, placement, transformOrigin, maxHeight, isClosing, close, cancelClose } =
  usePopover(open, {
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
    onOpenChange: (value, details) => emit('open-change', value, details),
  })

const listboxId = useId()

// Multiple: stays open, query clears; single: closes.
function selectItem(item: T, _index: number) {
  if (item.disabled) return
  if (props.multiple) {
    const current = Array.isArray(model.value) ? [...model.value] : []
    const pos = current.indexOf(item.value)
    if (pos === -1) current.push(item.value)
    else current.splice(pos, 1)
    model.value = current
    query.value = ''
    emit('select', item)
    emit('change', model.value)
    // Stays open (multiple mode)
    return
  }
  model.value = item.value
  query.value = item.label
  emit('select', item)
  emit('change', model.value)
  close()
}

function commitCustom() {
  const raw = query.value.trim()
  if (!raw) return
  if (props.multiple) {
    const current = Array.isArray(model.value) ? [...model.value] : []
    if (!current.includes(raw)) current.push(raw)
    model.value = current
    query.value = ''
  } else {
    model.value = raw
  }
  emit('create', raw)
  emit('change', model.value)
}

const {
  activeIndex,
  activeId,
  setActive,
  onKeydown: listboxKeydown,
} = useListbox<T>({
  items: () => filteredItems.value,
  getLabel: (item) => item.label,
  isDisabled: (item) => !!item.disabled,
  onSelect: (item, index) => selectItem(item, index),
  onActiveChange: (index) => listBody.value?.scrollToIndex(index),
  listboxId,
})

function computeInitialActive(): number {
  const list = filteredItems.value
  if (list.length === 0) return -1
  // `multiple` has no single "the" selection to re-focus — several rows can
  // be active at once, so this just lands on the first row, same as opening
  // with nothing selected in single mode.
  if (!props.multiple && model.value != null) {
    const index = list.findIndex((item) => item.value === model.value)
    if (index >= 0) return index
  }
  return 0
}

const openOnFocusResolved = computed(() => props.openOnFocus ?? true)

function onQueryInput() {
  if (isDisabled.value) return
  if (!open.value) open.value = true
}
function onInputFocus() {
  if (!isDisabled.value && openOnFocusResolved.value) open.value = true
}
function onInputBlur() {
  // Multiple: query is search text, not committed label; chips are source of truth.
  if (props.multiple) {
    if (!query.value.trim()) return
    if (props.allowCustom) {
      commitCustom()
      return
    }
    query.value = ''
    return
  }
  const activeLabel =
    model.value != null ? (props.items.find((item) => item.value === model.value)?.label ?? '') : ''
  if (query.value === activeLabel) return
  if (props.allowCustom) {
    commitCustom()
    return
  }
  // No match and allowCustom=false: revert to committed selection's label
  query.value = activeLabel
}

function onInputKeydown(event: KeyboardEvent) {
  if (isDisabled.value) return
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
  if (!open.value) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      open.value = true
    }
    return
  }
  if (event.key === 'Escape') return
  if (event.key === 'Enter') {
    event.preventDefault()
    const active = filteredItems.value[activeIndex.value]
    if (active) {
      selectItem(active, activeIndex.value)
    } else if (props.allowCustom) {
      commitCustom()
      if (!props.multiple) close()
    }
    return
  }
  if (
    event.key === 'ArrowDown' ||
    event.key === 'ArrowUp' ||
    event.key === 'Home' ||
    event.key === 'End'
  ) {
    listboxKeydown(event)
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
const effectiveOverscan = computed(() =>
  virtualizeConfig.value
    ? (virtualizeConfig.value.overscan ?? DEFAULT_OVERSCAN)
    : filteredItems.value.length,
)

const bodyStyle = computed(() =>
  maxHeight.value != null ? { maxHeight: `${maxHeight.value}px`, overflowY: 'auto' as const } : {},
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
  el,
  inputEl,
  panelEl,
  positionerEl,
  listEl,
  placement,
  positionerStyle,
  isClosing,
  open: () => {
    if (!isDisabled.value) open.value = true
  },
  close,
  cancelClose,
  activeIndex,
  scrollToIndex,
})
</script>
