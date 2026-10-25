<template>
  <!-- The clear button sits beside the combobox, not in it; a press on the frame focuses the combobox. -->
  <div
    ref="triggerEl"
    :data-ui-frame="props.size"
    :class="triggerPart.class"
    :style="[triggerPart.style, attrs.style as never]"
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
      aria-haspopup="tree"
      :aria-expanded="open"
      :aria-controls="treeId"
      :aria-describedby="fieldControl.describedBy()"
      :aria-labelledby="labelledBy"
      :aria-invalid="isInvalid || undefined"
      :aria-required="fieldControl.required() || undefined"
      @keydown="onTriggerKeydown"
      @focus="fieldControl.onFocus"
      @blur="fieldControl.onBlur"
    >
      <span :class="valuePart.class" :style="valuePart.style">
        <slot name="value" :selected="selectedNodes as T[]">
          <!-- The placeholder is the same text element, so the first choice crossfades in too. -->
          <LazyAnimatedText
            :class="isEmpty && 'ui-select-placeholder'"
            :value="isEmpty ? (placeholder ?? '') : displayLabel"
            :motion="!!props.motion"
          />
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
        :aria-label="messages.treeSelect.clear"
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
          :style="[{ transformOrigin }, panelMaxHeightStyle, panelPart.style]"
          :data-motion="props.motion ? undefined : 'off'"
          v-bind="panelAttrs"
        >
          <div v-if="$slots.header" :class="headerPart.class" :style="headerPart.style">
            <slot name="header" />
          </div>
          <Tree
            ref="treeRef"
            :id="treeId"
            :aria-labelledby="labelledBy"
            :aria-label="labelledBy ? undefined : (attrs['aria-label'] as string | undefined)"
            v-model="model"
            v-model:query="query"
            v-model:node="nodeModel"
            :items="items"
            :selection-mode="selectionMode"
            :selectable-folders="selectableFolders"
            :filterable="filterable"
            :filter-placeholder="filterPlaceholder"
            :empty-text="emptyText"
            :motion="!!props.motion"
            :expand-on-row-click="expandOnRowClick"
            :sticky-scroll="stickyScroll"
            :scroll-fade="scrollFade"
            :ui="treeUi"
            @change="(value) => emit('change', value)"
            @select="onTreeSelect"
            @expand-change="onExpandChange"
          >
            <template #node="slotProps">
              <slot name="node" v-bind="slotProps" />
            </template>
            <template #empty>
              <slot name="empty" />
            </template>
          </Tree>
          <div v-if="$slots.footer" :class="footerPart.class" :style="footerPart.style">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <template v-if="name">
    <input v-if="selectionMode === 'single'" type="hidden" :name="name" :value="model ?? ''" />
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
import type { TreeNode, TreeSelectionMode } from '../Tree/Tree.vue'

/** Kept as alias for backward-compat type export; real interface is in Tree.vue. */
export type TreeSelectNode = TreeNode

export type TreeSelectSide = Side
export type TreeSelectAlign = Align
export type TreeSelectSelectionMode = TreeSelectionMode
</script>

<script setup lang="ts" generic="T extends TreeSelectNode = TreeSelectNode">
import type { PopoverCloseReason } from '../../composables/usePopover'
import type { BeforeClose, TreeSelectMotion } from '../../motion/types'
import './TreeSelect.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../shared/clear-transition.css'
import { measureClearSpace, resetLeaveStyles, startClearLeave } from '../../composables/dom'
import '../shared/select-panel.css'
import '../shared/select-value.css'
import { computed, inject, nextTick, useAttrs, useId, useTemplateRef, watch } from 'vue'
import { useAttrListeners } from '../../composables/forwardedListeners'
import type { ComponentExposed } from 'vue-component-type-helpers'
import { usePopover } from '../../composables/usePopover'
import { useSelectPanelMotion } from '../../composables/useSelectPanelMotion'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useFieldControl } from '../../composables/useFieldControl'
import { useFormReset } from '../../composables/useFormReset'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import Tree from '../Tree/Tree.vue'
import LazyAnimatedText from '../internal/LazyAnimatedText.vue'

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

/** Selected value, or an array of values outside `'single'` mode. @default null */
const model = defineModel<string | number | (string | number)[] | null>({ default: null })
/** Whether the panel is open. @default false */
const open = defineModel<boolean>('open', { default: false })
/** Search box text. @default '' */
const query = defineModel<string>('query', { default: '' })
/**
 * Selected node object(s), shaped like the model. It mirrors the model, so writes to it don't stick.
 * @default null
 */
const nodeModel = defineModel<T | T[] | null>('node', { default: null })

const rawProps = withDefaults(
  defineProps<{
    /** Tree data: nodes with `value`, `label` and optional `children`. */
    items: readonly T[]
    /** Text shown in the trigger while nothing is selected. */
    placeholder?: string
    /**
     * `'single'`: a click replaces the selection and closes the panel. `'multiple'`: a click toggles that node only. `'checkbox'`: checkboxes with cascading parent/child toggles.
     * @default 'single'
     */
    selectionMode?: TreeSelectSelectionMode
    /** `false` makes folders unselectable, so only leaves can become the value. No effect in
     * `'checkbox'` mode, which puts only leaves in the model.
     * @default true
     */
    selectableFolders?: boolean
    /** Disables the trigger and blocks interaction. @default false */
    disabled?: boolean
    /** Shows a clear button once something is selected. @default false */
    clearable?: boolean
    /** Marks the field invalid. ORed with the nearest Field's `error` state. @default false */
    invalid?: boolean
    /** Trigger size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /**
     * Shows the built-in label search box atop the panel, auto-expanding ancestors of any match. `false` removes it entirely.
     * @default true
     */
    filterable?: boolean
    /** Placeholder for the search box. @default 'Search...' */
    filterPlaceholder?: string
    /** Text shown when no nodes match the search or `items` is empty. @default 'No results found' */
    emptyText?: string
    /** Clicking a folder row also toggles its expansion, not only the chevron. The click still
     * selects the row unless `selectableFolders` is `false`.
     * @default false
     */
    expandOnRowClick?: boolean
    /** Pins each expanded ancestor's row to the top of the panel while its children scroll past,
     * VS Code-style. Nested rows keep their folder context in view.
     * @default false
     */
    stickyScroll?: boolean
    /**
     * Fades the panel's top and bottom edges while there are more rows past them. With
     * `stickyScroll`, only the bottom fades, so pinned rows stay solid.
     * @default true
     */
    scrollFade?: boolean
    /** Renders hidden `<input>`(s) so a plain `<form>` post carries the selection, repeating `name` outside `'single'` mode. */
    name?: string
    /** Which side of the trigger the panel opens on. @default 'bottom' */
    side?: TreeSelectSide
    /** How the panel aligns against the trigger along that side. @default 'start' */
    align?: TreeSelectAlign
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
     * Caps the panel height in pixels; the tree scrolls past it. The viewport limits it too, so
     * pass `Infinity` to fill the available space.
     * @default 320
     */
    maxPanelHeight?: number
    /**
     * `false` skips all built-in motion: the panel opening, rows, the chevron, the list easing to a
     * new height, and the clear button. An object moves the panel your way, like Popover's: values
     * for the `panel` part, `{ spring }`, or `enter` / `leave` hooks for your own library.
     * @default true
     */
    motion?: TreeSelectMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      filter: UiPartValue
      list: UiPartValue
      node: UiPartValue
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
    }>
  }>(),
  {
    placeholder: undefined,
    selectionMode: 'single',
    selectableFolders: true,
    disabled: false,
    clearable: false,
    invalid: false,
    filterable: true,
    filterPlaceholder: 'Search...',
    emptyText: 'No results found',
    expandOnRowClick: false,
    stickyScroll: false,
    scrollFade: true,
    name: undefined,
    side: 'bottom',
    align: 'start',
    sideOffset: 8,
    alignOffset: 0,
    closeOnEsc: true,
    closeOnOutside: true,
    maxPanelHeight: 320,
    beforeClose: undefined,
    forceMount: false,
    teleportTo: 'body',
    motion: undefined,
    ui: undefined,
  },
)
const props = withProviderDefaults(rawProps, { size: 'md', motion: true })

const emit = defineEmits<{
  /** Fires before the panel closes; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  /** Fires when you change the selection, including clear. */
  change: [value: string | number | (string | number)[] | null]
  /** Fires when you pick or toggle a node. */
  select: [node: T]
  /** Fires when a node expands or collapses, except during filter-driven auto-expansion. */
  'expand-change': [value: string | number, expanded: boolean]
}>()

defineSlots<{
  /** Content at the start of the trigger, such as an icon, before the value. */
  start(): unknown
  /** Content before the built-in clear button and chevron. */
  end(): unknown
  /** Custom trigger content for the selected nodes. */
  value(props: { selected: T[] }): unknown
  /** Content above the filter input (when `filterable` is on) or the tree. */
  header(): unknown
  /** Custom row content for each node; the built-in row wrapper and behavior stay in place. */
  node(props: {
    node: T
    depth: number
    expanded: boolean
    checked: boolean
    indeterminate: boolean
    disabled: boolean
    toggleExpand: () => void
    toggleSelect: () => void
    findNode: (value: string | number) => T | undefined
    findParent: (value: string | number) => T | null
    removeNode: (value: string | number) => boolean
  }): unknown
  /** Replaces `emptyText`. */
  empty(): unknown
  /** Content below the tree. */
  footer(): unknown
}>()

function findNode(nodes: readonly TreeSelectNode[], value: string | number): TreeSelectNode | null {
  for (const node of nodes) {
    if (node.value === value) return node
    if (node.children) {
      const found = findNode(node.children, value)
      if (found) return found
    }
  }
  return null
}

const selectedSingleNode = computed(() =>
  props.selectionMode === 'single' && model.value != null
    ? findNode(props.items, model.value as string | number)
    : null,
)
const selectedNodes = computed<TreeSelectNode[]>(() => {
  if (props.selectionMode === 'single')
    return selectedSingleNode.value ? [selectedSingleNode.value] : []
  const values = Array.isArray(model.value) ? model.value : []
  const out: TreeSelectNode[] = []
  for (const value of values) {
    const node = findNode(props.items, value)
    if (node) out.push(node)
  }
  return out
})
const isEmpty = computed(() => selectedNodes.value.length === 0)
const displayLabel = computed(() => {
  if (selectedNodes.value.length === 0) return ''
  if (selectedNodes.value.length === 1) return selectedNodes.value[0]!.label
  return messages.value.treeSelect.selectedCount.replace(
    '{count}',
    String(selectedNodes.value.length),
  )
})

function onClear(event: MouseEvent) {
  event.preventDefault()
  model.value = props.selectionMode === 'single' ? null : []
  emit('change', model.value)
  // The clear button goes with the value, so focus goes back to the combobox.
  controlEl.value?.focus()
}

// Single-select commits and closes; multiple/checkbox stay open.
function onTreeSelect(node: T) {
  emit('select', node)
  if (props.selectionMode === 'single') close()
}

const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
useFormReset(model, () => triggerEl.value)
const controlEl = useTemplateRef<HTMLElement>('controlEl')
function focusControl() {
  controlEl.value?.focus()
}
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const panelTransition = useSelectPanelMotion({
  name: 'TreeSelect',
  key: 'treeSelect',
  motion: () => props.motion,
  positioner: () => positionerEl.value,
  panel: () => panelEl.value,
  trigger: () => triggerEl.value,
  forceMount: () => props.forceMount,
  placed: () => positionerStyle.value.visibility === 'visible',
})

function onExpandChange(value: string | number, expanded: boolean) {
  emit('expand-change', value, expanded)
}
const treeRef = useTemplateRef<ComponentExposed<typeof Tree>>('treeRef')

// Sourced from Tree (owns real role="tree").
const listEl = computed(() => treeRef.value?.listEl ?? null)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.treeSelect,
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
  matchReferenceWidth: true,
  closeOnEsc: () => props.closeOnEsc,
  closeOnOutside: () => props.closeOnOutside,
  beforeClose: () => props.beforeClose,
  maxHeightCap: () => props.maxPanelHeight,
  onOpenChange: (value, details) => emit('open-change', value, details),
})

// Same shared-layer-stack stacking as Popover.vue/Dialog.vue - see Popover's own comment.
const zIndex = computed(() => `calc(var(--ui-z-dialog, 50) + ${Math.max(0, layerIndex())})`)

const treeId = useId()

const messages = useUiMessages()
const fieldControl = useFieldControl({
  filled: () => !isEmpty.value,
  frame: { el: () => triggerEl.value, size: () => props.size },
})
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
// The trigger's name names the tree too.
const labelledBy = computed(
  () => (attrs['aria-labelledby'] as string | undefined) ?? fieldControl.labelledBy(),
)

function openTree() {
  if (isDisabled.value) return
  open.value = true
}
function onTriggerClick() {
  if (isDisabled.value) return
  if (open.value) close()
  else openTree()
}
function onTriggerKeydown(event: KeyboardEvent) {
  if (isDisabled.value || open.value) return
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
    event.preventDefault()
    openTree()
  }
}

// Gate on visibility:hidden resolution; Tree owns mechanics, TreeSelect owns policy (steal focus on open).
watch(
  () => open.value && positionerStyle.value.visibility === 'visible',
  (ready) => {
    if (!ready) return
    nextTick(() => {
      const tree = treeRef.value
      const selected = selectedNodes.value[0]
      if (props.filterable) {
        tree?.initRoving()
        tree?.filterInputRef?.inputEl?.focus()
      } else if (selected) tree?.focusNode(selected.value)
      else tree?.focusFirstRow()
    })
  },
)
// Only steal focus back to trigger if it was inside panel when closed (don't override outside click/Tab).
watch(open, (value) => {
  if (value) return
  nextTick(() => {
    const active = document.activeElement
    if (active instanceof Node && positionerEl.value?.contains(active)) {
      controlEl.value?.focus()
    }
  })
})

const panelMaxHeightStyle = computed(() =>
  maxHeight.value != null ? { maxHeight: `${maxHeight.value}px` } : {},
)

const triggerPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.trigger,
    'ui-tree-select-trigger',
    `ui-tree-select-trigger--${props.size}`,
    isDisabled.value && 'ui-tree-select-trigger--disabled',
    attrs.class as string | undefined,
  ),
)
const valuePart = computed(() => resolveUiPart(cx, themedUi()?.value, 'ui-select-value'))
const startPart = computed(() =>
  resolveUiPart(cx, themedUi()?.start, 'ui-select-start', 'ui-tree-select-start'),
)
const endPart = computed(() =>
  resolveUiPart(cx, themedUi()?.end, 'ui-select-end', 'ui-tree-select-end'),
)
const clearPart = computed(() => resolveUiPart(cx, themedUi()?.clear, 'ui-select-clear'))
const chevronPart = computed(() => resolveUiPart(cx, themedUi()?.chevron, 'ui-select-chevron'))
const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-select-positioner', 'ui-tree-select-positioner'),
)
const panelPart = computed(() =>
  resolveUiPart(cx, themedUi()?.panel, 'ui-select-panel', 'ui-tree-select-panel'),
)
const headerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.header, 'ui-select-header', 'ui-tree-select-header'),
)
const footerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.footer, 'ui-select-footer', 'ui-tree-select-footer'),
)
// Deliver TreeSelect's classes to Tree as passengers alongside Tree's own classes.
function withLegacyClass(legacyClass: string, override: UiPartValue | undefined): UiPartValue {
  const { class: overrideClass, style } = splitUiPart(override)
  return { class: cx(legacyClass, overrideClass), style }
}
const treeUi = computed(() => ({
  node: withLegacyClass('ui-tree-select-row', themedUi()?.node),
  filter: withLegacyClass('ui-tree-select-filter', themedUi()?.filter),
  list: withLegacyClass('ui-tree-select-list', themedUi()?.list),
  empty: withLegacyClass('ui-tree-select-empty', themedUi()?.empty),
  // Static passenger classes only; Tree's own classes stay single source of truth.
  chevron: 'ui-tree-select-chevron',
  label: 'ui-tree-select-label',
}))

const resolvedSide = computed(() => placement.value.split('-')[0] as TreeSelectSide)
const resolvedAlign = computed<TreeSelectAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

defineExpose({
  /** Trigger element: the frame around the combobox and its clear button. Focusing it focuses the combobox. */
  triggerEl,
  /** Panel element (null while closed). */
  panelEl,
  /** Positioning wrapper around the panel (null while closed). */
  positionerEl,
  /** The tree's `role="tree"` element (null while closed). */
  listEl,
  /** Resolved placement after flipping, e.g. `'bottom-start'`. */
  placement,
  /** Inline positioning styles applied to the positioner. */
  positionerStyle,
  /** True while a `beforeClose` close is pending. */
  isClosing,
  /** Opens the panel (no-op while disabled). */
  open: openTree,
  /** Closes the panel, running `@open-change` and `beforeClose` first. */
  close,
  /** Cancels a close pending in `beforeClose` and keeps the panel open. */
  cancelClose,
  /** Expands every folder. No-op while the panel is closed. */
  expandAll: () => treeRef.value?.expandAll(),
  /** Collapses every folder. No-op while the panel is closed. */
  collapseAll: () => treeRef.value?.collapseAll(),
  /** Expands the node with this value. No-op while the panel is closed. */
  expandNode: (value: string | number) => treeRef.value?.expandNode(value),
  /** Collapses the node with this value. No-op while the panel is closed. */
  collapseNode: (value: string | number) => treeRef.value?.collapseNode(value),
  /** Finds the node with this value in `items` (`undefined` while closed). */
  findNode: (value: string | number) => treeRef.value?.findNode(value),
  /** Finds the parent of the node with this value (null for a root node or while closed). */
  findParent: (value: string | number) => treeRef.value?.findParent(value) ?? null,
  /** Removes the node with this value from `items` in place; returns whether it was found. */
  removeNode: (value: string | number) => treeRef.value?.removeNode(value) ?? false,
})
</script>
