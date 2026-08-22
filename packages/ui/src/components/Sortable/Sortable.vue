<template>
  <ul
    ref="root"
    v-bind="attrs"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-motion="motionCss ? undefined : 'off'"
    :data-axis="axis"
  >
    <li
      v-for="(item, index) in items"
      :key="keyOf(item)"
      data-sortable-item
      :data-value="keyOf(item)"
      :data-grabbed="isGrabbedItem(item) || undefined"
      :class="itemPart.class"
      :style="itemPart.style"
    >
      <button
        type="button"
        :class="handlePart.class"
        :style="handlePart.style"
        :aria-label="labelOf(item)"
        aria-roledescription="sortable item"
        :aria-describedby="instructionsId"
        :disabled="disabled"
        @pointerdown="onHandlePointerdown($event, keyOf(item))"
        @keydown="onHandleKeydown($event, keyOf(item))"
      >
        <slot name="handle" :item="item">
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="currentColor">
            <circle cx="6" cy="3" r="1.25" />
            <circle cx="10" cy="3" r="1.25" />
            <circle cx="6" cy="8" r="1.25" />
            <circle cx="10" cy="8" r="1.25" />
            <circle cx="6" cy="13" r="1.25" />
            <circle cx="10" cy="13" r="1.25" />
          </svg>
        </slot>
      </button>
      <div class="ui-sortable-content">
        <slot name="item" :item="item" :index="index" :grabbed="isGrabbedItem(item)">{{
          labelOf(item)
        }}</slot>
      </div>
    </li>

    <!-- Both nodes stay mounted for the life of the list: a live region added
         to the DOM at announcement time is not reliably read out. -->
    <span :id="instructionsId" class="ui-sortable-status">{{
      messages.sortable.instructions
    }}</span>
    <span class="ui-sortable-status" role="status" aria-live="assertive" aria-atomic="true">{{
      announcement
    }}</span>
  </ul>
</template>

<!-- Flat drag-to-reorder list over useSortable. The handle is a real button and a real
     tab stop, not a decorative grip: pointer and keyboard drive the SAME grabbed state in
     the engine, so neither is a bolted-on second path. Reorders mutate the bound array in
     place (`moveTreeNode` semantics) and then emit — matching how removeTreeNode already
     lets a consumer edit `items` directly. Nesting is deliberately not exposed here; Tree
     owns that, over the same engine. -->
<script setup lang="ts" generic="T extends Record<string, any>">
import './Sortable.css'
import '../shared/tokens.css'
import { computed, useAttrs, useId, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'
import { useSortable } from '../../composables/useSortable'
import type { DropPosition, FlatSortableRow, SortableAxis } from '../../composables/useSortable'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const items = defineModel<T[]>('items', { default: () => [] })

const props = withDefaults(
  defineProps<{
    /** Property holding each item's stable identity. Defaults to `value`, the same item vocabulary `MenuItemData`/`SelectItemData`/`TreeNode` already use. */
    itemKey?: keyof T
    /** Property to announce and to render when no `#item` slot is given. */
    labelKey?: keyof T
    /** `'y'` (default) reorders a column of rows; `'x'` reorders a row of items. Arrow keys follow the axis. */
    axis?: SortableAxis
    disabled?: boolean
    /** `false` skips the built-in springs entirely — rows snap to their new slots. Reach for it when driving the motion yourself. */
    motionCss?: boolean
    ui?: Partial<{
      root: UiPartValue
      item: UiPartValue
      handle: UiPartValue
    }>
  }>(),
  {
    itemKey: 'value' as never,
    labelKey: 'label' as never,
    axis: 'y',
    disabled: false,
    motionCss: true,
    ui: undefined,
  },
)

const emit = defineEmits<{
  /** Fires after `items` has been reordered in place. */
  reorder: [value: string | number, to: DropPosition]
}>()

defineSlots<{
  item(props: { item: T; index: number; grabbed: boolean }): unknown
  handle(props: { item: T }): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const messages = useUiMessages()
const instructionsId = useId()

function keyOf(item: T): string | number {
  return item[props.itemKey as keyof T] as string | number
}
function labelOf(item: T): string {
  return String(item[(props.labelKey ?? props.itemKey) as keyof T] ?? '')
}

// Flat list: every row is a root-level sibling, so depth is always 0.
const rows = computed<FlatSortableRow[]>(() =>
  items.value.map((item) => ({ value: keyOf(item), depth: 0, parentValue: null })),
)

function elementFor(value: string | number): HTMLElement | null {
  return (
    root.value?.querySelector<HTMLElement>(
      `[data-sortable-item][data-value="${CSS.escape(String(value))}"]`,
    ) ?? null
  )
}

const { activeValue, isGrabbed, announcement, onHandlePointerdown, onHandleKeydown } = useSortable({
  rows,
  getElement: elementFor,
  axis: () => props.axis,
  nested: false,
  disabled: () => props.disabled,
  motionCss: () => props.motionCss,
  labelOf: (value) => {
    const item = items.value.find((candidate) => keyOf(candidate) === value)
    return item ? labelOf(item) : String(value)
  },
  announce: (event) =>
    messages.value.sortable[
      event.kind === 'grab'
        ? 'grabbed'
        : event.kind === 'move'
          ? // Flat list: depth is always 0, so announcing a level would be noise.
            'moved'
          : event.kind === 'drop'
            ? 'dropped'
            : 'cancelled'
    ]
      .replace('{label}', event.label)
      .replace('{position}', String(event.position))
      .replace('{total}', String(event.total))
      .replace('{depth}', String(event.depth + 1)),
  onCommit: (value, to) => {
    const from = items.value.findIndex((item) => keyOf(item) === value)
    if (from === -1) return
    // Replaced rather than spliced in place: the bound array can be a shared
    // constant, and `to.index` is already counted with the item removed.
    const next = [...items.value]
    const [moved] = next.splice(from, 1)
    next.splice(Math.min(Math.max(to.index, 0), next.length), 0, moved!)
    items.value = next
    emit('reorder', value, to)
  },
})

function isGrabbedItem(item: T): boolean {
  return isGrabbed.value && activeValue.value === keyOf(item)
}

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.sortable,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-sortable'))
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-sortable-item'))
const handlePart = computed(() => resolveUiPart(cx, themedUi()?.handle, 'ui-sortable-handle'))

defineExpose({ el: root, isGrabbed, activeValue })
</script>
