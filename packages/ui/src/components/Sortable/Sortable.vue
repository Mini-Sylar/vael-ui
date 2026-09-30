<template>
  <ul
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-motion="motionCss ? undefined : 'off'"
    :data-axis="axis"
    :data-invalid-drop="isGrabbed && !isValidDrop ? '' : undefined"
    :data-pending="isPending ? '' : undefined"
    :data-drop-target="isForeignDropTarget ? '' : undefined"
    v-bind="attrs"
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
import { moveTreeNode } from '../../composables/useSortable'
import type {
  DropPosition,
  FlatSortableRow,
  SortableAxis,
  SortableDropDetails,
  SortableGroupHandle,
} from '../../composables/useSortable'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
/**
 * The list, in order. Sortable assigns a new array when a drop commits, so bind it with `v-model:items`.
 * @default []
 */
const items = defineModel<T[]>('items', { default: () => [] })

const props = withDefaults(
  defineProps<{
    /**
     * Property that holds each item's stable identity. `value` matches `MenuItemData`, `SelectItemData` and `TreeNode`.
     * @default 'value'
     */
    itemKey?: keyof T
    /** Property to announce, and to render when you don't pass an `#item` slot. @default 'label' */
    labelKey?: keyof T
    /**
     * `'y'` reorders a column of rows; `'x'` reorders a row of items. Arrow keys follow the axis.
     * @default 'y'
     */
    axis?: SortableAxis
    /** Runs repeatedly while you drag; return `false` to mark the target invalid. Keep it cheap. */
    canDrop?: (details: SortableDropDetails) => boolean
    /** Async check at drop time. Return `false`, or a promise of `false`, to cancel. Pairs with `confirmAction().result`. */
    beforeDrop?: (details: SortableDropDetails) => boolean | Promise<boolean>
    /**
     * Scrolls the list, any scrollable ancestor, or the page while a drag nears its edge.
     * @default true
     */
    autoScroll?: boolean
    /** Turns off dragging, so rows stay static. @default false */
    disabled?: boolean
    /**
     * `false` skips the built-in springs, so rows snap to their new slots. Use it when you drive the motion yourself.
     * @default true
     */
    motionCss?: boolean
    /** Handle from `useSortableGroup()`. Lists that share it, `<Sortable>` or `useSortable()`, let items cross between them. */
    group?: SortableGroupHandle
    /** This list's identity within `group`. Unset, Sortable assigns one. */
    groupId?: string | number
    /** `group` only: what follows the pointer once a drag leaves this list.
     * `'element'` moves the real item; `'clone'` floats a copy, for content that can't leave its layout. */
    previewMode?: 'element' | 'clone'
    /** Milliseconds a touch must hold a row still before a drag starts. Unset, drags start at once.
     * Set it only when `#item` or `#handle` content is also tappable; the built-in handle never needs it. */
    touchDragDelay?: number
    /** Class and style overrides for each part. */
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
    canDrop: undefined,
    beforeDrop: undefined,
    autoScroll: true,
    disabled: false,
    motionCss: true,
    group: undefined,
    groupId: undefined,
    ui: undefined,
  },
)

const emit = defineEmits<{
  /** Fires after `items` changes order. Persist optimistically here; on failure, restore your own snapshot of `items`. */
  reorder: [value: string | number, to: DropPosition]
  /** Fires when `beforeDrop` throws or rejects, after Sortable reverts the move. */
  'drop-error': [error: unknown, details: SortableDropDetails]
}>()

defineSlots<{
  /** Row content. Unset, the row shows the item's `labelKey` value. */
  item(props: { item: T; index: number; grabbed: boolean }): unknown
  /** Replaces the default drag handle. */
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

const {
  activeValue,
  isGrabbed,
  isGrabbedValue,
  isValidDrop,
  isPending,
  isForeignDropTarget,
  announcement,
  onHandlePointerdown,
  onHandleKeydown,
} = useSortable({
  rows,
  getElement: elementFor,
  container: () => root.value,
  axis: () => props.axis,
  nested: false,
  group: props.group,
  groupId: () => props.groupId,
  previewMode: () => props.previewMode ?? 'element',
  touchDragDelay: () => props.touchDragDelay ?? 0,
  canDrop: (details) => props.canDrop?.(details) ?? true,
  beforeDrop: props.beforeDrop ? (details) => props.beforeDrop!(details) : undefined,
  onDropError: (error, details) => emit('drop-error', error, details),
  autoScroll: () => props.autoScroll,
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
    // Same function Tree reorders through — a flat list is just a tree whose
    // nodes have no children, so the two can't drift apart. Copied first
    // because the bound array may be a shared constant.
    const next = [...items.value]
    if (!moveTreeNode(next, value, to, { getKey: keyOf, getChildren: () => undefined })) return
    items.value = next
    emit('reorder', value, to)
  },
})

function isGrabbedItem(item: T): boolean {
  return isGrabbedValue(keyOf(item))
}

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.sortable,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-sortable'))
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-sortable-item'))
const handlePart = computed(() => resolveUiPart(cx, themedUi()?.handle, 'ui-sortable-handle'))

defineExpose({
  /** Root element. */
  el: root,
  /** Whether an item is held, by pointer or keyboard. */
  isGrabbed,
  /** `false` while hovering a target that `canDrop` rejected. */
  isValidDrop,
  /** Whether an async `beforeDrop` is still deciding. */
  isPending,
  /** `group` only: whether a drag from another list is hovering this one. */
  isForeignDropTarget,
  /** Key of the item being dragged, or `null`. */
  activeValue,
})
</script>
