<template>
  <div
    :id="listboxId"
    ref="listEl"
    role="listbox"
    :class="listPart.class"
    :style="listPart.style"
    :aria-multiselectable="multiple || undefined"
    :aria-busy="loading || undefined"
    v-scroll-mask="scrollFade"
  >
    <div v-if="items.length === 0 && !loading" class="ui-select-empty">
      <slot name="empty">{{ emptyText }}</slot>
    </div>
    <div v-else-if="items.length === 0 && loading" class="ui-select-loading">
      <span class="ui-loader" />
    </div>
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
            <span
              v-if="isSelected(items[row.index])"
              class="ui-select-option-check"
              aria-hidden="true"
              >✓</span
            >
          </slot>
        </div>
      </div>
      <div v-if="loading" class="ui-select-loading-more" aria-hidden="true">
        <span class="ui-loader" />
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
</script>

<!--
  Internal, not exported from index.ts — the piece of Select/Combobox that's
  literally identical between them (per the plan's own flagged review point):
  the scrollable role="listbox" body, its virtualization, and its `reach-end`
  signal. Select/Combobox each own everything ABOVE this (trigger, model,
  filtering, useListbox's keyboard/typeahead wiring) — this component never
  receives a keydown; the APG activedescendant pattern means focus and key
  handling both live on the trigger/input, never here.

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
import { computed, useTemplateRef } from 'vue'
import { useVirtualizer } from '../../composables/useVirtualizer'
import type { ScrollAlign } from '../../composables/useVirtualizer'
import { vScrollMask } from '../../directives/vScrollMask'
import { useClassMerge, resolveUiPart } from '../../classes'
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
  ui?: Partial<{ list: UiPartValue; option: UiPartValue }>
}>()

const cx = useClassMerge()
const listPart = computed(() => resolveUiPart(cx, props.ui?.list, 'ui-select-body'))
const optionPart = computed(() => resolveUiPart(cx, props.ui?.option, 'ui-select-option'))

const emit = defineEmits<{
  select: [item: T, index: number]
  hover: [index: number]
  'reach-end': []
}>()

defineSlots<{
  item(props: { item: T; index: number; active: boolean; selected: boolean }): unknown
  empty(): unknown
}>()

const listEl = useTemplateRef<HTMLElement>('listEl')

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
  scrollToIndex: (index: number, align?: ScrollAlign) => scrollToIndex(index, align),
})
</script>
