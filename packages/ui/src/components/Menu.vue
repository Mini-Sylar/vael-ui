<template>
  <span v-if="$slots.trigger" ref="triggerWrapper" class="ui-menu-trigger" @click="toggle">
    <slot name="trigger" :open="open" />
  </span>
  <Teleport :to="teleportTo">
    <Transition name="ui-menu" :css="!forceMount">
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
          :style="[{ transformOrigin }, panelPart.style]"
          v-bind="$attrs"
        >
          <div
            ref="list"
            role="menu"
            class="ui-menu-body"
            :style="bodyStyle"
            v-scroll-mask="scrollFade"
            @keydown="onKeydown"
          >
            <!-- Custom slot ignores `items` — consumer owns the markup. -->
            <slot
              v-if="$slots.default"
              :close="close"
              :open="open"
              :isClosing="isClosing"
              :cancelClose="cancelClose"
              :panelEl="panelEl"
              :placement="placement"
            />
            <template v-else v-for="(entry, i) in items" :key="i">
              <div v-if="isSeparator(entry)" role="separator" class="ui-menu-separator" />
              <template v-else>
                <button
                  type="button"
                  role="menuitem"
                  class="ui-menu-item"
                  :class="{ 'ui-menu-item--danger': entry.danger }"
                  :disabled="entry.disabled"
                  :data-menu-index="i"
                  :data-keep-open="entry.keepOpen ? '' : undefined"
                  :aria-haspopup="entry.items ? 'menu' : undefined"
                  :aria-expanded="entry.items ? !!submenuOpen[i] : undefined"
                  :ref="(el) => setRowEl(i, el)"
                  @mouseenter="entry.items ? onRowMouseEnter(i, entry.disabled) : undefined"
                  @mouseleave="entry.items ? onRowMouseLeave(i) : undefined"
                >
                  <slot name="item" :item="entry">
                    <span v-if="entry.icon" class="ui-menu-item-icon">
                      <component :is="entry.icon" />
                    </span>
                    <span class="ui-menu-item-label">{{ entry.label }}</span>
                    <span v-if="entry.shortcut" class="ui-menu-item-shortcut">
                      {{ entry.shortcut }}
                    </span>
                    <span v-if="entry.items" class="ui-menu-item-chevron" aria-hidden="true"
                      >›</span
                    >
                  </slot>
                </button>
                <!-- Teleported to ancestor to stay in same DOM subtree for outside-click detection. -->
                <Menu
                  v-if="entry.items && positionerEl"
                  :items="entry.items"
                  :trigger-el="rowEls[i]"
                  v-model:open="submenuOpen[i]"
                  side="right"
                  align="start"
                  :teleport-to="positionerEl"
                  @select="(item) => onDescendantSelect(item, i)"
                  @collapse="() => collapseSubmenu(i)"
                  @active="(value) => onChildActive(i, value)"
                  @mouseenter="onSubmenuPanelMouseEnter(i)"
                  @mouseleave="onSubmenuPanelMouseLeave(i)"
                />
              </template>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { Component } from 'vue'
import type { Side } from '@floating-ui/dom'
import type { Align } from '../composables/useFloatingPosition'
import type { UiPartValue } from '../classes'

export type MenuSide = Side
export type MenuAlign = Align

/** A non-interactive divider row in `items`. */
export interface MenuSeparator {
  type: 'separator'
}

/**
 * One action row in a data-driven `items` array. Extend it with your own
 * fields — Menu is generic over the item type, so `@select` hands the whole
 * object back with those fields intact.
 */
export interface MenuItemData {
  type?: 'item'
  label: string
  /** Identity for `@select` consumers; falls back to `label` if omitted. */
  value?: string
  /** Leading icon — any component (1em box). Omit and use the `#item` slot for richer content. */
  icon?: Component
  /** Trailing hint, e.g. a keyboard shortcut. */
  shortcut?: string
  disabled?: boolean
  /** Renders in the danger color — destructive actions (Delete, Remove). */
  danger?: boolean
  /** Activates and runs handlers but leaves the menu open — toggles, multi-select. */
  keepOpen?: boolean
  /** Per-item handler; the `@select` event fires alongside it. */
  onSelect?: () => void
  /**
   * Nested rows render as submenu triggers (opens on hover-intent, click,
   * Enter/Space, or ArrowRight). Custom item types are not available at
   * nested levels.
   */
  items?: ReadonlyArray<MenuEntry<MenuItemData>>
}

export type MenuEntry<T extends MenuItemData = MenuItemData> = T | MenuSeparator

/** Anything a template ref can resolve to — a plain element, or a component exposing `.el` (Button's convention). */
type TriggerRef = HTMLElement | { el: HTMLElement | null } | null | undefined

export interface MenuProps<T extends MenuItemData = MenuItemData> {
  /** Data-driven rows. Ignored when the default slot renders custom markup instead. */
  items?: ReadonlyArray<MenuEntry<T>>
  /** External ref for a trigger that can't live in the #trigger slot. */
  triggerEl?: TriggerRef
  /** Which side of the trigger the panel opens on. */
  side?: MenuSide
  /** How the panel aligns against the trigger along that side. */
  align?: MenuAlign
  /** Gap between the trigger and the panel, in pixels. */
  sideOffset?: number
  /** Shifts the panel along the alignment axis, in pixels. */
  alignOffset?: number
  /** Escape key closes the panel. */
  closeOnEsc?: boolean
  /** Clicking outside the panel closes it. */
  closeOnOutside?: boolean
  /** Custom exit animation; call `done()` when it's complete. Delays the actual close/unmount until then. */
  beforeClose?: (done: () => void) => void
  /** When true, presence is v-show-driven and owned by the consumer (e.g. AnimatePresence). */
  forceMount?: boolean
  /** CSS selector or an actual DOM element — same contract as Vue's own Teleport `to`. */
  teleportTo?: string | HTMLElement
  /** Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more. */
  scrollFade?: boolean
  /** Per-instance part-class/style overrides. */
  ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<script setup lang="ts" generic="T extends MenuItemData = MenuItemData">
import { computed, inject, nextTick, reactive, useTemplateRef, watch, watchEffect } from 'vue'
import { usePopover } from '../composables/usePopover'
import type { PopoverOpenChangeDetails } from '../composables/usePopover'
import { useMenu } from '../composables/useMenu'
import { useClassMerge, resolveUiPart } from '../classes'
import { themeScopeKey, useThemedUi } from '../theme'
import { vScrollMask } from '../directives/vScrollMask'

defineOptions({ inheritAttrs: false })

/** Whether the menu is open. */
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
})

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  select: [item: T]
  collapse: []
  /** Whether any row/panel in subtree is under pointer (keeps parent alive during pointer transit). */
  active: [value: boolean]
}>()

defineSlots<{
  /** Co-located trigger markup — Menu wires the click and anchors to it; render just the button. */
  trigger(props: { open: boolean }): unknown
  /** Override one data-driven row's content while keeping its behavior. */
  item(props: { item: T }): unknown
  /** Fully custom menu content — render your own role="menuitem" markup; `items` is ignored. */
  default(props: {
    close: () => void
    open: boolean
    isClosing: boolean
    cancelClose: () => void
    panelEl: HTMLElement | null
    placement: string
  }): unknown
}>()

function isSeparator(entry: MenuEntry<T>): entry is MenuSeparator {
  return (entry as MenuSeparator).type === 'separator'
}

function unwrapEl(el: unknown): HTMLElement | null {
  if (!el) return null
  if (el instanceof HTMLElement) return el
  if (typeof el === 'object' && 'el' in el) return (el as { el: HTMLElement | null }).el ?? null
  return null
}

const triggerWrapper = useTemplateRef<HTMLElement>('triggerWrapper')
// External triggerEl prop overrides slot-based trigger.
const triggerElRef = computed<HTMLElement | null>(() =>
  props.triggerEl !== undefined ? unwrapEl(props.triggerEl) : (triggerWrapper.value ?? null),
)

function openMenu() {
  open.value = true
}
// Close honors beforeClose; open() does not (nothing to defer).
function toggle() {
  open.value = !open.value
}

const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')
const listEl = useTemplateRef<HTMLElement>('list')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.menu,
  () => props.ui,
)
// Re-apply theme scope on Teleported node since it breaks CSS custom-property inheritance.
const themeScope = inject(themeScopeKey, undefined)

const { positionerStyle, placement, transformOrigin, maxHeight, isClosing, close, cancelClose } =
  usePopover(open, {
    triggerEl: triggerElRef,
    positionerEl,
    side: () => props.side,
    align: () => props.align,
    sideOffset: () => props.sideOffset,
    alignOffset: () => props.alignOffset,
    closeOnEsc: () => props.closeOnEsc,
    closeOnOutside: () => props.closeOnOutside,
    beforeClose: () => props.beforeClose,
    onOpenChange: (value, details) => emit('open-change', value, details),
  })

const rowEls = reactive<Record<number, HTMLElement | null>>({})
const submenuOpen = reactive<Record<number, boolean>>({})

function setRowEl(i: number, el: unknown) {
  rowEls[i] = el instanceof HTMLElement ? el : null
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
    submenuOpen[i] = true
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
    submenuOpen[i] = true
    // Submenu's own focusFirst watcher handles focus (same mechanism as every Menu).
  },
  onCollapse: () => emit('collapse'),
})

// Set aria-haspopup/aria-expanded on focusable element inside slot wrapper.
watchEffect(() => {
  const trigger =
    triggerWrapper.value?.querySelector<HTMLElement>('button, [role="button"], a[href]') ??
    (triggerWrapper.value?.firstElementChild as HTMLElement | null)
  if (!trigger) return
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', String(open.value))
})

// Gate focus on visibility:hidden resolution (floating-ui's async computePosition).
watch(
  () => open.value && positionerStyle.value.visibility === 'visible',
  (ready) => {
    if (ready) nextTick(() => focusFirst())
  },
)

// Apply maxHeight to body, not panel, so v-scroll-mask transparency works correctly.
const bodyStyle = computed(() =>
  maxHeight.value != null ? { maxHeight: `${maxHeight.value}px`, overflowY: 'auto' as const } : {},
)

const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-menu-positioner'),
)
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-menu-panel'))

// Resolved placement after floating-ui flips (e.g., "top" becomes "bottom" if no room).
const resolvedSide = computed(() => placement.value.split('-')[0] as MenuSide)
const resolvedAlign = computed<MenuAlign>(() => {
  const align = placement.value.split('-')[1]
  return align === 'start' || align === 'end' ? align : 'center'
})

defineExpose({
  panelEl,
  positionerEl,
  listEl,
  placement,
  positionerStyle,
  isClosing,
  open: openMenu,
  toggle,
  close,
  cancelClose,
})
</script>
