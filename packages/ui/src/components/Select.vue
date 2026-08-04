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
        <TransitionGroup v-else name="ui-chip-item" tag="span" class="ui-select-chips">
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
            :items="items"
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
import type { Align } from '../composables/useFloatingPosition'
import type { SelectItemData } from './internal/SelectListBody.vue'

export type SelectSide = Side
export type SelectAlign = Align
export type { SelectItemData }

/** Explicit virtualization tuning — pass `true`/`false` for a blanket
 * on/off, or this shape to also override row size/overscan. */
export interface SelectVirtualizeConfig {
  itemSize?: number
  overscan?: number
}
</script>

<script setup lang="ts" generic="T extends SelectItemData = SelectItemData">
import './shared/chip.css'
import { computed, inject, nextTick, useAttrs, useId, useTemplateRef, watch } from 'vue'
import { usePopover } from '../composables/usePopover'
import type { PopoverOpenChangeDetails } from '../composables/usePopover'
import { useListbox } from '../composables/useListbox'
import type { ScrollAlign } from '../composables/useVirtualizer'
import { useFieldControl } from '../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { themeScopeKey, useThemedUi } from '../theme'
import { useUiMessages } from '../messages'
import SelectListBody from './internal/SelectListBody.vue'
import Chip from './Chip/Chip.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const model = defineModel<string | number | (string | number)[] | null>({ default: null })

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<T>
    placeholder?: string
    multiple?: boolean
    disabled?: boolean
    invalid?: boolean
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    clearable?: boolean
    /** `multiple` only: how many selected items render as chips before collapsing the rest into a "+N" indicator. Default: uncollapsed. */
    maxLabels?: number
    /** `multiple` only: how the trigger renders multiple selections. `'chip'` (default) shows removable chips; `'text'` shows comma-joined labels; `'count'` shows a "N selected" summary. Single-select ignores this prop. */
    display?: 'chip' | 'text' | 'count'
    /** `true`/`false` forces virtualization on/off; an object also tunes `itemSize`/`overscan`. Default: auto-virtualizes past 100 items. */
    virtualize?: boolean | SelectVirtualizeConfig
    /** Renders hidden `<input>`(s) so a plain `<form>` post still carries
     * the selection — repeated `name` when `multiple`. */
    name?: string
    side?: SelectSide
    align?: SelectAlign
    sideOffset?: number
    alignOffset?: number
    closeOnEsc?: boolean
    closeOnOutside?: boolean
    beforeClose?: (done: () => void) => void
    forceMount?: boolean
    teleportTo?: string | HTMLElement
    scrollFade?: boolean
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
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
    display: 'chip',
    virtualize: undefined,
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
}>()

defineSlots<{
  value(props: { selected: T | T[] | null }): unknown
  item(props: { item: T; active: boolean; selected: boolean }): unknown
  empty(): unknown
}>()

const messages = useUiMessages()

const selectedSet = computed<Set<string | number>>(() => {
  if (props.multiple) return new Set(Array.isArray(model.value) ? model.value : [])
  return new Set(model.value == null ? [] : [model.value as string | number])
})
function isSelected(item: T): boolean {
  return selectedSet.value.has(item.value)
}
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

const open = defineModel<boolean>('open', { default: false })
const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
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

const { positionerStyle, placement, transformOrigin, maxHeight, isClosing, close, cancelClose } =
  usePopover(open, {
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
    onOpenChange: (value, details) => emit('open-change', value, details),
  })

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
  items: () => props.items,
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
    const item = props.items[activeIndex.value]
    if (item) selectItem(item, activeIndex.value)
    return
  }
  listboxKeydown(event)
}

// Gate on visibility:hidden resolution (floating-ui's async computePosition).
watch(
  () => open.value && positionerStyle.value.visibility === 'visible',
  (ready) => {
    if (!ready) return
    nextTick(() => {
      const selectedIndex = props.items.findIndex((item) => isSelected(item))
      const initial = selectedIndex >= 0 ? selectedIndex : props.items.length > 0 ? 0 : -1
      setActive(initial)
      if (selectedIndex >= 0) listBody.value?.scrollToIndex(selectedIndex, 'center')
    })
  },
)

const AUTO_VIRTUALIZE_THRESHOLD = 100
const DEFAULT_OVERSCAN = 8
const virtualizeConfig = computed<SelectVirtualizeConfig | null>(() => {
  if (props.virtualize === false) return null
  if (props.virtualize === true) return {}
  if (props.virtualize && typeof props.virtualize === 'object') return props.virtualize
  return props.items.length > AUTO_VIRTUALIZE_THRESHOLD ? {} : null
})
// Non-virtualized mode: overscan large enough that nothing clips (one code path).
const effectiveOverscan = computed(() =>
  virtualizeConfig.value
    ? (virtualizeConfig.value.overscan ?? DEFAULT_OVERSCAN)
    : props.items.length,
)

const bodyStyle = computed(() =>
  maxHeight.value != null ? { maxHeight: `${maxHeight.value}px`, overflowY: 'auto' as const } : {},
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
  triggerEl,
  panelEl,
  positionerEl,
  listEl,
  placement,
  positionerStyle,
  isClosing,
  open: openSelect,
  close,
  cancelClose,
  activeIndex,
  scrollToIndex,
})
</script>
