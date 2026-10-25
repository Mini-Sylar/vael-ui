<template>
  <span
    v-if="$slots.trigger"
    ref="triggerWrapper"
    class="ui-menu-trigger"
    @click="toggle"
    @keydown="onTriggerKeydown"
  >
    <slot name="trigger" :open="open" />
  </span>
  <Teleport :to="teleportTo">
    <Transition
      name="ui-menu"
      appear
      v-bind="motionHooks"
      :css="!forceMount && motionTransition.css !== false"
    >
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
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelMaxHeightStyle, panelPart.style]"
          :data-level="level"
          data-ui-presence
          v-bind="panelAttrs"
        >
          <div v-if="$slots.header" :class="headerPart.class" :style="headerPart.style">
            <slot name="header" />
          </div>
          <div
            ref="list"
            :id="menuId"
            role="menu"
            :aria-label="ownLabel"
            :aria-labelledby="ownLabel ? undefined : labelledBy"
            class="ui-menu-body"
            v-scroll-mask="scrollFade"
            :data-virtual="virtualActive || undefined"
            :tabindex="virtualActive ? -1 : undefined"
            :style="virtualListStyle"
            @keydown="onListKeydown"
            @focusin="onListFocusin"
          >
            <div
              ref="indicatorEl"
              class="ui-indicator ui-menu-indicator"
              :style="indicatorStyle"
              aria-hidden="true"
            />
            <!-- Custom slot ignores `items` — consumer owns the markup. -->
            <slot
              v-if="$slots.default"
              :close="close"
              :open="open"
              :isClosing="isClosing"
              :cancelClose="cancelClose"
              :panelEl="panelEl"
              :placement="placement"
              :maxHeight="maxHeight"
            />
            <template v-else>
              <div
                v-if="virtualActive"
                class="ui-menu-spacer"
                role="none"
                :style="{ blockSize: `${topSpacerHeight}px` }"
              />
              <template v-for="{ entry, i } in renderedEntries" :key="i">
                <div
                  v-if="isSeparator(entry)"
                  :ref="virtualActive ? rowRef(i) : undefined"
                  role="separator"
                  class="ui-menu-separator"
                />
                <component
                  :is="nativeTag(tagOf(entry))"
                  v-else
                  :type="tagOf(entry) === 'button' ? 'button' : undefined"
                  :role="isCheckable(entry) ? 'menuitemcheckbox' : 'menuitem'"
                  :aria-checked="isCheckable(entry) ? entry.checked : undefined"
                  class="ui-menu-item"
                  :class="{ 'ui-menu-item--danger': entry.danger }"
                  :disabled="tagOf(entry) === 'button' ? entry.disabled : undefined"
                  :aria-disabled="
                    tagOf(entry) !== 'button' ? entry.disabled || undefined : undefined
                  "
                  :data-menu-index="i"
                  :data-keep-open="entry.keepOpen ? '' : undefined"
                  :aria-haspopup="entry.items ? 'menu' : undefined"
                  :aria-expanded="entry.items ? !!submenuOpen[i] : undefined"
                  :ref="rowRef(i)"
                  @mouseenter="entry.items ? onRowMouseEnter(i, entry.disabled) : undefined"
                  @mouseleave="entry.items ? onRowMouseLeave(i) : undefined"
                  v-bind="entry.attrs"
                >
                  <slot name="item" :item="entry">
                    <span v-if="entry.icon" :class="iconPart.class" :style="iconPart.style">
                      <component :is="entry.icon" />
                    </span>
                    <span class="ui-menu-item-label">{{ entry.label }}</span>
                    <span v-if="entry.shortcut" class="ui-menu-item-shortcut">
                      {{ entry.shortcut }}
                    </span>
                    <span
                      v-if="entry.items"
                      :class="chevronPart.class"
                      :style="chevronPart.style"
                      aria-hidden="true"
                    >
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
                  <!-- Outside the slot: a custom row still shows its checked state. -->
                  <!-- No `appear`: only a check on a row already showing draws in (shared/tick.css). -->
                  <Transition name="ui-tick">
                    <span
                      v-if="isCheckable(entry) && entry.checked"
                      class="ui-menu-item-check ui-tick"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                        <path
                          d="M3.5 8.5l3 3 6-7"
                          pathLength="1"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </span>
                  </Transition>
                </component>
              </template>
              <div
                v-if="virtualActive"
                class="ui-menu-spacer"
                role="none"
                :style="{ blockSize: `${bottomSpacerHeight}px` }"
              />
              <!-- Mounted on first open only, so a long list doesn't build a closed Menu per branch row.
                   Teleported to ancestor to stay in same DOM subtree for outside-click detection.
                   #item is forwarded through `relayItemSlot` so a custom row keeps applying at
                   every nesting depth instead of reverting to the default row past level one. -->
              <template v-for="i in mountedSubmenus" :key="`submenu-${i}`">
                <MenuSelf
                  v-if="submenuItems(i) && positionerEl"
                  :items="submenuItems(i)"
                  :trigger-el="rowEls[i]"
                  v-model:open="submenuOpen[i]"
                  :open-path="revealedRow === i ? openPath?.slice(1) : undefined"
                  :side="submenuSide()"
                  align="start"
                  :teleport-to="positionerEl"
                  :ui="props.ui"
                  @select="(item) => onDescendantSelect(item, i)"
                  @collapse="() => collapseSubmenu(i)"
                  @active="(value) => onChildActive(i, value)"
                  @mouseenter="onSubmenuPanelMouseEnter(i)"
                  @mouseleave="onSubmenuPanelMouseLeave(i)"
                >
                  <template v-if="$slots.item" #item="{ item: nestedItem }">
                    <component :is="relayItemSlot" :item="nestedItem as T" />
                  </template>
                </MenuSelf>
              </template>
            </template>
          </div>
          <div v-if="$slots.footer" :class="footerPart.class" :style="footerPart.style">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { Component, InjectionKey } from 'vue'
import type { Side } from '@floating-ui/dom'
import type { Align } from '../../composables/useFloatingPosition'
import type { UiPartValue } from '../../classes'

/** @internal How deep a Menu sits: 1 for the top level, 2 for its submenus, and so on. */
const menuLevelKey: InjectionKey<number> = Symbol('ui-menu-level')

export type MenuSide = Side
export type MenuAlign = Align

/** A non-interactive divider row in `items`. */
export interface MenuSeparator {
  type: 'separator'
}

/**
 * One action row in a data-driven `items` array. You can extend it with your own fields: Menu is
 * generic over the item type, so `@select` returns the whole object with those fields intact.
 */
export interface MenuItemData {
  type?: 'item'
  label: string
  /** Row identity for `@select`; falls back to `label` when omitted. */
  value?: string
  /** Leading icon: any component, sized to a 1em box. For richer content, use the `#item` slot. */
  icon?: Component
  /** Trailing hint, e.g. a keyboard shortcut. */
  shortcut?: string
  disabled?: boolean
  /** Renders the row in the danger color, for destructive actions such as Delete or Remove. */
  danger?: boolean
  /** Runs the handlers but leaves the menu open, for toggles and multi-select. */
  keepOpen?: boolean
  /** Makes the row a checkbox toggle, checked when `true`; Menu doesn't flip it, so update it in `@select`. */
  checked?: boolean
  /** Per-item handler; the `@select` event fires alongside it. */
  onSelect?: () => void
  /**
   * Nested rows; the row becomes a submenu trigger that opens on hover intent, click, Enter/Space or
   * ArrowRight (ArrowLeft right to left, where the submenu opens to the left). Nested levels don't support custom item types. In MenuList, the row becomes an inert
   * group label with its `items` rendered beneath it (see the `isGroup` prop of the `#item` slot).
   */
  items?: ReadonlyArray<MenuEntry<MenuItemData>>
  /** Row tag: `'button'`, or `'a'`/`'RouterLink'` for a real link (same `as`/`attrs` convention as BreadcrumbItem). Ignored when `items` is set. */
  as?: string
  /** Forwarded onto the rendered element, e.g. `{ href }` or `{ to }`. */
  attrs?: Record<string, unknown>
}

export type MenuEntry<T extends MenuItemData = MenuItemData> = T | MenuSeparator

/** Anything a template ref can resolve to: a plain element, or a component exposing `.el` (Button's convention). */
type TriggerRef = HTMLElement | { el: HTMLElement | null } | null | undefined

export interface MenuProps<T extends MenuItemData = MenuItemData> {
  /** Data-driven rows. Ignored when the default slot renders custom markup instead. */
  items?: ReadonlyArray<MenuEntry<T>>
  /** External ref for a trigger that can't live in the `#trigger` slot. */
  triggerEl?: TriggerRef
  /** Which side of the trigger the panel opens on. @default 'bottom' */
  side?: MenuSide
  /** How the panel aligns against the trigger along that side. @default 'start' */
  align?: MenuAlign
  /** Gap between the trigger and the panel, in pixels. @default 8 */
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
   * How it moves: `false` for instantly, `{ spring }` to retime the built-in motion, your own
   * `initial` and `exit` for the panel, or `targets` for the rows (`select: '.ui-menu-item'`).
   * Unset, it follows the nearest ConfigProvider's style.
   */
  motion?: MenuMotion
  /** Teleport target: a CSS selector or element. @default 'body' */
  teleportTo?: string | HTMLElement
  /**
   * Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more.
   * @default true
   */
  scrollFade?: boolean
  /** Caps the panel's height in pixels; the item list scrolls past it. Unset, only the viewport limits it. */
  maxPanelHeight?: number
  /**
   * Row path to reveal on open, as each row's `value` (or `label`): every submenu along it opens and
   * its last row takes focus instead of the first, e.g. to show the current selection.
   */
  openPath?: readonly string[]
  /** Class and style overrides for each part. */
  ui?: Partial<{
    positioner: UiPartValue
    panel: UiPartValue
    header: UiPartValue
    footer: UiPartValue
    /** The icon at the start of an item. */
    icon: UiPartValue
    /** The chevron at the end of an item that opens a submenu. */
    chevron: UiPartValue
  }>
}
</script>

<script setup lang="ts" generic="T extends MenuItemData = MenuItemData">
import type { PopoverCloseReason } from '../../composables/usePopover'
import type { BeforeClose, MenuMotion } from '../../motion/types'
import './Menu.css'
import '../shared/tick.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  provide,
  reactive,
  shallowReactive,
  shallowRef,
  useAttrs,
  useId,
  useSlots,
  useTemplateRef,
  watch,
  watchEffect,
} from 'vue'
import { omitAttrs, useAttrListeners } from '../../composables/forwardedListeners'
import type { VNodeChild } from 'vue'
import { useMutationObserver } from '@vueuse/core'
import { createSlotRelay } from '../../composables/useSlotRelay'
// Explicit self-import for the recursive submenu (see the template). `<Menu>` by name relies on
// `resolveComponent('Menu', true)`, which returns the bare string — not the component — inside a
// Vapor render, so the submenu renders as a stray `<menu>` element with its props dropped. The
// circular import resolves fine: the default export is defined by instantiation time, long after
// this module finishes evaluating.
import MenuSelf from './Menu.vue'
import {
  isRtl,
  resolvePastDisplayContents,
  nativeTag,
  useSlotPresence,
} from '../../composables/dom'
import { usePopover } from '../../composables/usePopover'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useMenu } from '../../composables/useMenu'
import { useVirtualizer } from '../../composables/useVirtualizer'
import { useComponentMotion } from '../../motion/useComponentMotion'
import { whenPlaced } from '../../composables/useSelectPanelMotion'
import { useHoverIndicator } from '../../composables/useHoverIndicator'
import '../shared/indicator.css'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'

defineOptions({ inheritAttrs: false })

/** Whether the menu is open. @default false */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<MenuProps<T>>(), {
  // 'start', not centered—menus align to trigger edge, not centered under it.
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
  alignOffset: 0,
  closeOnEsc: true,
  closeOnOutside: true,
  forceMount: false,
  teleportTo: 'body',
  scrollFade: true,
  motion: undefined,
})

const emit = defineEmits<{
  /** Fires before the menu closes, with the reason; `details.cancel()` keeps it open. */
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  /** Fires when a data-driven row is activated, including rows in submenus. */
  select: [item: T]
  /** Fires on ArrowLeft inside the menu (ArrowRight right to left); a parent menu uses it to close this submenu. */
  collapse: []
  /** Fires when the pointer enters or leaves any submenu row or panel in this subtree; a parent menu uses it to stay open. */
  active: [value: boolean]
}>()

defineSlots<{
  /** Trigger markup. Menu wires the click and anchors the panel to it, so render only the button. */
  trigger(props: { open: boolean }): unknown
  /** Content above the item list, outside its scroll region; it stays put while `items` scrolls. */
  header(): unknown
  /** Override one data-driven row's content while keeping its behavior. */
  item(props: { item: T }): unknown
  /** Fully custom menu content. Render your own `role="menuitem"` markup; Menu ignores `items`. */
  default(props: {
    close: () => void
    open: boolean
    isClosing: boolean
    cancelClose: () => void
    panelEl: HTMLElement | null
    placement: string
    /** Live panel height budget in pixels, or `null` when unconstrained. Size your own scroll region
     * against it, as the built-in item list does. */
    maxHeight: number | null
  }): unknown
  /** Content below the item list, outside its scroll region; it stays put while `items` scrolls. */
  footer(): unknown
}>()

const slots = useSlots()
const hasSlot = useSlotPresence(slots)

// Renders the consumer's own #item slot for a nested submenu row. Captured from THIS instance
// here, so forwarding it into the child <Menu> (see the template) can't turn into a self-call —
// a bare `<slot name="item">` there re-resolves against the submenu under the Vapor compiler.
const relayItemSlot = createSlotRelay<{ item: T }>(
  (relayProps) => slots.item?.(relayProps) as VNodeChild,
  ['item'],
)

function isSeparator(entry: MenuEntry<T>): entry is MenuSeparator {
  return (entry as MenuSeparator).type === 'separator'
}

function isCheckable(entry: MenuItemData): boolean {
  return entry.checked !== undefined && !entry.items
}

// A row with nested `items` is a submenu trigger — always a button,
// regardless of `as` (expand-on-activate, not navigate-on-activate).
function tagOf(entry: MenuItemData): string {
  return entry.items ? 'button' : (entry.as ?? 'button')
}

function unwrapEl(el: unknown): HTMLElement | null {
  if (!el) return null
  if (el instanceof HTMLElement) return el
  if (typeof el === 'object' && 'el' in el) return (el as { el: HTMLElement | null }).el ?? null
  return null
}

const triggerWrapper = useTemplateRef<HTMLElement>('triggerWrapper')
// External triggerEl prop overrides slot-based trigger. `.ui-menu-trigger` is `display: contents` (see Menu.css), so it has a zero rect — resolve past it to the real trigger element, or floating-ui anchors the panel at (0,0).
// `getComputedStyle()` inside that resolution isn't reactivity-tracked, so a MutationObserver re-runs it whenever the wrapper's content changes, instead of locking onto whatever mounted first.
const resolvedTriggerEl = shallowRef<HTMLElement | null>(null)
function refreshResolvedTrigger() {
  resolvedTriggerEl.value = triggerWrapper.value
    ? resolvePastDisplayContents(triggerWrapper.value)
    : null
}
watch(triggerWrapper, refreshResolvedTrigger, { immediate: true, flush: 'post' })
useMutationObserver(triggerWrapper, refreshResolvedTrigger, { childList: true, subtree: true })

const triggerElRef = computed<HTMLElement | null>(() =>
  props.triggerEl !== undefined ? unwrapEl(props.triggerEl) : resolvedTriggerEl.value,
)

function openMenu() {
  open.value = true
}
// Close honors beforeClose; open() does not (nothing to defer).
function toggle() {
  open.value = !open.value
}

// Which end of the list takes focus once the panel is ready (ARIA menu button: ArrowUp -> last).
let focusOnReady: 'first' | 'last' = 'first'
function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  // A consumer trigger (e.g. CascadeSelect) may handle it, and a vertical composite (toolbar)
  // uses Up/Down to move between its own items.
  if (event.defaultPrevented) return
  if ((event.currentTarget as HTMLElement).closest('[aria-orientation="vertical"]')) return
  event.preventDefault()
  focusOnReady = event.key === 'ArrowUp' ? 'last' : 'first'
  if (open.value) focusEdge()
  else open.value = true
}

const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
// A submenu opens toward the end of the line: to the left, right to left.
const submenuSide = (): MenuSide => (isRtl(panelEl.value) ? 'left' : 'right')
const attrs = useAttrs()
// Your `aria-label` names the menu itself, not the panel around it.
const ownLabel = computed(() => attrs['aria-label'] as string | undefined)
const panelAttrs = useAttrListeners(
  () => panelEl.value,
  () => omitAttrs(attrs, ['aria-label']),
)
const listEl = useTemplateRef<HTMLElement>('list')
const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
// The hover and keyboard highlight slides between rows; a submenu's rows have their own.
const { style: indicatorStyle } = useHoverIndicator(listEl, {
  itemSelector: '.ui-menu-item',
  scope: '.ui-menu-body',
  scroller: true,
  indicatorEl,
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.menu,
  () => props.ui,
)
// Re-apply theme scope on Teleported node since it breaks CSS custom-property inheritance.
const themeScope = inject(themeScopeKey, undefined)
// Each level's panel carries `data-level`, so CSS can style one level, like a second menu.
const level = inject(menuLevelKey, 0) + 1
provide(menuLevelKey, level)

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
  tabIntoPanel: true,
  triggerEl: triggerElRef,
  positionerEl,
  side: () => props.side,
  align: () => props.align,
  sideOffset: () => props.sideOffset,
  alignOffset: () => props.alignOffset,
  closeOnEsc: () => props.closeOnEsc,
  closeOnOutside: () => props.closeOnOutside,
  beforeClose: () => props.beforeClose,
  maxHeightCap: () => props.maxPanelHeight,
  onOpenChange: (value, details) => emit('open-change', value, details),
})

const motion = useComponentMotion({
  name: 'Menu',
  role: 'overlay',
  key: 'menu',
  mainPart: 'panel',
  parts: () => ({ positioner: positionerEl.value, panel: panelEl.value }),
  root: () => panelEl.value,
  motion: () => props.motion,
  // The built-in look as data: it opens from a touch further than it closes to, scaling from the
  // trigger via the panel's own transform-origin, on the enter tokens. forceMount leaves it to you.
  defaults: () => ({ panel: { opacity: 0, scale: '0.97' } }),
  exitDefaults: () => ({ panel: { opacity: 0, scale: '0.99' } }),
  timing: () => ({ duration: 'var(--ui-duration-enter)', easing: 'var(--ui-ease-out)' }),
  owns: () => !props.forceMount,
  trigger: () => triggerElRef.value,
  ready: () => whenPlaced(() => positionerStyle.value.visibility === 'visible'),
})
const { phase } = motion
const motionTransition = motion.transition
const motionHooks = computed(() => {
  const { css: _css, ...hooks } = motionTransition.value
  return {
    ...hooks,
    onBeforeEnter: (el: Element) => {
      hooks.onBeforeEnter?.(el)
      phase.value = 'entering'
    },
    onAfterEnter: () => (phase.value = 'entered'),
    onBeforeLeave: () => (phase.value = 'leaving'),
    onAfterLeave: () => (phase.value = 'left'),
  }
})

// Same shared-layer-stack stacking as Popover.vue/Dialog.vue - see Popover's own comment.
const zIndex = computed(() => `calc(var(--ui-z-dialog, 50) + ${Math.max(0, layerIndex())})`)

const rowEls = reactive<Record<number, HTMLElement | null>>({})
const submenuOpen = reactive<Record<number, boolean>>({})
// Rows whose submenu has opened; kept mounted after closing so the exit runs.
const mountedSubmenus = shallowReactive(new Set<number>())

function openSubmenu(i: number) {
  mountedSubmenus.add(i)
  submenuOpen[i] = true
}

function submenuItems(i: number): ReadonlyArray<MenuEntry<MenuItemData>> | undefined {
  const entry = props.items?.[i]
  return entry && !isSeparator(entry) ? entry.items : undefined
}

function setRowEl(i: number, el: unknown) {
  rowEls[i] = el instanceof HTMLElement ? el : null
}

// Stable ref callbacks: an inline arrow makes Vue call it with null, then the element, every update.
const rowRefs = new Map<number, (el: unknown) => void>()
function rowRef(i: number) {
  let fn = rowRefs.get(i)
  if (!fn) {
    fn = (el) => {
      setRowEl(i, el)
      virtualizer.measureRow(i, el instanceof HTMLElement ? el : null)
    }
    rowRefs.set(i, fn)
  }
  return fn
}

const rowHovered: Record<number, boolean> = {}
const panelHovered: Record<number, boolean> = {}
// Tracks descendant hover to keep ancestors alive during pointer descent.
const childActive: Record<number, boolean> = {}
const closeTimers: Record<number, ReturnType<typeof setTimeout> | undefined> = {}
let openTimer: ReturnType<typeof setTimeout> | undefined

function closeAllSubmenusExcept(except?: number) {
  for (const key of Object.keys(submenuOpen)) {
    const index = Number(key)
    if (index === except) continue
    submenuOpen[index] = false
    rowHovered[index] = false
    panelHovered[index] = false
    childActive[index] = false
    clearTimeout(closeTimers[index])
  }
}

const HOVER_OPEN_DELAY = 150
const HOVER_CLOSE_DELAY = 200

// Row & panel are not siblings (teleported). Only close if neither is hovered AND no descendant is active.
function scheduleClose(i: number) {
  clearTimeout(closeTimers[i])
  closeTimers[i] = setTimeout(() => {
    if (!rowHovered[i] && !panelHovered[i] && !childActive[i]) submenuOpen[i] = false
  }, HOVER_CLOSE_DELAY)
}

// Report own subtree's hover status to parent (debounce happens in scheduleClose, not here).
let reportedActive = false
function updateActive() {
  const value =
    Object.values(rowHovered).some(Boolean) ||
    Object.values(panelHovered).some(Boolean) ||
    Object.values(childActive).some(Boolean)
  if (value === reportedActive) return
  reportedActive = value
  emit('active', value)
}

// Debounce open to avoid flickering on pointer pass-through.
function onRowMouseEnter(i: number, disabled?: boolean) {
  if (disabled) return
  rowHovered[i] = true
  clearTimeout(closeTimers[i])
  clearTimeout(openTimer)
  openTimer = setTimeout(() => {
    closeAllSubmenusExcept(i)
    openSubmenu(i)
  }, HOVER_OPEN_DELAY)
  updateActive()
}
function onRowMouseLeave(i: number) {
  rowHovered[i] = false
  clearTimeout(openTimer)
  scheduleClose(i)
  updateActive()
}
// Submenu's panel receives these via fallthrough attrs (inheritAttrs:false).
function onSubmenuPanelMouseEnter(i: number) {
  panelHovered[i] = true
  clearTimeout(closeTimers[i])
  updateActive()
}
function onSubmenuPanelMouseLeave(i: number) {
  panelHovered[i] = false
  scheduleClose(i)
  updateActive()
}
// Descendant's active report keeps this level and ancestors alive.
function onChildActive(i: number, value: boolean) {
  childActive[i] = value
  if (value) clearTimeout(closeTimers[i])
  else scheduleClose(i)
  updateActive()
}

// Use focusItem not bare .focus() to keep parent's roving tabindex correct.
function collapseSubmenu(i: number) {
  submenuOpen[i] = false
  rowHovered[i] = false
  panelHovered[i] = false
  childActive[i] = false
  clearTimeout(closeTimers[i])
  focusItem(rowEls[i] ?? undefined)
}

// Select bubbles and closes whole chain unless keepOpen set (native menu behavior).
function onDescendantSelect(item: MenuItemData, i: number) {
  emit('select', item as T)
  if (!item.keepOpen) {
    submenuOpen[i] = false
    rowHovered[i] = false
    panelHovered[i] = false
    childActive[i] = false
    clearTimeout(closeTimers[i])
    close()
  }
}

const { onKeydown, focusFirst, focusItem } = useMenu({
  listEl,
  onSelect: (itemEl) => {
    // Data-driven rows carry index; custom-slot rows don't—but both flow here for close policy.
    const indexAttr = itemEl.dataset.menuIndex
    if (indexAttr !== undefined) {
      const entry = props.items?.[Number(indexAttr)]
      if (entry && !isSeparator(entry)) {
        emit('select', entry)
        entry.onSelect?.()
      }
    }
    if (itemEl.dataset.keepOpen === undefined) close()
  },
  onExpand: (itemEl) => {
    const indexAttr = itemEl.dataset.menuIndex
    if (indexAttr === undefined) return
    const i = Number(indexAttr)
    clearTimeout(openTimer)
    clearTimeout(closeTimers[i])
    closeAllSubmenusExcept(i)
    openSubmenu(i)
    // Submenu's own focusFirst watcher handles focus (same mechanism as every Menu).
  },
  onCollapse: () => emit('collapse'),
})

// Set the popup state on the slot's trigger, preferring a root that is itself the control.
const TRIGGER_SELECTOR = 'button, [role="button"], [role="combobox"], a[href]'
const menuId = useId()
const triggerId = useId()
const labelledBy = shallowRef<string>()
watchEffect(() => {
  const root = resolvedTriggerEl.value
  // A marked control wins over buttons placed before it, like CascadeSelect's `#start`.
  const marked = triggerWrapper.value?.querySelector<HTMLElement>('[data-menu-trigger]')
  const trigger = root?.matches(TRIGGER_SELECTOR)
    ? root
    : (marked ?? triggerWrapper.value?.querySelector<HTMLElement>(TRIGGER_SELECTOR) ?? root)
  // The menu is named by what opens it: the trigger, a `triggerEl`, or a submenu's row.
  // One hidden from screen readers (ContextMenu's anchor) can't name it.
  const shown = props.triggerEl !== undefined ? triggerElRef.value : trigger
  const label = shown?.getAttribute('aria-hidden') === 'true' ? undefined : shown
  if (label && !label.id) label.id = triggerId
  labelledBy.value = label?.id || undefined
  if (!trigger) return
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', String(open.value))
  if (open.value) trigger.setAttribute('aria-controls', menuId)
  else trigger.removeAttribute('aria-controls')
})

// Row whose submenu `openPath` opened; only that submenu inherits the rest of the path, so a
// later hover/keyboard open of any submenu starts at its first row as usual.
const revealedRow = shallowRef<number | null>(null)
watch(
  () => revealedRow.value != null && !!submenuOpen[revealedRow.value],
  (stillOpen) => {
    if (!stillOpen) revealedRow.value = null
  },
)

function revealOpenPath(): boolean {
  const [head, ...rest] = props.openPath ?? []
  if (head === undefined || !props.items) return false
  const i = props.items.findIndex(
    (entry) => !isSeparator(entry) && !entry.disabled && (entry.value ?? entry.label) === head,
  )
  if (i < 0) return false
  const reveal = (row: HTMLElement) => {
    focusItem(row)
    if (rest.length > 0 && (props.items![i] as MenuItemData).items) {
      closeAllSubmenusExcept(i)
      revealedRow.value = i
      openSubmenu(i)
    }
  }
  const row = rowEls[i]
  if (row) {
    reveal(row)
    return true
  }
  // A long list may not have rendered that row yet.
  if (!virtualActive.value) return false
  virtualizer.scrollToIndex(i, 'center')
  void nextTick(() => {
    const rendered = rowEls[i]
    if (rendered) reveal(rendered)
    else focusEdge()
  })
  return true
}

// Gate focus on visibility:hidden resolution (floating-ui's async computePosition).
watch(
  () => open.value && positionerStyle.value.visibility === 'visible',
  (ready) => {
    if (ready) nextTick(() => focusHeaderField() || revealOpenPath() || focusEdge())
  },
)

// A field in the header that asks for focus, such as CascadeSelect's search box, gets it on open
// instead of the first row. Internal: set by vael-ui's own components, not a public contract.
function focusHeaderField(): boolean {
  const field = panelEl.value?.querySelector<HTMLElement>('[data-menu-autofocus]')
  field?.focus()
  return !!field
}

function focusEdge() {
  const edge = focusOnReady
  focusOnReady = 'first'
  if (edge === 'first') return focusFirst()
  if (virtualActive.value) return focusIndex(stepEnabled(props.items!.length, -1))
  const rows = listEl.value?.querySelectorAll<HTMLElement>(
    ':is([role="menuitem"], [role="menuitemcheckbox"]):not(:disabled):not([aria-disabled="true"])',
  )
  focusItem(rows?.[rows.length - 1])
}

// Long data-driven lists render only the rows in view, between two spacers.
const VIRTUALIZE_THRESHOLD = 100
const ROW_ESTIMATE = 36
const virtualActive = computed(
  () => !hasSlot('default') && (props.items?.length ?? 0) > VIRTUALIZE_THRESHOLD,
)
const virtualizer = useVirtualizer({
  containerEl: listEl,
  count: () => (virtualActive.value ? props.items!.length : 0),
  dynamic: () => virtualActive.value,
  estimateSize: ROW_ESTIMATE,
})
const renderedEntries = computed(() => {
  const items = props.items ?? []
  if (!virtualActive.value) return items.map((entry, i) => ({ entry, i }))
  return virtualizer.items.value.map(({ index }) => ({ entry: items[index]!, i: index }))
})
const topSpacerHeight = computed(() => virtualizer.items.value[0]?.start ?? 0)
const bottomSpacerHeight = computed(() => {
  const rows = virtualizer.items.value
  const last = rows[rows.length - 1]
  return last ? Math.max(0, virtualizer.totalSize.value - (last.start + last.size)) : 0
})

// The panel takes the width of the widest row rendered so far, so it never narrows mid-scroll.
const lockedWidth = shallowRef(0)
watch(
  virtualizer.items,
  () => {
    const width = virtualActive.value ? (listEl.value?.offsetWidth ?? 0) : 0
    if (width > lockedWidth.value) lockedWidth.value = width
  },
  { flush: 'post' },
)
watch(open, (value) => {
  if (!value) lockedWidth.value = 0
})
// {} not undefined: undefined clears the whole style attribute, dropping v-scroll-mask's vars.
const virtualListStyle = computed(() =>
  virtualActive.value && lockedWidth.value
    ? { minInlineSize: `${lockedWidth.value}px`, boxSizing: 'border-box' as const }
    : {},
)

// Keyboard moves span the whole list, not only the rendered rows.
let activeIndex = -1
function onListFocusin(event: FocusEvent) {
  const index = (event.target as HTMLElement).dataset?.menuIndex
  if (index !== undefined) activeIndex = Number(index)
}
function isEnabledIndex(i: number): boolean {
  const entry = props.items?.[i]
  return !!entry && !isSeparator(entry) && !entry.disabled
}
function stepEnabled(from: number, delta: 1 | -1): number | undefined {
  const count = props.items?.length ?? 0
  for (let step = 1; step <= count; step++) {
    const i = (((from + delta * step) % count) + count) % count
    if (isEnabledIndex(i)) return i
  }
  return undefined
}
function focusIndex(i: number | undefined) {
  if (i === undefined) return
  activeIndex = i
  virtualizer.scrollToIndex(i)
  void nextTick(() => focusItem(rowEls[i] ?? undefined))
}

const TYPEAHEAD_RESET_MS = 500
let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(typeaheadTimer))

function onVirtualKeydown(event: KeyboardEvent): boolean {
  const count = props.items!.length
  const focused = document.activeElement as HTMLElement | null
  const onRow = !!focused && focused !== listEl.value && !!listEl.value?.contains(focused)
  const current = onRow ? Number(focused!.dataset.menuIndex ?? activeIndex) : activeIndex
  let target: number | undefined
  switch (event.key) {
    case 'ArrowDown':
      target = stepEnabled(current, 1)
      break
    case 'ArrowUp':
      target = stepEnabled(current === -1 ? 0 : current, -1)
      break
    case 'Home':
      target = stepEnabled(-1, 1)
      break
    case 'End':
      target = stepEnabled(count, -1)
      break
    case ' ':
      return false
    default: {
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return false
      typeahead += event.key.toLowerCase()
      clearTimeout(typeaheadTimer)
      typeaheadTimer = setTimeout(() => {
        typeahead = ''
      }, TYPEAHEAD_RESET_MS)
      const start = current === -1 ? 0 : current + 1
      for (let step = 0; step < count && target === undefined; step++) {
        const i = (start + step) % count
        const entry = props.items![i]!
        if (isEnabledIndex(i) && (entry as MenuItemData).label.toLowerCase().startsWith(typeahead))
          target = i
      }
      if (target === undefined) return true
    }
  }
  event.preventDefault()
  focusIndex(target)
  return true
}
function onListKeydown(event: KeyboardEvent) {
  if (virtualActive.value && onVirtualKeydown(event)) return
  onKeydown(event)
}

// Before a scroll unmounts the focused row, focus moves to the list and its submenu closes.
watch(
  virtualizer.items,
  (rows) => {
    if (!virtualActive.value || rows.length === 0) return
    const first = rows[0]!.index
    const last = rows[rows.length - 1]!.index
    const inView = (i: number) => i >= first && i <= last
    const focused = document.activeElement
    if (!inView(activeIndex) && focused === rowEls[activeIndex]) {
      listEl.value?.focus({ preventScroll: true })
    }
    for (const key of Object.keys(submenuOpen)) {
      const i = Number(key)
      if (submenuOpen[i] && !inView(i)) {
        submenuOpen[i] = false
        rowHovered[i] = false
        panelHovered[i] = false
        childActive[i] = false
      }
    }
  },
  { flush: 'pre' },
)

// Until floating-ui reports a height, the viewport bounds the list so it doesn't render every row.
const panelMaxHeightStyle = computed(() => {
  if (maxHeight.value != null) return { maxHeight: `${maxHeight.value}px` }
  return virtualActive.value ? { maxHeight: '100vh' } : {}
})

const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-menu-positioner'),
)
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-menu-panel'))
const headerPart = computed(() => resolveUiPart(cx, themedUi()?.header, 'ui-menu-header'))
const footerPart = computed(() => resolveUiPart(cx, themedUi()?.footer, 'ui-menu-footer'))
const iconPart = computed(() => resolveUiPart(cx, themedUi()?.icon, 'ui-menu-item-icon'))
const chevronPart = computed(() => resolveUiPart(cx, themedUi()?.chevron, 'ui-menu-item-chevron'))

// Resolved placement after floating-ui flips (e.g., "top" becomes "bottom" if no room).
const resolvedSide = computed(() => placement.value.split('-')[0] as MenuSide)
const resolvedAlign = computed<MenuAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

defineExpose({
  /** Panel element (null while closed). */
  panelEl,
  /** Positioning wrapper around the panel (null while closed). */
  positionerEl,
  /** Item list element (null while closed). */
  listEl,
  /** The hover and keyboard highlight, sliding between rows (null while closed). Under a ConfigProvider with `motion: false` it moves at once, for your own animation. */
  highlightEl: indicatorEl,
  /** Resolved placement after flipping, e.g. `'bottom-start'`. */
  placement,
  /** Inline positioning style applied to the positioner. */
  positionerStyle,
  /** `true` while a `beforeClose` close is pending. */
  isClosing,
  /** Opens the menu. */
  open: openMenu,
  /** Opens or closes the menu. */
  toggle,
  /** Closes the menu, running `@open-change` and `beforeClose` first. */
  close,
  /** Cancels a close pending in `beforeClose` and keeps the menu open. */
  cancelClose,
})
</script>
