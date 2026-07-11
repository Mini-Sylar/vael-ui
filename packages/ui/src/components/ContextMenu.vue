<template>
  <span
    ref="wrapper"
    class="ui-context-menu-trigger"
    @contextmenu="onContextMenu"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="clearPress"
    @pointercancel="clearPress"
  >
    <slot :open="open" />
  </span>
  <span ref="anchor" class="ui-context-menu-anchor" aria-hidden="true" />
  <Menu
    ref="menuInstance"
    v-model:open="open"
    :items="items"
    :trigger-el="anchorEl"
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
    v-bind="$attrs"
    @select="(item) => emit('select', item)"
    @open-change="(value, details) => emit('open-change', value, details)"
  >
    <template v-if="$slots.item" #item="{ item }">
      <slot name="item" :item="item" />
    </template>
  </Menu>
</template>

<script lang="ts">
import type { MenuAlign, MenuEntry, MenuItemData, MenuSide } from './Menu.vue'
import type { UiPartValue } from '../classes'

export type ContextMenuSide = MenuSide
export type ContextMenuAlign = MenuAlign

export interface ContextMenuProps<T extends MenuItemData = MenuItemData> {
  /** Data-driven rows — same shape as Menu.vue's `items`. */
  items?: ReadonlyArray<MenuEntry<T>>
  /** Suppresses both the right-click and long-press triggers entirely. */
  disabled?: boolean
  /** Long-press (touch) as an additional trigger alongside the native `contextmenu` event. */
  longPress?: boolean
  /** Hold duration, in ms, before a touch press opens the menu. */
  longPressDelay?: number
  /** Which corner of the cursor point the panel expands from. Default: top-left corner. */
  side?: ContextMenuSide
  align?: ContextMenuAlign
  sideOffset?: number
  alignOffset?: number
  closeOnEsc?: boolean
  closeOnOutside?: boolean
  beforeClose?: (done: () => void) => void
  /** When true, presence is v-show-driven and owned by the consumer (e.g. AnimatePresence). */
  forceMount?: boolean
  /** CSS selector or an actual DOM element — same contract as Vue's own Teleport `to`. */
  teleportTo?: string | HTMLElement
  /** Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more. */
  scrollFade?: boolean
  ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<!--
  Wraps Menu (no custom popover/keyboard logic). Point-anchor solved with real
  zero-size DOM node instead of virtual element (Menu.vue not modified).
  Reopening moves anchor, then closes/reopens to recompute position.
-->
<script setup lang="ts" generic="T extends MenuItemData = MenuItemData">
import { computed, nextTick, onScopeDispose, useTemplateRef } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import Menu from './Menu.vue'
import type { PopoverOpenChangeDetails } from '../composables/usePopover'
import { useThemedUi } from '../theme'

defineOptions({ inheritAttrs: false })

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<ContextMenuProps<T>>(), {
  disabled: false,
  longPress: true,
  longPressDelay: 500,
  // Same defaults as Menu's own bottom/start — but here that reads as "the
  // panel's top-left corner is pinned to the cursor, expanding down-right,"
  // the universal native context-menu layout. sideOffset is much smaller
  // than Menu's own 8px default: the anchor IS the cursor, not a button with
  // its own footprint to clear.
  side: 'bottom',
  align: 'start',
  sideOffset: 2,
  alignOffset: 0,
  closeOnEsc: true,
  closeOnOutside: true,
  forceMount: false,
  teleportTo: 'body',
  scrollFade: true,
})

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  select: [item: T]
}>()

defineSlots<{
  /** Arbitrary wrapped content — a card, a table row, an image. Right-click (or long-press on touch) opens the menu; ordinary interaction with it is untouched. */
  default(props: { open: boolean }): unknown
  /** Override one data-driven row's content while keeping its behavior. */
  item(props: { item: T }): unknown
}>()

const wrapperEl = useTemplateRef<HTMLElement>('wrapper')
const anchorEl = useTemplateRef<HTMLElement>('anchor')
const menuRef = useTemplateRef<ComponentExposed<typeof Menu>>('menuInstance')

function setAnchorPosition(x: number, y: number) {
  const el = anchorEl.value
  if (!el) return
  el.style.left = `${x}px`
  el.style.top = `${y}px`
}

async function openAt(x: number, y: number) {
  setAnchorPosition(x, y)
  if (open.value) {
    open.value = false
    await nextTick()
  }
  open.value = true
}

function onContextMenu(event: MouseEvent) {
  if (props.disabled) return
  event.preventDefault()
  openAt(event.clientX, event.clientY)
}

// Long-press (touch only): pointerdown + timer, cancelled by movement (scroll/drag detection).
const LONG_PRESS_MOVE_TOLERANCE = 10
let pressTimer: ReturnType<typeof setTimeout> | undefined
let pressStart: { x: number; y: number } | null = null

function clearPress() {
  clearTimeout(pressTimer)
  pressTimer = undefined
  pressStart = null
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || !props.longPress || event.pointerType !== 'touch') return
  clearPress()
  pressStart = { x: event.clientX, y: event.clientY }
  const { clientX, clientY } = event
  pressTimer = setTimeout(() => {
    pressStart = null
    openAt(clientX, clientY)
  }, props.longPressDelay)
}

function onPointerMove(event: PointerEvent) {
  if (!pressStart) return
  const dx = event.clientX - pressStart.x
  const dy = event.clientY - pressStart.y
  if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE) clearPress()
}

onScopeDispose(() => clearTimeout(pressTimer))

const themedUi = useThemedUi(
  (theme) => theme.contextMenu,
  () => props.ui,
)

defineExpose({
  wrapperEl,
  anchorEl,
  panelEl: computed(() => menuRef.value?.panelEl ?? null),
  positionerEl: computed(() => menuRef.value?.positionerEl ?? null),
  listEl: computed(() => menuRef.value?.listEl ?? null),
  isClosing: computed(() => menuRef.value?.isClosing ?? false),
  /** Opens the menu at an explicit viewport point — e.g. from a custom "⋮" button instead of a right-click. */
  openAt,
  close: () => menuRef.value?.close(),
  cancelClose: () => menuRef.value?.cancelClose(),
})
</script>
