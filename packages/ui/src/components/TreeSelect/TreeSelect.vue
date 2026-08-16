<template>
  <div
    ref="triggerEl"
    role="combobox"
    :id="fieldControl.id"
    :class="triggerPart.class"
    :style="[triggerPart.style, attrs.style as never]"
    :tabindex="isDisabled ? -1 : 0"
    :aria-disabled="isDisabled || undefined"
    aria-haspopup="tree"
    :aria-expanded="open"
    :aria-controls="treeId"
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
      <slot name="value" :selected="selectedNodes as T[]">
        <span v-if="isEmpty" class="ui-select-placeholder">{{ placeholder }}</span>
        <span v-else>{{ displayLabel }}</span>
      </slot>
    </span>
    <Transition name="ui-clear">
      <button
        v-if="clearable && !isEmpty && !isDisabled"
        type="button"
        class="ui-select-clear"
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
          :style="[{ transformOrigin }, panelMaxHeightStyle, panelPart.style]"
          :data-motion="motionCss ? undefined : 'off'"
          v-bind="$attrs"
        >
          <Tree
            ref="treeRef"
            :id="treeId"
            v-model="model"
            v-model:query="query"
            v-model:node="nodeModel"
            :items="items"
            :selection-mode="selectionMode"
            :selectable-folders="selectableFolders"
            :filterable="filterable"
            :filter-placeholder="filterPlaceholder"
            :empty-text="emptyText"
            :motion-css="motionCss"
            :expand-on-row-click="expandOnRowClick"
            :sticky-scroll="stickyScroll"
            :ui="treeUi"
            @change="(value) => emit('change', value)"
            @select="onTreeSelect"
            @expand-change="(value, expanded) => emit('expand-change', value, expanded)"
          >
            <template #node="slotProps">
              <slot name="node" v-bind="slotProps" />
            </template>
            <template #empty>
              <slot name="empty" />
            </template>
          </Tree>
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
import './TreeSelect.css'
import '../shared/tokens.css'
import '../shared/select-panel.css'
import '../shared/select-value.css'
import { computed, inject, nextTick, useAttrs, useId, useTemplateRef, watch } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import { usePopover } from '../../composables/usePopover'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useFieldControl } from '../../composables/useFieldControl'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import Tree from '../Tree/Tree.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const model = defineModel<string | number | (string | number)[] | null>({ default: null })
const open = defineModel<boolean>('open', { default: false })
const query = defineModel<string>('query', { default: '' })
/** Mirrors `model`'s value(s) as the full node object(s) — see Tree.vue's own `node` model for
 * the resolution details; TreeSelect just forwards it straight through from the inner Tree. */
const nodeModel = defineModel<T | T[] | null>('node', { default: null })

const props = withDefaults(
  defineProps<{
    items: readonly T[]
    placeholder?: string
    /** `'single'`: clicking replaces selection and closes the panel. `'multiple'`: clicking toggles that node only. `'checkbox'`: checkboxes with cascading parent/child toggles. */
    selectionMode?: TreeSelectSelectionMode
    /** `false` keeps a node with children out of the selection entirely — click, keyboard Enter/Space,
     * and expandOnRowClick's own select-on-expand all skip it, only a leaf can become the value. Has
     * no effect in `selectionMode="checkbox"`, which already only ever puts leaves in the model.
     * Default: true (a folder can be selected like any other node). */
    selectableFolders?: boolean
    disabled?: boolean
    clearable?: boolean
    invalid?: boolean
    size?: 'sm' | 'md' | 'lg'
    /** Shows the built-in label search box atop the panel, auto-expanding ancestors of any match. `false` removes it entirely. */
    filterable?: boolean
    filterPlaceholder?: string
    emptyText?: string
    /** When true, clicking anywhere on a folder row also toggles its expansion, not just the chevron —
     * it still selects too (unless `selectableFolders` is off), so picking the folder itself (without
     * opening it to reach a file inside) still works. Off by default since it changes what a plain row
     * click does. */
    expandOnRowClick?: boolean
    /** When true, each expanded ancestor's row pins to the top of the panel as its own children scroll
     * past, VS Code-style, so deeply nested content never loses its folder context. */
    stickyScroll?: boolean
    /** Renders hidden `<input>`(s) mirroring the selection, for plain
     * `<form>` posts — repeated `name` outside `single` mode. */
    name?: string
    side?: TreeSelectSide
    align?: TreeSelectAlign
    sideOffset?: number
    alignOffset?: number
    closeOnEsc?: boolean
    closeOnOutside?: boolean
    beforeClose?: (done: () => void) => void
    forceMount?: boolean
    teleportTo?: string | HTMLElement
    /** `false` skips all built-in motion (row transitions and chevron rotation). */
    motionCss?: boolean
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      filter: UiPartValue
      list: UiPartValue
      node: UiPartValue
      empty: UiPartValue
    }>
  }>(),
  {
    placeholder: undefined,
    selectionMode: 'single',
    selectableFolders: true,
    disabled: false,
    clearable: false,
    invalid: false,
    size: 'md',
    filterable: true,
    filterPlaceholder: 'Search...',
    emptyText: 'No results found',
    expandOnRowClick: false,
    stickyScroll: false,
    name: undefined,
    side: 'bottom',
    align: 'start',
    sideOffset: 8,
    alignOffset: 0,
    closeOnEsc: true,
    closeOnOutside: true,
    beforeClose: undefined,
    forceMount: false,
    teleportTo: 'body',
    motionCss: true,
    ui: undefined,
  },
)

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  change: [value: string | number | (string | number)[] | null]
  select: [node: T]
  /** Fires on manual expand/collapse; not on filter-driven auto-expansion. */
  'expand-change': [value: string | number, expanded: boolean]
}>()

defineSlots<{
  value(props: { selected: T[] }): unknown
  /** Row content override (library owns wrapper & behavior). */
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
  empty(): unknown
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
  return `${selectedNodes.value.length} selected`
})

function onClear(event: MouseEvent) {
  event.preventDefault()
  model.value = props.selectionMode === 'single' ? null : []
  emit('change', model.value)
}

// Single-select commits and closes; multiple/checkbox stay open.
function onTreeSelect(node: T) {
  emit('select', node)
  if (props.selectionMode === 'single') close()
}

const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const treeRef = useTemplateRef<ComponentExposed<typeof Tree>>('treeRef')
// Sourced from Tree (owns real role="tree").
const listEl = computed(() => treeRef.value?.listEl ?? null)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.treeSelect,
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
    matchReferenceWidth: true,
    closeOnEsc: () => props.closeOnEsc,
    closeOnOutside: () => props.closeOnOutside,
    beforeClose: () => props.beforeClose,
    onOpenChange: (value, details) => emit('open-change', value, details),
  })

const treeId = useId()

const messages = useUiMessages()
const fieldControl = useFieldControl({ filled: () => !isEmpty.value })
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

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
      treeRef.value?.initRoving()
      if (props.filterable) treeRef.value?.filterInputRef?.inputEl?.focus()
      else treeRef.value?.focusFirstRow()
    })
  },
)
// Only steal focus back to trigger if it was inside panel when closed (don't override outside click/Tab).
watch(open, (value) => {
  if (value) return
  nextTick(() => {
    const active = document.activeElement
    if (active instanceof Node && positionerEl.value?.contains(active)) {
      triggerEl.value?.focus()
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
const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-select-positioner', 'ui-tree-select-positioner'),
)
const panelPart = computed(() =>
  resolveUiPart(cx, themedUi()?.panel, 'ui-select-panel', 'ui-tree-select-panel'),
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
  triggerEl,
  panelEl,
  positionerEl,
  listEl,
  placement,
  positionerStyle,
  isClosing,
  open: openTree,
  close,
  cancelClose,
  expandAll: () => treeRef.value?.expandAll(),
  collapseAll: () => treeRef.value?.collapseAll(),
  expandNode: (value: string | number) => treeRef.value?.expandNode(value),
  collapseNode: (value: string | number) => treeRef.value?.collapseNode(value),
  findNode: (value: string | number) => treeRef.value?.findNode(value),
  findParent: (value: string | number) => treeRef.value?.findParent(value) ?? null,
  removeNode: (value: string | number) => treeRef.value?.removeNode(value) ?? false,
})
</script>
