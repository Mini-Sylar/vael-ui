<template>
  <div
    ref="rootEl"
    role="toolbar"
    :aria-orientation="orientation === 'vertical' ? 'vertical' : undefined"
    :class="rootPart.class"
    :style="[sizeStyle, rootPart.style]"
    :data-orientation="orientation"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointerup="onPointerLeave"
    @pointercancel="onPointerLeave"
    v-bind="attrs"
  >
    <button
      v-for="(item, index) in items"
      :key="item.value ?? item.label"
      :ref="bindItemRef(index)"
      type="button"
      :class="itemPart.class"
      :style="itemPart.style"
      :tabindex="index === activeIndex ? 0 : -1"
      :disabled="item.disabled"
      :data-bounce="bouncing === index || undefined"
      @pointerup="onItemPointerUp($event, index)"
      @animationend="onItemAnimationEnd(index)"
      :aria-label="item.badge != null ? `${item.label}, ${item.badge}` : item.label"
      v-tooltip="
        tooltips
          ? {
              content: item.label,
              side: resolvedTooltipSide,
              sideOffset: () => tooltipOffset(index),
            }
          : undefined
      "
      @click="onItemSelect(item, index)"
      @keydown="onItemKeydown($event, index)"
      @focus="activeIndex = index"
    >
      <component :is="item.icon" v-if="item.icon" aria-hidden="true" />
      <span v-if="item.badge != null" class="ui-dock-item-badge" aria-hidden="true">{{
        item.badge
      }}</span>
    </button>
  </div>
</template>

<!--
  Reuses MenuItemData shape; direct roving tabindex (simpler than useToolbar for
  homogeneous buttons). Tooltips default-wired with orientation-aware positioning
  (vertical docks need right-bias to avoid stacking).
-->

<script setup lang="ts">
import './Dock.css'
import '../shared/tokens.css'
import { computed, shallowRef, useAttrs, useTemplateRef, watch } from 'vue'
import type { Component } from 'vue'
import type { Side } from '@floating-ui/dom'
import { useDock } from '../../composables/useDock'
import type { DockOrientation } from '../../composables/useDock'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { vTooltip } from '../../directives/vTooltip'
import { useStateMotion } from '../../motion/useStateMotion'
import type { DockMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

/**
 * One dock item. Deliberately compatible with `MenuItemData`'s established
 * fields (`label`/`value`/`icon`/`disabled`/`onSelect`) — see the SFC
 * comment above for why a divergent shape wasn't invented here.
 */
export interface DockItemData {
  label: string
  /** Identity for your `@select` handler; `:key` falls back to `label` when unset. */
  value?: string
  /** Icon component. CSS sizes it via `.ui-dock-item svg`. */
  icon?: Component
  /** Small overlay badge, such as an unread count. The item's `aria-label` includes it. */
  badge?: string | number
  disabled?: boolean
  /** Per-item handler; `@select` fires alongside it. */
  onSelect?: () => void
}

const props = withDefaults(
  defineProps<{
    /** Items to show, one button each. */
    items: DockItemData[]
    /** Lays items out in a row or a column; arrow keys follow the same axis. @default 'horizontal' */
    orientation?: DockOrientation
    /** Resting icon size, in pixels. @default 48 */
    baseSize?: number
    /** Icon size, in pixels, directly under the pointer. @default 76 */
    maxSize?: number
    /** Falloff distance in pixels. Unset, it's 3.5 times `baseSize`. */
    range?: number
    /** Dims the dock and blocks pointer interaction and magnification. @default false */
    disabled?: boolean
    /**
     * `false` turns off magnification but keeps items interactive, unlike `disabled`.
     * @default true
     */
    magnify?: boolean
    /**
     * Magnifies by resizing items, so the dock grows with them. Off, items scale and
     * spread with transforms and the dock keeps its size.
     * @default false
     */
    grow?: boolean
    /** Renders each item's `v-tooltip` on hover. @default true */
    tooltips?: boolean
    /** Which side each item's tooltip opens on. Unset, it's `'top'` when horizontal and `'right'` when vertical. */
    tooltipSide?: Side
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; item: UiPartValue }>
    /** How it moves: its appearance, item by item (`{ initial: { item: { opacity: 0, y: 8 } }, stagger: 0.04 }`). `false` turns its own animation off. */
    motion?: DockMotion
  }>(),
  {
    orientation: 'horizontal',
    baseSize: 48,
    maxSize: 76,
    disabled: false,
    magnify: true,
    grow: false,
    tooltips: true,
    tooltipSide: undefined,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

const emit = defineEmits<{
  /** Fires when you click an item, or press Enter or Space on a focused item. */
  select: [item: DockItemData, index: number]
}>()

const rootEl = useTemplateRef<HTMLElement>('rootEl')

const parts = useStateMotion({
  key: 'dock',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => rootEl.value,
  selectors: { root: '.ui-dock', item: '.ui-dock-item' },
  states: () => ({}),
})

const { setItemEl, onPointerDown, onPointerMove, onPointerLeave, touchSlid, remeasure } = useDock(
  rootEl,
  () => props.items.length,
  {
    orientation: () => props.orientation,
    baseSize: () => props.baseSize,
    maxSize: () => props.maxSize,
    range: () => props.range,
    disabled: () => props.disabled,
    magnify: () => props.magnify,
    grow: () => props.grow,
  },
)

// Custom properties for base/max sizes (set once, unlike live per-frame magnification scale).
const sizeStyle = computed(() => ({
  '--ui-dock-base-size': `${props.baseSize}px`,
  '--ui-dock-max-size': `${props.maxSize}px`,
}))

// A tap (a finger or pen that did not slide) bounces the item it landed on: the magnification
// never ran, so this is the feedback that the tap was taken.
const bouncing = shallowRef<number | null>(null)
function onItemPointerUp(event: PointerEvent, index: number) {
  if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
  if (touchSlid() || props.disabled) return
  bouncing.value = index
}
function onItemAnimationEnd(index: number) {
  if (bouncing.value === index) bouncing.value = null
}

const resolvedTooltipSide = computed<Side>(
  () => props.tooltipSide ?? (props.orientation === 'vertical' ? 'right' : 'top'),
)

/** The tooltip's own default gap, plus the room the item can still magnify into on that side. */
const TOOLTIP_GAP = 8
// Read each time the tooltip is positioned, so whenever it opens it lands past the item's
// magnified edge and stays put while the item grows under it, instead of riding up with it or
// being overlapped. Horizontal items grow upward from their base; otherwise they grow around
// their centre.
function tooltipOffset(index: number): number {
  const el = itemButtons[index]
  if (!el || !props.magnify) return TOOLTIP_GAP
  const rect = el.getBoundingClientRect()
  const vertical = props.orientation === 'vertical'
  const side = resolvedTooltipSide.value
  const growX = props.maxSize - rect.width
  const growY = props.maxSize - rect.height
  const room =
    side === 'top'
      ? vertical
        ? growY / 2
        : growY
      : side === 'bottom'
        ? vertical
          ? growY / 2
          : 0
        : growX / 2
  return TOOLTIP_GAP + Math.max(0, room)
}

// Roving tabindex (APG toolbar): one tab stop, arrow keys move focus, Enter/Space native to buttons.
const activeIndex = shallowRef(0)
watch(
  () => props.items.length,
  (length) => {
    if (activeIndex.value >= length) activeIndex.value = Math.max(0, length - 1)
  },
)

const itemButtons: (HTMLButtonElement | null)[] = []
function bindItemRef(index: number) {
  const registerWithDock = setItemEl(index)
  return (el: unknown) => {
    registerWithDock(el)
    itemButtons[index] = (el as HTMLButtonElement | null) ?? null
  }
}

function enabledIndices(): number[] {
  const indices: number[] = []
  props.items.forEach((item, i) => {
    if (!item.disabled) indices.push(i)
  })
  return indices
}

function step(from: number, delta: number): number {
  const enabled = enabledIndices()
  if (enabled.length === 0) return from
  const pos = enabled.indexOf(from)
  const nextPos =
    pos === -1
      ? delta > 0
        ? 0
        : enabled.length - 1
      : (pos + delta + enabled.length) % enabled.length
  return enabled[nextPos]
}

function onItemKeydown(event: KeyboardEvent, index: number) {
  const forwardKey = props.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  const backwardKey = props.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
  const enabled = enabledIndices()
  let nextIndex: number | undefined
  if (event.key === forwardKey) nextIndex = step(index, 1)
  else if (event.key === backwardKey) nextIndex = step(index, -1)
  else if (event.key === 'Home') nextIndex = enabled[0]
  else if (event.key === 'End') nextIndex = enabled[enabled.length - 1]
  else return
  if (nextIndex === undefined || nextIndex === index) return
  event.preventDefault()
  activeIndex.value = nextIndex
  itemButtons[nextIndex]?.focus()
}

function onItemSelect(item: DockItemData, index: number) {
  if (item.disabled) return
  activeIndex.value = index
  item.onSelect?.()
  emit('select', item, index)
}

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.dock,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-dock',
    props.orientation === 'vertical' && 'ui-dock--vertical',
    props.grow && 'ui-dock--grow',
    props.disabled && 'ui-dock--disabled',
  ),
)
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-dock-item'))

defineExpose({
  /** Root element. */
  el: rootEl,
  /** The item buttons, in order, to animate yourself (with `:magnify="false"` to turn the built-in magnification off). */
  itemEls: () => itemButtons.filter((el): el is HTMLButtonElement => !!el),
  /** Re-measures item positions for magnification, after a layout change the dock can't detect. */
  remeasure,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
