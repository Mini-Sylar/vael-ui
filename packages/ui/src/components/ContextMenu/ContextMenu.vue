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
    :motion="motion"
    :teleport-to="teleportTo"
    :scroll-fade="scrollFade"
    :ui="{
      positioner: themedUi()?.positioner,
      panel: themedUi()?.panel,
      header: themedUi()?.header,
      footer: themedUi()?.footer,
    }"
    v-bind="$attrs"
    @select="(item) => emit('select', item)"
    @open-change="(value, details) => emit('open-change', value, details)"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots.item" #item="{ item }">
      <slot name="item" :item="item" />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Menu>
</template>

<script lang="ts">
import type { MenuAlign, MenuEntry, MenuItemData, MenuSide } from '../Menu/Menu.vue'
import type { UiPartValue } from '../../classes'

export type ContextMenuSide = MenuSide
export type ContextMenuAlign = MenuAlign

export interface ContextMenuProps<T extends MenuItemData = MenuItemData> {
  /** Data-driven rows, in the same shape as Menu's `items`. */
  items?: ReadonlyArray<MenuEntry<T>>
  /** Disables both the right-click and long-press triggers. @default false */
  disabled?: boolean
  /** Adds a touch long-press trigger alongside the native `contextmenu` event. @default true */
  longPress?: boolean
  /** How long you hold a touch press, in ms, before the menu opens. @default 500 */
  longPressDelay?: number
  /** Which side of the cursor point the panel opens on. @default 'bottom' */
  side?: ContextMenuSide
  /** How the panel aligns against the cursor point along that side. @default 'start' */
  align?: ContextMenuAlign
  /** Gap between the cursor point and the panel, in pixels. @default 2 */
  sideOffset?: number
  /** Shifts the panel along the alignment axis, in pixels. @default 0 */
  alignOffset?: number
  /** Escape key closes the panel. @default true */
  closeOnEsc?: boolean
  /** Clicking outside the panel closes it. @default true */
  closeOnOutside?: boolean
  /** Runs before the menu closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. The menu stays open while the promise is pending. */
  beforeClose?: BeforeClose<PopoverCloseReason>
  /** Keeps it mounted while closed, toggled with `v-show`, so its content keeps its state. vael-ui then leaves its motion to you. @default false */
  forceMount?: boolean
  /**
   * How the menu moves, like Menu's. `false` opens and closes it at once. An object moves it your
   * way: values for the `panel` part, `{ spring }`, or `enter` / `leave` hooks. Unset, it follows
   * the nearest ConfigProvider's style.
   */
  motion?: MenuMotion
  /** Teleport target: a CSS selector or element. @default 'body' */
  teleportTo?: string | HTMLElement
  /**
   * Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more.
   * @default true
   */
  scrollFade?: boolean
  /** Class and style overrides for each part. */
  ui?: Partial<{
    positioner: UiPartValue
    panel: UiPartValue
    header: UiPartValue
    footer: UiPartValue
  }>
}
</script>

<!--
  Wraps Menu (no custom popover/keyboard logic). Point-anchor solved with real
  zero-size DOM node instead of virtual element (Menu.vue not modified).
  Reopening moves anchor, then closes/reopens to recompute position.
-->
<script setup lang="ts" generic="T extends MenuItemData = MenuItemData">
import type { PopoverCloseReason } from '../../composables/usePopover'
import type { BeforeClose, MenuMotion } from '../../motion/types'
import './ContextMenu.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, nextTick, onScopeDispose, useTemplateRef, watch } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import Menu from '../Menu/Menu.vue'
import { focusTargetIn } from '../../composables/dom'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

/** Whether the menu is open. @default false */
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
  motion: undefined,
  teleportTo: 'body',
  scrollFade: true,
})

const emit = defineEmits<{
  /** Fires before the menu closes, with the reason; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  /** Fires when a data-driven row is activated, including rows in submenus. */
  select: [item: T]
}>()

defineSlots<{
  /** Wrapped content, such as a card, row or image. Right-clicking it, or long-pressing it on touch, opens the menu. */
  default(props: { open: boolean }): unknown
  /** Forwarded to Menu's own `#header`. */
  header(): unknown
  /** Override one data-driven row's content while keeping its behavior. */
  item(props: { item: T }): unknown
  /** Forwarded to Menu's own `#footer`. */
  footer(): unknown
}>()

const wrapperEl = useTemplateRef<HTMLElement>('wrapper')
const anchorEl = useTemplateRef<HTMLElement>('anchor')
const menuRef = useTemplateRef<ComponentExposed<typeof Menu>>('menuInstance')

function setAnchorPosition(x: number, y: number) {
  const el = anchorEl.value
  if (!el) return
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  // A transformed or filtered ancestor turns `fixed` into
  // "relative to that ancestor", so correct by wherever the anchor really landed.
  const rect = el.getBoundingClientRect()
  if (rect.left !== x) el.style.left = `${2 * x - rect.left}px`
  if (rect.top !== y) el.style.top = `${2 * y - rect.top}px`
}

// Closing returns focus to what had it, else to what was right-clicked, never to the page.
let returnTo: HTMLElement | null = null
let openPanel: HTMLElement | null = null
function rememberFocus(target: EventTarget | null) {
  const active = document.activeElement
  if (openPanel?.contains(active)) return
  if (active instanceof HTMLElement && active !== document.body) returnTo = active
  else returnTo = target instanceof Element ? focusableFrom(target) : null
}
// The nearest focusable ancestor, else the nearest element with a box (focused with tabindex -1).
function focusableFrom(target: Element): HTMLElement | null {
  let boxed: HTMLElement | null = null
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (!(el instanceof HTMLElement) || el === document.body) continue
    if (focusTargetIn(el) === el) return el
    if (!boxed && el.getClientRects().length > 0) boxed = el
  }
  return boxed
}
function restoreFocus() {
  // Reopened at a new point: keep the target for the real close.
  if (open.value) return
  const target = returnTo
  const panel = openPanel
  returnTo = openPanel = null
  const active = document.activeElement
  if (!target?.isConnected || (active && active !== document.body && !panel?.contains(active)))
    return
  if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1')
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
  }
  target.focus({ preventScroll: true })
}
watch(
  open,
  (value) => {
    if (value) openPanel = menuRef.value?.positionerEl ?? null
    // After Menu's own restore, which can't reach the zero-size anchor it opened from.
    else nextTick(restoreFocus)
  },
  { flush: 'post' },
)

function openAt(x: number, y: number) {
  rememberFocus(null)
  return show(x, y)
}

async function show(x: number, y: number) {
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
  rememberFocus(event.target)
  show(event.clientX, event.clientY)
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
  const { clientX, clientY, target } = event
  pressTimer = setTimeout(() => {
    pressStart = null
    rememberFocus(target)
    show(clientX, clientY)
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
  /** Element wrapping the default slot; listens for right-click and long-press. */
  wrapperEl,
  /** Zero-size element placed at the open point; the panel anchors to it. */
  anchorEl,
  /** Panel element (null while closed). */
  panelEl: computed(() => menuRef.value?.panelEl ?? null),
  /** Positioning wrapper around the panel (null while closed). */
  positionerEl: computed(() => menuRef.value?.positionerEl ?? null),
  /** Item list element (null while closed). */
  listEl: computed(() => menuRef.value?.listEl ?? null),
  /** `true` while a `beforeClose` close is pending. */
  isClosing: computed(() => menuRef.value?.isClosing ?? false),
  /** Opens the menu at a viewport point, for example from a custom "⋮" button instead of a right-click. */
  openAt,
  /** Closes the menu, running `@open-change` and `beforeClose` first. */
  close: () => menuRef.value?.close(),
  /** Cancels a close pending in `beforeClose` and keeps the menu open. */
  cancelClose: () => menuRef.value?.cancelClose(),
})
</script>
