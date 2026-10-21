<template>
  <div
    :id="listboxId"
    ref="listEl"
    role="listbox"
    tabindex="-1"
    :data-motion="props.motion ? undefined : 'off'"
    :class="listPart.class"
    :style="listPart.style"
    :aria-multiselectable="multiple || undefined"
    :aria-busy="loading || undefined"
    v-scroll-mask="scrollFade"
  >
    <div
      ref="indicatorEl"
      class="ui-indicator ui-select-indicator"
      :style="indicatorStyle"
      aria-hidden="true"
    />
    <div v-if="items.length === 0 && !loading" :class="emptyPart.class" :style="emptyPart.style">
      <slot name="empty">{{ emptyText }}</slot>
    </div>
    <div v-else-if="items.length === 0 && loading" class="ui-select-loading">
      <LoaderMark />
    </div>
    <!-- Grouped: real role="group" wrappers, so screen readers announce each group's name. Rows
         aren't evenly spaced here, so every option renders and scrolls into view by itself. Keyed
         by label and value, so a search keeps each group and option on its own element, which
         animations that track elements rely on. -->
    <template v-else-if="sections">
      <div
        v-for="(section, si) in sections"
        :key="section.label ?? `loose-${section.start}`"
        :role="section.label ? 'group' : undefined"
        :aria-labelledby="section.label ? `${listboxId}-group-${si}` : undefined"
        :class="section.label ? groupPart.class : undefined"
        :style="section.label ? groupPart.style : undefined"
      >
        <div
          v-if="section.label"
          :id="`${listboxId}-group-${si}`"
          role="presentation"
          :class="groupLabelPart.class"
          :style="groupLabelPart.style"
        >
          <slot
            v-if="section.group"
            name="group-label"
            :group="section.group"
            :items="items.slice(section.start, section.end)"
            >{{ section.label }}</slot
          >
          <template v-else>{{ section.label }}</template>
        </div>
        <div
          v-for="index in sectionIndexes(section)"
          :id="`${listboxId}-opt-${index}`"
          :key="items[index]!.value"
          role="option"
          :class="optionPart.class"
          :data-active="index === activeIndex || undefined"
          :data-selected="isSelected(items[index]) || undefined"
          :data-disabled="items[index]?.disabled || undefined"
          :aria-selected="isSelected(items[index])"
          :aria-disabled="items[index]?.disabled || undefined"
          :style="optionPart.style"
          @mousemove="onRowHover(index)"
          @mousedown.prevent
          @click="onRowClick(index)"
        >
          <slot
            name="item"
            :item="items[index]"
            :index="index"
            :active="index === activeIndex"
            :selected="isSelected(items[index])"
            :group="section.group"
          >
            <span class="ui-select-option-label">{{ getLabel(items[index]) }}</span>
            <!-- No `appear`: only a pick on a row already showing draws it in (shared/tick.css). -->
            <Transition name="ui-tick">
              <svg
                v-if="isSelected(items[index])"
                class="ui-select-option-check ui-tick"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8.5l3 3 6-7"
                  pathLength="1"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </Transition>
          </slot>
        </div>
      </div>
      <div v-if="loading" class="ui-select-loading-more" aria-hidden="true">
        <LoaderMark />
      </div>
    </template>
    <template v-else>
      <div :style="listStyle">
        <div
          v-for="row in virtualRows"
          :id="`${listboxId}-opt-${row.index}`"
          :key="row.index"
          role="option"
          :class="optionPart.class"
          :data-virtual-index="row.index"
          :data-active="row.index === activeIndex || undefined"
          :data-selected="isSelected(items[row.index]) || undefined"
          :data-disabled="items[row.index]?.disabled || undefined"
          :aria-selected="isSelected(items[row.index])"
          :aria-disabled="items[row.index]?.disabled || undefined"
          :style="[row.style, optionPart.style]"
          @mousemove="onRowHover(row.index)"
          @mousedown.prevent
          @click="onRowClick(row.index)"
        >
          <slot
            name="item"
            :item="items[row.index]"
            :index="row.index"
            :active="row.index === activeIndex"
            :selected="isSelected(items[row.index])"
          >
            <span class="ui-select-option-label">{{ getLabel(items[row.index]) }}</span>
            <!-- No `appear`: only a pick on a row already showing draws it in (shared/tick.css). -->
            <Transition name="ui-tick">
              <svg
                v-if="isSelected(items[row.index])"
                class="ui-select-option-check ui-tick"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8.5l3 3 6-7"
                  pathLength="1"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </Transition>
          </slot>
        </div>
      </div>
      <div v-if="loading" class="ui-select-loading-more" aria-hidden="true">
        <LoaderMark />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
/** One row's data in Select/Combobox's `items` array. Extend it with your
 * own fields via the generic — `@select`/the `#item` slot hand the whole
 * object back with those fields intact. */
export interface SelectItemData {
  label: string
  value: string | number
  disabled?: boolean
}

/** A titled group of options in Select's `items`, shown under its label. */
export interface SelectGroupData<T extends SelectItemData = SelectItemData> {
  label: string
  items: readonly T[]
}

/** A group as the `#group-label` slot sees it: the object you passed, your own fields included. */
export interface SelectGroupSlotData<
  T extends SelectItemData = SelectItemData,
> extends SelectGroupData<T> {
  [key: string]: any
}

/** @internal A run of options in the list body's `items`, with its group if it has one. */
export interface SelectListSection<T extends SelectItemData = SelectItemData> {
  label?: string
  group?: SelectGroupSlotData<T>
  start: number
  end: number
}
</script>

<!--
  Internal, not exported from index.ts — the piece of Select/Combobox that's
  literally identical between them (per the plan's own flagged review point):
  the scrollable role="listbox" body, its virtualization, and its `reach-end`
  signal. Select/Combobox each own everything ABOVE this (trigger, model,
  filtering, useListbox's keyboard/typeahead wiring) — this component never
  receives a keydown; the APG activedescendant pattern means focus and key
  handling both live on the trigger/input, never here. Hence `tabindex="-1"`:
  Chromium makes any scrollable box keyboard-focusable, which would put an
  overflowing list into the Tab order right after the trigger.

  ALWAYS runs `useVirtualizer`, even when the "virtualize" prop the consumer
  sees is off: a non-virtualized list is just a windowed one whose window
  covers every row (`overscan` passed large enough to never clip). This
  keeps exactly one code path for windowing/positioning/reach-end instead of
  two, and produces an identical DOM/visual result either way — the row
  wrapper's `translate` positioning is invisible to the user, "virtualize"
  only ever changes how many rows exist in the DOM at once. Deliberate
  simplification over maintaining a second plain-scroll reach-end listener
  for the non-virtualized path, flagged here for review.

  Comment stays outside <template> — see Button.vue for why.
-->
<script setup lang="ts" generic="T extends SelectItemData">
import '../shared/loader-spinner.css'
import LoaderMark from './LoaderMark.vue'
import '../shared/tick.css'
import { computed, useTemplateRef } from 'vue'
import { useEasedHeight } from '../../composables/useEasedHeight'
import { useVirtualizer } from '../../composables/useVirtualizer'
import type { ScrollAlign } from '../../composables/useVirtualizer'
import { vScrollMask } from '../../directives/vScrollMask'
import { scrollIntoContainer } from '../../composables/dom'
import { useClassMerge, resolveUiPart } from '../../classes'
import { useTabIndicator } from '../../composables/useTabIndicator'
import '../shared/indicator.css'
import type { UiPartValue } from '../../classes'

const props = defineProps<{
  items: readonly T[]
  getLabel: (item: T) => string
  isSelected: (item: T) => boolean
  activeIndex: number
  listboxId: string
  multiple?: boolean
  loading?: boolean
  emptyText: string
  /** px. Omitted → auto-measured from the first rendered row. */
  itemSize?: number
  /** Large enough (≥ items.length) effectively disables windowing — the
   * "not virtualized" case is just an overscan that never clips. */
  overscan: number
  scrollFade?: boolean
  /** Eases the list to its new height when its options change, as CommandPalette does. */
  motion?: boolean
  /** Set when the items come in groups: renders each run under its label instead of windowing. */
  sections?: readonly SelectListSection<T>[]
  ui?: Partial<{
    list: UiPartValue
    option: UiPartValue
    empty: UiPartValue
    group: UiPartValue
    groupLabel: UiPartValue
  }>
}>()

const cx = useClassMerge()
const listPart = computed(() => resolveUiPart(cx, props.ui?.list, 'ui-select-body'))
const optionPart = computed(() => resolveUiPart(cx, props.ui?.option, 'ui-select-option'))
const emptyPart = computed(() => resolveUiPart(cx, props.ui?.empty, 'ui-select-empty'))
const groupPart = computed(() => resolveUiPart(cx, props.ui?.group, 'ui-select-group'))
const groupLabelPart = computed(() =>
  resolveUiPart(cx, props.ui?.groupLabel, 'ui-select-group-label'),
)

function sectionIndexes(section: SelectListSection<T>): number[] {
  return Array.from({ length: section.end - section.start }, (_, i) => section.start + i)
}

const emit = defineEmits<{
  select: [item: T, index: number]
  hover: [index: number]
  'reach-end': []
}>()

defineSlots<{
  item(props: {
    item: T
    index: number
    active: boolean
    selected: boolean
    group?: SelectGroupSlotData<T>
  }): unknown
  'group-label'(props: { group: SelectGroupSlotData<T>; items: T[] }): unknown
  empty(): unknown
}>()

const listEl = useTemplateRef<HTMLElement>('listEl')
const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')

// The highlight slides between options, Tabs-style; a long jump (typeahead, a search) lands at once.
const { style: indicatorStyle } = useTabIndicator(() => [props.activeIndex, props.items], {
  listEl,
  orientation: 'vertical',
  selector: '[role="option"][data-active]',
  scroller: true,
  matchCross: true,
  maxGlide: 3,
  motion: () => props.motion,
  indicatorEl,
})

// Eases to the new height when the options change (a search, more loaded), as CommandPalette does.
useEasedHeight({
  el: () => listEl.value,
  source: [() => props.items, () => props.sections, () => props.loading],
  enabled: () => !!props.motion,
})

const {
  listStyle,
  items: virtualRows,
  scrollToIndex,
} = useVirtualizer({
  containerEl: listEl,
  count: () => props.items.length,
  itemSize: () => props.itemSize,
  overscan: () => props.overscan,
  onReachEnd: () => emit('reach-end'),
})

function onRowHover(index: number) {
  if (props.items[index]?.disabled) return
  emit('hover', index)
}
function onRowClick(index: number) {
  const item = props.items[index]
  if (!item || item.disabled) return
  emit('select', item, index)
}

defineExpose({
  listEl,
  indicatorEl,
  scrollToIndex: (index: number, align?: ScrollAlign) => {
    if (!props.sections) return scrollToIndex(index, align)
    const row = listEl.value?.querySelector<HTMLElement>(`[id="${props.listboxId}-opt-${index}"]`)
    if (listEl.value && row) scrollIntoContainer(listEl.value, row, align)
  },
})
</script>
