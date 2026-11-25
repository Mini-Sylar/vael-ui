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
    @mousemove="onListMove"
    @mousedown="onListDown"
    @click="onListClick"
  >
    <div ref="indicatorEl" class="ui-indicator ui-select-indicator" aria-hidden="true" />
    <div v-if="items.length === 0 && !loading" :class="emptyPart.class" :style="emptyPart.style">
      <slot name="empty">{{ emptyText }}</slot>
    </div>
    <div v-else-if="items.length === 0 && loading" class="ui-select-loading" role="status">
      <LoaderMark />
      <span class="ui-select-loading-label">{{ messages.select.loading }}</span>
    </div>
    <!-- One run of options, or one per group. Grouped: real role="group" wrappers, so screen readers
         announce each group's name, keyed by label and value, so a search keeps each group and
         option on its own element, which animations that track elements rely on. Windowed: the
         rows in view, each placed in a box as tall as the whole list, saying its place in it. -->
    <template v-else>
      <div
        v-for="(section, si) in runs"
        :key="section.label ?? (windowed ? 'window' : `loose-${section.start}`)"
        :role="section.label ? 'group' : undefined"
        :aria-labelledby="section.label ? `${listboxId}-group-${si}` : undefined"
        :class="section.label ? groupPart.class : undefined"
        :style="windowed ? listStyle : section.label ? groupPart.style : undefined"
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
          :key="keyOf(index)"
          role="option"
          :class="optionPart.class"
          :data-virtual-index="windowed ? index : undefined"
          :data-selected="isSelected(items[index]) || undefined"
          :data-disabled="items[index]?.disabled || undefined"
          :aria-selected="isSelected(items[index])"
          :aria-disabled="items[index]?.disabled || undefined"
          :aria-setsize="windowed ? items.length : undefined"
          :aria-posinset="windowed ? index + 1 : undefined"
          :style="
            windowed
              ? [virtualRows[index - section.start]?.style, optionPart.style]
              : optionPart.style
          "
        >
          <slot
            v-if="$slots.item"
            name="item"
            :item="items[index]"
            :index="index"
            :active="trackActive && index === props.highlight.current.value"
            :selected="isSelected(items[index])"
            :group="section.group"
          >
            <span class="ui-select-option-label">{{ getLabel(items[index]) }}</span>
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
          <template v-else-if="tickOf(keyOf(index), isSelected(items[index]))">
            <span class="ui-select-option-label">{{ getLabel(items[index]) }}</span>
            <Transition name="ui-tick" :appear="drawn.has(keyOf(index))">
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
          </template>
          <span v-else class="ui-select-option-label">{{ getLabel(items[index]) }}</span>
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

/**
 * What an option may be: your items, whose `value` may also be `null`, a real choice such as
 * "Unassigned". Picking it sets the model to `null`, and a `null` model shows it as picked.
 */
export interface SelectChoice {
  label: string
  value: string | number | null
  disabled?: boolean
}

/** A titled group of options in Select's `items`, shown under its label. */
export interface SelectGroupData<T extends SelectChoice = SelectItemData> {
  label: string
  items: readonly T[]
}

/** A group as the `#group-label` slot sees it: the object you passed, your own fields included. */
export interface SelectGroupSlotData<
  T extends SelectChoice = SelectItemData,
> extends SelectGroupData<T> {
  [key: string]: any
}

/** @internal A run of options in the list body's `items`, with its group if it has one. */
export interface SelectListSection<T extends SelectChoice = SelectItemData> {
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

  Two ways to draw the rows. Windowed (`windowed`, a long list): `useVirtualizer` renders the rows
  in view, each placed with `translate`. Otherwise every row renders in normal flow, grouped or
  not: no row carries a style, and nothing is measured to place them.

  A row is its label alone. The tick, with its Transition, exists only on rows that are or were
  picked, and a pick on a row already showing draws it in (shared/tick.css). A custom `#item` row
  that renders nothing shows the label and tick as it would without the slot.

  Comment stays outside <template> — see Button.vue for why.
-->
<script setup lang="ts" generic="T extends SelectChoice">
import '../shared/loader-spinner.css'
import LoaderMark from './LoaderMark.vue'
import { useMessages, selectMessages } from '../../messages'
import '../shared/tick.css'
import { computed, useTemplateRef, watch, watchPostEffect } from 'vue'
import type { Ref } from 'vue'
import { useEasedHeight } from '../../composables/useEasedHeight'
import { useVirtualizer } from '../../composables/useVirtualizer'
import type { ScrollAlign } from '../../composables/useVirtualizer'
import { vScrollMask } from '../../directives/vScrollMask'
import { scrollIntoContainer } from '../../composables/dom'
import { useClassMerge, resolveUiPart } from '../../classes'
import { useTabIndicator } from '../../composables/useTabIndicator'
import '../shared/indicator.css'
import type { UiPartValue } from '../../classes'

// A `null` value is a choice of its own; as a key, Vue would read it as no key.
const NULL_KEY = '\u0000null'
const messages = useMessages({ select: selectMessages })
const props = defineProps<{
  items: readonly T[]
  getLabel: (item: T) => string
  isSelected: (item: T) => boolean
  /** The highlighted row, held in a stable object: a prop that changes with it would re-render the list. */
  highlight: { current: Readonly<Ref<number>> }
  /** Only a custom item slot reads `active`: following the highlight re-renders the list, so it's off otherwise. */
  trackActive?: boolean
  listboxId: string
  multiple?: boolean
  loading?: boolean
  emptyText: string
  /** px. Omitted → auto-measured from the first rendered row. */
  itemSize?: number
  /** Renders only the rows in view. Off, or with `sections`, every row renders in normal flow. */
  windowed?: boolean
  /** Rows kept rendered past each edge of the view while `windowed`. */
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

const windowed = computed(() => !!props.windowed && !props.sections)
// The groups, or one run: every option, or while windowed the rows in view.
const runs = computed<readonly SelectListSection<T>[]>(() => {
  if (props.sections) return props.sections
  if (!windowed.value) return [{ start: 0, end: props.items.length }]
  const rows = virtualRows.value
  return [{ start: rows[0]?.index ?? 0, end: rows.length ? rows[rows.length - 1]!.index + 1 : 0 }]
})
// Grouped rows are keyed by value; a plain run by position, as windowed rows are.
const keyOf = (index: number) => (props.sections ? (props.items[index]!.value ?? NULL_KEY) : index)

// A tick's Transition exists only on rows that are, or were, selected: most rows never need one.
const ticks = new Set<unknown>()
const tickOf = (key: unknown, selected: boolean) =>
  selected ? (ticks.add(key), true) : ticks.has(key)
// The rows already on the page: a pick on one of them draws its tick in, a new row shows it at once.
const drawn = new Set<unknown>()
watchPostEffect(() => {
  drawn.clear()
  if (windowed.value) for (const row of virtualRows.value) drawn.add(row.index)
  else for (let index = 0; index < props.items.length; index++) drawn.add(keyOf(index))
})

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
const { style: indicatorStyle } = useTabIndicator(
  () => [props.highlight.current.value, props.items],
  {
    listEl,
    orientation: 'vertical',
    selector: '[role="option"][data-active]',
    scroller: true,
    matchCross: true,
    maxGlide: 3,
    motion: () => props.motion,
    indicatorEl,
    position: 'translate',
  },
)

// The highlighted row is marked on its element, so moving the highlight re-renders nothing.
watchPostEffect(() => {
  const list = listEl.value
  if (!list) return
  void virtualRows.value
  void props.items
  void props.sections
  const id = `${props.listboxId}-opt-${props.highlight.current.value}`
  for (const row of list.querySelectorAll('[role="option"][data-active]'))
    if (row.id !== id) row.removeAttribute('data-active')
  list.querySelector(`[id="${id}"]`)?.setAttribute('data-active', 'true')
})

// Written straight to the element: bound in the template, each move would re-render the list.
let written: string[] = []
watchPostEffect(() => {
  const el = indicatorEl.value
  if (!el) return
  const next = indicatorStyle.value
  for (const key of written) if (next[key] === undefined) el.style.removeProperty(kebab(key))
  written = Object.keys(next).filter((key) => next[key] !== undefined)
  for (const key of written) el.style.setProperty(kebab(key), next[key]!)
})
const kebab = (key: string) => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

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
  count: () => (windowed.value ? props.items.length : 0),
  itemSize: () => props.itemSize,
  overscan: () => props.overscan,
  onReachEnd: () => emit('reach-end'),
})

// Every row is there, so the end is reached as soon as there are rows, and again when they change.
watch(
  () => (windowed.value ? 0 : props.items.length),
  (count) => count && emit('reach-end'),
  { immediate: true },
)

// One listener of each kind on the list, not three on every row.
function rowAt(event: Event): number {
  const prefix = `${props.listboxId}-opt-`
  const row = (event.target as Element).closest?.(`[id^="${prefix}"]`)
  return row ? Number(row.id.slice(prefix.length)) : -1
}
function onListMove(event: MouseEvent) {
  const index = rowAt(event)
  if (index >= 0 && !props.items[index]?.disabled) emit('hover', index)
}
// A press on a row leaves focus where it is, on the trigger or the input.
function onListDown(event: MouseEvent) {
  if (rowAt(event) >= 0) event.preventDefault()
}
function onListClick(event: MouseEvent) {
  const index = rowAt(event)
  const item = props.items[index]
  if (item && !item.disabled) emit('select', item, index)
}

defineExpose({
  listEl,
  indicatorEl,
  scrollToIndex: (index: number, align?: ScrollAlign) => {
    if (windowed.value) return scrollToIndex(index, align)
    const row = listEl.value?.querySelector<HTMLElement>(`[id="${props.listboxId}-opt-${index}"]`)
    if (listEl.value && row) scrollIntoContainer(listEl.value, row, align)
  },
})
</script>
