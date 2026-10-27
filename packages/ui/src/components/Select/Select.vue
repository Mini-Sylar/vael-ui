<template>
  <!-- The clear button sits beside the combobox, not in it; a press on the frame focuses the combobox. -->
  <div
    ref="triggerEl"
    :data-ui-frame="props.size"
    :class="rootPart.class"
    :style="[rootPart.style, attrs.style as never]"
    tabindex="-1"
    :data-state="open ? 'open' : 'closed'"
    :data-invalid="isInvalid || undefined"
    @click="onTriggerClick"
    @focus="focusControl"
  >
    <!-- Start and end sit outside the combobox, so they don't join its accessible name. -->
    <span v-if="$slots.start" :class="startPart.class" :style="startPart.style"
      ><slot name="start"
    /></span>
    <div
      ref="controlEl"
      class="ui-select-control"
      role="combobox"
      :id="fieldControl.id"
      v-bind="triggerAttrs"
      :tabindex="isDisabled ? -1 : 0"
      :aria-disabled="isDisabled || undefined"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listboxId"
      :aria-activedescendant="open && !filter ? activeId : undefined"
      :aria-describedby="fieldControl.describedBy()"
      :aria-labelledby="
        (attrs['aria-labelledby'] as string | undefined) ?? fieldControl.labelledBy()
      "
      :aria-invalid="isInvalid || undefined"
      :aria-required="fieldControl.required() || undefined"
      @keydown="onTriggerKeydown"
      @focus="fieldControl.onFocus"
      @blur="fieldControl.onBlur"
    >
      <span ref="valueEl" :class="valuePart.class" :style="valuePart.style">
        <slot name="value" :selected="selectedForSlot">
          <!-- The placeholder is the same text element, so the first choice crossfades in too. -->
          <LazyAnimatedText
            v-if="!multiple || display === 'text'"
            :class="isEmpty && 'ui-select-placeholder'"
            :value="isEmpty ? (placeholder ?? '') : displayLabel"
            :motion="!!props.motion && valueSwap()"
          />
          <span v-else-if="isEmpty && display === 'count'" class="ui-select-placeholder">{{
            placeholder
          }}</span>
          <span v-else-if="display === 'count'">{{ selectedCountLabel }}</span>
          <!-- The chips group stays mounted when the last chip goes, so it leaves like the others
               instead of being unmounted with its group; the placeholder slides in behind it. -->
          <template v-else>
            <TransitionGroup
              v-bind="chipsTransition"
              :data-motion="props.motion ? undefined : 'off'"
              tag="span"
              class="ui-select-chips"
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
            <span v-if="isEmpty" class="ui-select-placeholder">{{ placeholder }}</span>
          </template>
        </slot>
      </span>
    </div>
    <span v-if="$slots.end" :class="endPart.class" :style="endPart.style"><slot name="end" /></span>
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
    <span :class="chevronPart.class" :style="chevronPart.style" aria-hidden="true">
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
    <Transition name="ui-select" appear v-bind="panelTransition">
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
          data-ui-presence
          :class="panelPart.class"
          :style="[
            { transformOrigin },
            panelMaxHeightStyle,
            panelWidthStyle(props.panelWidth),
            panelPart.style,
          ]"
          v-bind="panelAttrs"
        >
          <div v-if="$slots.header" :class="headerPart.class" :style="headerPart.style">
            <slot name="header" :count="filteredItems.length" :total="options.length" />
          </div>
          <div
            v-if="filter !== undefined || $slots.filter"
            :class="filterPart.class"
            :style="filterPart.style"
          >
            <slot name="filter" :query="query" :on-keydown="onFilterKeydown">
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
                role="combobox"
                aria-autocomplete="list"
                :aria-expanded="open"
                :aria-controls="listboxId"
                :aria-activedescendant="open ? activeId : undefined"
                @keydown="onFilterKeydown"
              >
                <template #start>
                  <slot name="filter-icon">
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
            :motion="!!props.motion"
            :sections="hasGroups ? filtered.sections : undefined"
            :ui="{
              list: themedUi()?.list,
              option: themedUi()?.option,
              empty: themedUi()?.empty,
              group: themedUi()?.group,
              groupLabel: themedUi()?.groupLabel,
            }"
            @select="(item: T, index: number) => selectItem(item, index)"
            @hover="point"
            @reach-end="emit('reach-end')"
          >
            <template v-if="$slots.item" #item="slotProps">
              <slot name="item" v-bind="slotProps" />
            </template>
            <template v-if="$slots['group-label']" #group-label="slotProps">
              <slot name="group-label" v-bind="slotProps" />
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
import { useValueSwap } from '../../composables/valueSwap'
import { panelWidthStyle } from '../../composables/panelWidth'
import type { PanelWidth } from '../../composables/panelWidth'
import type { Side } from '@floating-ui/dom'
import type { Align } from '../../composables/useFloatingPosition'
import type {
  SelectGroupData,
  SelectGroupSlotData,
  SelectItemData,
} from '../internal/SelectListBody.vue'

export type SelectSide = Side
export type SelectAlign = Align
export type { SelectGroupData, SelectGroupSlotData, SelectItemData }

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
import type { PopoverCloseReason } from '../../composables/usePopover'
import type { BeforeClose, SelectMotion } from '../../motion/types'
import './Select.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import '../shared/clear-transition.css'
import { measureClearSpace, resetLeaveStyles, startClearLeave } from '../../composables/dom'
import '../shared/select-panel.css'
import { useChipRowWidth } from '../../composables/useChipRowWidth'
import { useChipTransition } from '../../composables/useChipTransition'
import '../shared/select-value.css'
import '../shared/select-list.css'
import '../shared/chip.css'
import { computed, inject, nextTick, provide, useAttrs, useId, useTemplateRef, watch } from 'vue'
import { useAttrListeners } from '../../composables/forwardedListeners'
import { usePopover } from '../../composables/usePopover'
import { useSelectPanelMotion } from '../../composables/useSelectPanelMotion'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useListbox } from '../../composables/useListbox'
import type { ScrollAlign } from '../../composables/useVirtualizer'
import { useFieldControl } from '../../composables/useFieldControl'
import { useFormReset } from '../../composables/useFormReset'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import { useMessages, selectMessages } from '../../messages'
import { normalizeText } from '../../composables/normalizeText'
import SelectListBody from '../internal/SelectListBody.vue'
import { flattenOptions, groupSections, isGroup } from '../../composables/selectGroups'
import Input from '../Input/Input.vue'
import Chip, { chipFocusFallbackKey } from '../Chip/Chip.vue'
import LazyAnimatedText from '../internal/LazyAnimatedText.vue'
import { useRememberedSelection } from '../../composables/useRememberedSelection'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
// id, aria-* and data-* name and identify the combobox, so they go on the
// trigger; the panel keeps the rest (class, style, listeners) as before.
const isTriggerAttr = (key: string) =>
  key === 'id' || key.startsWith('aria-') || key.startsWith('data-')
const panelOwnAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !isTriggerAttr(key))),
)
const panelAttrs = useAttrListeners(
  () => panelEl.value,
  () => panelOwnAttrs.value,
)
const triggerAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => isTriggerAttr(key))),
)

/** Selected value, or an array of values when `multiple`. @default null */
const model = defineModel<string | number | (string | number)[] | null>({ default: null })

const rawProps = withDefaults(
  defineProps<{
    /** Options to choose from. Put `{ label, items }` entries among them to show options under a
     * group label, like `<optgroup>`. */
    items: ReadonlyArray<T | SelectGroupData<T>>
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
    /** Runs before the panel closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. The panel stays open while the promise is pending. */
    beforeClose?: BeforeClose<PopoverCloseReason>
    /** Keeps it mounted while closed, toggled with `v-show`, so its content keeps its state. vael-ui then leaves its motion to you. @default false */
    forceMount?: boolean
    /** Teleport target: a CSS selector or element. @default 'body' */
    teleportTo?: string | HTMLElement
    /**
     * Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more.
     * @default true
     */
    scrollFade?: boolean
    /**
     * Caps the panel height in pixels; the list scrolls past it. The viewport limits it too, so
     * pass `Infinity` to fill the available space.
     * @default 320
     */
    maxPanelHeight?: number
    /**
     * The panel's width. `'trigger'` matches the field (at least 12rem); a width in px or any CSS
     * length (`'20rem'`) sets it. @default 'trigger'
     */
    panelWidth?: PanelWidth
    /**
     * How it moves. `false` skips all of it: the panel opening, the list easing to its new height as
     * you search, the clear button and the chips. An object moves the panel your way, like
     * Popover's: values for the `panel` part, `{ spring }`, or `enter` / `leave` hooks. `chips` does
     * the same for the chips (`{ chips: { initial: { chip: { opacity: 0, y: 4 } } } }`).
     * @default true
     */
    motion?: SelectMotion
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
      group: UiPartValue
      groupLabel: UiPartValue
      empty: UiPartValue
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
    multiple: false,
    disabled: false,
    invalid: false,
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
    maxPanelHeight: 320,
    forceMount: false,
    teleportTo: 'body',
    scrollFade: true,
    motion: undefined,
    filterPlaceholder: 'Search...',
  },
)
const props = withProviderDefaults(rawProps, { size: 'md', motion: true })
const valueSwap = useValueSwap(() => props.motion)

const emit = defineEmits<{
  /** Fires before the panel closes; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  /** Fires when you change the selection, including chip removal and clear. */
  change: [value: string | number | (string | number)[] | null]
  /** Fires when the list's last rows render, for loading more. Re-arms when the item count changes. */
  'reach-end': []
  /** Fires when you pick an item, including a pick that deselects it in `multiple` mode. */
  select: [item: T]
}>()

const chipsTransition = useChipTransition(
  () => rawProps.motion,
  () => !!props.motion,
  'select',
  'Select',
)

defineSlots<{
  /** Content at the start of the trigger, such as an icon, before the value. */
  start(): unknown
  /** Content before the built-in clear button and chevron. */
  end(): unknown
  /** Custom trigger content for the current selection (an array when `multiple`). It replaces the built-in label and its crossfade; to keep the crossfade, put the text in `<AnimatedText :value="…" />`. */
  value(props: { selected: T | T[] | null }): unknown
  /** Content above the filter input (when `filter` is on) or the listbox. `count` and `total` support a result-count readout. */
  header(props: { count: number; total: number }): unknown
  /** Replaces the built-in filter row. Bind your input to `v-model:query`; pass keys to `onKeydown`
   * to keep arrow/Home/End/Enter list navigation. */
  filter(props: { query: string; onKeydown: (event: KeyboardEvent) => void }): unknown
  /** Replaces only the built-in filter row's leading icon and keeps its Input frame. */
  'filter-icon'(): unknown
  /** Custom row content for each option. `group` is the group it sits in, if any. */
  item(props: {
    item: T
    /** Position among the options showing, across groups. */
    index: number
    active: boolean
    selected: boolean
    group?: SelectGroupSlotData<T>
  }): unknown
  /** Custom content for a group's label. `group` is the object you passed, with your own fields;
   * `items` are its options still showing. Screen readers read this content as the group's name. */
  'group-label'(props: { group: SelectGroupSlotData<T>; items: T[] }): unknown
  /** Replaces the text shown when no items match. */
  empty(): unknown
  /** Content below the listbox, such as a "create new" or "view all" action. */
  footer(): unknown
}>()

const messages = useMessages({ select: selectMessages })

/** Search box text. Clears when the panel closes. @default '' */
const query = defineModel<string>('query', { default: '' })

const selectedSet = computed<Set<string | number>>(() => {
  if (props.multiple) return new Set(Array.isArray(model.value) ? model.value : [])
  return new Set(model.value == null ? [] : [model.value as string | number])
})
function isSelected(item: T): boolean {
  return selectedSet.value.has(item.value)
}
const hasGroups = computed(() => props.items.some(isGroup))
const options = computed<T[]>(() => flattenOptions(props.items))
function matchesQuery(item: T, q: string): boolean {
  if (props.filter === false || !q) return true
  if (typeof props.filter === 'function') return props.filter(item, q)
  return normalizeText(item.label).includes(normalizeText(q))
}
const filtered = computed(() => {
  const q = query.value.trim()
  return groupSections(props.items, (item) => matchesQuery(item, q))
})
const filteredItems = computed<T[]>(() => filtered.value.items)
// Selection always resolves against the full list — an item filtered out of view stays selected.
const selectedItems = useRememberedSelection(
  () => options.value,
  () => selectedSet.value,
)
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

const fieldControl = useFieldControl({
  filled: () => !isEmpty.value,
  frame: { el: () => triggerEl.value, size: () => props.size },
})
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

function onClear(event: MouseEvent) {
  event.preventDefault()
  model.value = props.multiple ? [] : null
  emit('change', model.value)
  // The clear button goes with the value, so focus goes back to the combobox.
  controlEl.value?.focus()
}

/** Whether the panel is open. @default false */
const open = defineModel<boolean>('open', { default: false })
const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
useFormReset(model, () => triggerEl.value)
const controlEl = useTemplateRef<HTMLElement>('controlEl')
function focusControl() {
  controlEl.value?.focus()
}
provide(chipFocusFallbackKey, () => controlEl.value)
const valueEl = useTemplateRef<HTMLElement>('valueEl')
useChipRowWidth({
  row: () => valueEl.value,
  empty: () => isEmpty.value,
  active: () => props.multiple && props.display === 'chip' && !!props.motion,
  placeholder: '.ui-select-placeholder',
})
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const panelTransition = useSelectPanelMotion({
  name: 'Select',
  key: 'select',
  motion: () => props.motion,
  positioner: () => positionerEl.value,
  panel: () => panelEl.value,
  trigger: () => triggerEl.value,
  forceMount: () => props.forceMount,
  placed: () => positionerStyle.value.visibility === 'visible',
})
const filterInputRef = useTemplateRef<{ el: HTMLElement | null; inputEl: HTMLInputElement | null }>(
  'filterInputRef',
)
// Manual shape since TS can't derive InstanceType from generic SFC.
const listBody = useTemplateRef<{
  listEl: HTMLElement | null
  indicatorEl: HTMLElement | null
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
  point,
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
  if (isDisabled.value || event.target !== event.currentTarget) return
  // Chips' remove buttons are pointer-only, so the keyboard removes the last chip, as in Combobox.
  if ((event.key === 'Backspace' || event.key === 'Delete') && props.multiple) {
    const last = props.display === 'chip' ? selectedItems.value.at(-1) : undefined
    if (last) {
      event.preventDefault()
      removeChip(last)
    }
    return
  }
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
      controlEl.value?.focus()
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
  // Group labels make rows uneven, so a grouped list always renders whole.
  if (props.virtualize === false || hasGroups.value) return null
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
const startPart = computed(() => resolveUiPart(cx, themedUi()?.start, 'ui-select-start'))
const endPart = computed(() => resolveUiPart(cx, themedUi()?.end, 'ui-select-end'))
const clearPart = computed(() => resolveUiPart(cx, themedUi()?.clear, 'ui-select-clear'))
const chevronPart = computed(() => resolveUiPart(cx, themedUi()?.chevron, 'ui-select-chevron'))
const filterIconPart = computed(() =>
  resolveUiPart(cx, themedUi()?.filterIcon, 'ui-select-search-icon'),
)

const resolvedSide = computed(() => placement.value.split('-')[0] as SelectSide)
const resolvedAlign = computed<SelectAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

const listEl = computed(() => listBody.value?.listEl ?? null)
const indicatorEl = computed(() => listBody.value?.indicatorEl ?? null)
function scrollToIndex(index: number, align?: ScrollAlign) {
  listBody.value?.scrollToIndex(index, align)
}

defineExpose({
  /** Trigger element: the frame around the combobox and its clear button. Focusing it focuses the combobox. */
  triggerEl,
  /** Panel element (null while closed). */
  panelEl,
  /** Positioning wrapper around the panel (null while closed). */
  positionerEl,
  /** Scrollable listbox element (null while closed). */
  listEl,
  /** The hover and keyboard highlight, sliding between options (null while closed). With `motion: false` it moves at once, for your own animation. */
  highlightEl: indicatorEl,
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
