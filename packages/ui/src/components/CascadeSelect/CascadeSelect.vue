<template>
  <div ref="root" class="ui-cascade-select" :data-disabled="isDisabled || undefined">
    <Menu
      ref="menuRef"
      v-model:open="open"
      :items="mappedItems"
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      :align-offset="alignOffset"
      :close-on-esc="closeOnEsc"
      :close-on-outside="closeOnOutside"
      :before-close="beforeClose"
      :force-mount="forceMount"
      :teleport-to="teleportTo"
      :scroll-fade="scrollFade"
      :ui="{ positioner: themedUi()?.positioner, panel: themedUi()?.panel }"
      @open-change="onOpenChange"
      @select="onMenuSelect"
    >
      <template #trigger="{ open: menuOpen }">
        <div
          :id="fieldControl.id"
          ref="triggerEl"
          role="combobox"
          v-bind="restAttrs"
          :class="triggerClass"
          :style="[triggerStyle, attrs.style as never]"
          :tabindex="isDisabled ? -1 : 0"
          :aria-disabled="isDisabled || undefined"
          :data-state="menuOpen ? 'open' : 'closed'"
          :data-invalid="isInvalid || undefined"
          :data-placeholder="!selectedItem || undefined"
          :aria-describedby="fieldControl.describedBy()"
          :aria-invalid="isInvalid || undefined"
          :aria-required="fieldControl.required() || undefined"
          @click="onTriggerClick"
          @keydown="onTriggerKeydown"
          @focus="fieldControl.onFocus"
          @blur="fieldControl.onBlur"
        >
          <span :class="valuePart.class" :style="valuePart.style">
            <slot name="value" :selected="selectedItem as T | null" :path="selectedPath">{{
              selectedItem?.label ?? placeholder
            }}</slot>
          </span>
          <Transition name="ui-clear">
            <button
              v-if="clearable && selectedItem && !isDisabled"
              type="button"
              class="ui-cascade-select-clear"
              :aria-label="messages.cascadeSelect.clear"
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
          <svg
            class="ui-cascade-select-chevron"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </template>
      <!-- Empty tree: fall through to Menu's #default escape hatch. Non-empty: use #item to reproduce Menu's label+chevron. -->
      <template v-if="mappedItems.length === 0" #default>
        <div class="ui-cascade-select-empty" role="presentation">
          <slot name="empty">{{ messages.cascadeSelect.empty }}</slot>
        </div>
      </template>
      <template v-else #item="{ item: entry }">
        <slot name="item" :item="resolveItem(entry) as T" :has-children="!!entry.items">
          <span class="ui-menu-item-label">{{ entry.label }}</span>
          <span v-if="entry.items" class="ui-menu-item-chevron" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </slot>
      </template>
    </Menu>
    <input v-if="name" type="hidden" :name="name" :value="model ?? ''" />
  </div>
</template>

<script lang="ts">
/**
 * One node in a `CascadeSelect` hierarchy. A node with `children` is a
 * branch — it opens a nested level on hover/click/ArrowRight instead of
 * committing a selection; a node with no `children` (or an empty array) is a
 * leaf — it's the only kind of node that can ever become the model value.
 */
export interface CascadeSelectItem {
  label: string
  value: string | number
  disabled?: boolean
  children?: readonly CascadeSelectItem[]
}

/** Root-to-leaf sequence of `value`s for the current selection. */
export type CascadeSelectPath = (string | number)[]
</script>

<!-- Wraps Menu's submenu engine; nodeByKey side-table preserves type at all depths. -->
<script setup lang="ts" generic="T extends CascadeSelectItem = CascadeSelectItem">
import './CascadeSelect.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import Menu from '../Menu/Menu.vue'
import type { MenuAlign, MenuItemData, MenuSide } from '../Menu/Menu.vue'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useFieldControl } from '../../composables/useFieldControl'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const model = defineModel<string | number | null>({ default: null })
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    items: readonly T[]
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    /** Standalone override; ORed with the nearest Field's `error` state. */
    invalid?: boolean
    size?: 'sm' | 'md' | 'lg'
    /** Renders a hidden `<input type="hidden">` mirroring the leaf value, for plain `<form>` posts. */
    name?: string
    side?: MenuSide
    align?: MenuAlign
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
    }>
  }>(),
  {
    placeholder: undefined,
    disabled: false,
    clearable: false,
    invalid: false,
    size: 'md',
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
    scrollFade: true,
    ui: undefined,
  },
)

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  change: [value: string | number | null]
  select: [item: T, path: CascadeSelectPath]
}>()

defineSlots<{
  /** Trigger content override — receives the resolved leaf item and its root-to-leaf path. */
  value(props: { selected: T | null; path: CascadeSelectPath }): unknown
  /** Row content override, any level — keeps the row's expand/select behavior. */
  item(props: { item: T; hasChildren: boolean }): unknown
  /** Replaces the localized "no options" row shown when `items` is empty. */
  empty(): unknown
}>()

function findLeaf(
  items: readonly CascadeSelectItem[],
  value: string | number,
  path: CascadeSelectPath = [],
): { item: CascadeSelectItem; path: CascadeSelectPath } | null {
  for (const item of items) {
    const nextPath = [...path, item.value]
    if (item.children && item.children.length > 0) {
      const found = findLeaf(item.children, value, nextPath)
      if (found) return found
    } else if (item.value === value) {
      return { item, path: nextPath }
    }
  }
  return null
}

// Derive from model + tree at render time, not capture at selection; handles programmatic resets.
const selectedMatch = computed(() =>
  model.value == null ? null : findLeaf(props.items, model.value),
)
const selectedItem = computed(() => selectedMatch.value?.item ?? null)
const selectedPath = computed<CascadeSelectPath>(() => selectedMatch.value?.path ?? [])

// Side-table rebuilt each render to map synthetic Menu keys back to CascadeSelectItem (preserves type at all depths).
const nodeByKey = new Map<string, CascadeSelectItem>()
let nodeSeq = 0

function buildEntries(items: readonly CascadeSelectItem[]): MenuItemData[] {
  return items.map((item) => {
    const key = String(nodeSeq++)
    nodeByKey.set(key, item)
    const hasChildren = !!item.children && item.children.length > 0
    return {
      label: item.label,
      value: key,
      disabled: item.disabled,
      items: hasChildren ? buildEntries(item.children!) : undefined,
    }
  })
}

const mappedItems = computed(() => {
  nodeByKey.clear()
  nodeSeq = 0
  return buildEntries(props.items)
})

function resolveItem(entry: MenuItemData): CascadeSelectItem {
  const item = entry.value !== undefined ? nodeByKey.get(entry.value) : undefined
  // Every rendered entry is from mappedItems, so this can't miss (fallback for type safety).
  return item ?? { label: entry.label, value: entry.value ?? '' }
}

function onMenuSelect(entry: MenuItemData) {
  const item = entry.value !== undefined ? nodeByKey.get(entry.value) : undefined
  if (!item) return
  model.value = item.value
  const match = findLeaf(props.items, item.value)
  emit('select', item as T, match?.path ?? [])
  emit('change', item.value)
}

function onOpenChange(value: boolean, details: PopoverOpenChangeDetails) {
  emit('open-change', value, details)
}

// Trigger is a div (role="combobox"), not a real <button> — a click that
// bubbles up still reaches Menu's own wrapping span (which toggles), so this
// only needs to swallow the click while disabled; opening itself is Menu's job.
function onTriggerClick(event: MouseEvent) {
  if (isDisabled.value) event.stopPropagation()
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (isDisabled.value || open.value) return
  // No native <button> to auto-activate on Enter/Space anymore; drive `open` directly.
  if (
    event.key === 'ArrowDown' ||
    event.key === 'ArrowUp' ||
    event.key === 'Enter' ||
    event.key === ' '
  ) {
    event.preventDefault()
    open.value = true
  }
}

function onClear(event: MouseEvent) {
  event.preventDefault()
  model.value = null
  emit('change', null)
}

const messages = useUiMessages()
const fieldControl = useFieldControl({ filled: () => model.value != null })
const isInvalid = computed(() => props.invalid || fieldControl.invalid())
const isDisabled = computed(() => props.disabled || fieldControl.disabled())

const root = useTemplateRef<HTMLElement>('root')
const triggerEl = useTemplateRef<HTMLElement>('triggerEl')
const menuRef = useTemplateRef<ComponentExposed<typeof Menu>>('menuRef')

const attrs = useAttrs()
const restAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.cascadeSelect,
  () => props.ui,
)
const triggerSplit = computed(() => splitUiPart(themedUi()?.trigger))
const triggerClass = computed(() =>
  cx(
    'ui-cascade-select-trigger',
    `ui-cascade-select-trigger--${props.size}`,
    isDisabled.value && 'ui-cascade-select-trigger--disabled',
    triggerSplit.value.class,
    attrs.class as string | undefined,
  ),
)
const triggerStyle = computed(() => triggerSplit.value.style)
const valuePart = computed(() => resolveUiPart(cx, themedUi()?.value, 'ui-cascade-select-value'))

defineExpose({
  el: root,
  triggerEl,
  panelEl: computed(() => menuRef.value?.panelEl ?? null),
  positionerEl: computed(() => menuRef.value?.positionerEl ?? null),
  listEl: computed(() => menuRef.value?.listEl ?? null),
  isClosing: computed(() => menuRef.value?.isClosing ?? false),
  selectedItem,
  selectedPath,
  open: () => {
    open.value = true
  },
  close: () => menuRef.value?.close(),
  cancelClose: () => menuRef.value?.cancelClose(),
})
</script>
