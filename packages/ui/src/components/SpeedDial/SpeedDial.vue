<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-direction="direction"
    :data-state="open ? 'open' : 'closed'"
    @mouseenter="onRootMouseEnter"
    @mouseleave="onRootMouseLeave"
  >
    <div
      ref="listEl"
      :class="actionsPart.class"
      :style="actionsPart.style"
      role="menu"
      :aria-label="ariaLabel"
      :aria-orientation="orientationFor(direction)"
      :data-motion="motionCss ? undefined : 'off'"
      @keydown="onKeydown"
    >
      <TransitionGroup
        name="ui-speed-dial-action"
        :css="motionCss"
        @enter="enterHook"
        @leave="leaveHook"
      >
        <Button
          v-for="(item, i) in visibleItems"
          :key="item.value ?? item.label"
          type="button"
          variant="secondary"
          size="md"
          icon
          pill
          role="menuitem"
          :class="actionPart.class"
          :style="[actionPart.style, actionStyle(i)]"
          :disabled="item.disabled"
          :aria-label="item.label"
          @click="selectItem(item)"
        >
          <slot name="item" :item="item" :index="i">
            <component :is="item.icon" v-if="item.icon" />
          </slot>
        </Button>
      </TransitionGroup>
    </div>

    <Button
      ref="triggerRef"
      type="button"
      variant="primary"
      size="lg"
      icon
      pill
      :class="triggerPart.class"
      :style="triggerPart.style"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="ariaLabel"
      @click="onTriggerClick"
    >
      <span class="ui-speed-dial-trigger-icon" aria-hidden="true">
        <slot name="icon" :open="open">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path
              d="M8 2v12M2 8h12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </slot>
      </span>
    </Button>
  </div>
</template>

<script lang="ts">
import type { Component } from 'vue'
import type { UiPartValue } from '../../classes'

export type SpeedDialDirection = 'up' | 'down' | 'left' | 'right' | 'quarter-circle'
export type SpeedDialTriggerMode = 'click' | 'hover'

// Field names mirror Menu's MenuItemData (label/icon/value/disabled/onSelect) to allow shared item arrays.
export interface SpeedDialItem {
  label: string
  /** Any component, sized to a `1em` box. SpeedDial renders it inside an icon-only Button. */
  icon?: Component
  value?: string
  disabled?: boolean
  onSelect?: () => void
}

export interface SpeedDialProps<T extends SpeedDialItem = SpeedDialItem> {
  /** Actions to fan out, one icon button each. */
  items: ReadonlyArray<T>
  /**
   * Which way the actions fan out from the trigger. `'quarter-circle'` lays them on an arc of `radius`.
   * @default 'up'
   */
  direction?: SpeedDialDirection
  /** What opens the dial. `'hover'` only responds to hover-capable pointers; click always works too. @default 'click' */
  openOn?: SpeedDialTriggerMode
  /** Disables the trigger and blocks interaction. @default false */
  disabled?: boolean
  /** Closes the dial when you select an action; `false` keeps it open. @default true */
  closeOnSelect?: boolean
  /** Accessible name for both the trigger button and the action `role="menu"`. @default 'Actions' */
  ariaLabel?: string
  /** Arc radius in pixels. Only applies when `direction` is `'quarter-circle'`. @default 96 */
  radius?: number
  /** Plays the built-in fan-out and fan-in transition.
   * Set `false` to animate actions yourself via `@action-enter` and `@action-leave`.
   * @default true
   */
  motionCss?: boolean
  /** Class and style overrides for each part. */
  ui?: Partial<{ root: UiPartValue; trigger: UiPartValue; action: UiPartValue }>
}

export function quarterCirclePoint(
  index: number,
  total: number,
  radius: number,
): { x: number; y: number } {
  const t = total <= 1 ? 0 : index / (total - 1)
  const thetaRad = ((90 + t * 90) * Math.PI) / 180
  // Standard math axes (y-up) converted to screen axes (y-down) via the sin term's sign.
  return { x: Math.cos(thetaRad) * radius, y: -Math.sin(thetaRad) * radius }
}
</script>

<!--
  Real Button instances (icon + pill) for trigger and actions.
  No floating-ui: fixed-offset CSS translate + custom property.
  Reuses useLayer (topmost Escape) and useMenu (roving-tabindex/arrows).
  Outside-click/Escape hand-rolled (avoid usePopover's dead positioning code).
  Comments outside template to avoid DOM nodes in production.
-->
<script setup lang="ts" generic="T extends SpeedDialItem = SpeedDialItem">
import './SpeedDial.css'
import '../shared/tokens.css'
import { computed, nextTick, onMounted, onScopeDispose, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import Button from '../Button/Button.vue'
import { useLayer } from '../../composables/useLayerStack'
import { useMenu } from '../../composables/useMenu'
import { useClassMerge, resolveUiPart } from '../../classes'
import { useThemedUi } from '../../theme'

/** Whether the actions are shown. @default false */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<SpeedDialProps<T>>(), {
  direction: 'up',
  openOn: 'click',
  disabled: false,
  closeOnSelect: true,
  ariaLabel: 'Actions',
  radius: 96,
  motionCss: true,
})

const emit = defineEmits<{
  /** Fires when you click an action. */
  select: [item: T]
  /** Fires when an action's fan-out transition starts. Call `done()` when finished.
   * Only fires when `motionCss` is `false`. */
  'action-enter': [el: Element, done: () => void]
  /** Fires when an action's fan-in transition starts, as with `@action-enter`. */
  'action-leave': [el: Element, done: () => void]
}>()

defineSlots<{
  /** Replaces the trigger's plus icon. */
  icon(props: { open: boolean }): unknown
  /** Custom content for each action button. Unset, the button shows the item's `icon`. */
  item(props: { item: T; index: number }): unknown
}>()

const visibleItems = computed(() => (open.value ? props.items : []))

// Same shape as Toaster's own enterHook/leaveHook.
const enterHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('action-enter', el, done),
)
const leaveHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('action-leave', el, done),
)

function orientationFor(direction: SpeedDialDirection): 'vertical' | 'horizontal' | undefined {
  if (direction === 'up' || direction === 'down') return 'vertical'
  if (direction === 'left' || direction === 'right') return 'horizontal'
  // The arc runs both ways, so neither orientation is accurate.
  return undefined
}

// Items are ordered nearest-to-farthest from the trigger; +1 moves away from it.
// The quarter-circle arc runs from straight above the trigger round to its left.
const ARROW_STEPS: Record<SpeedDialDirection, Partial<Record<string, 1 | -1>>> = {
  up: { ArrowUp: 1, ArrowDown: -1 },
  down: { ArrowDown: 1, ArrowUp: -1 },
  left: { ArrowLeft: 1, ArrowRight: -1 },
  right: { ArrowRight: 1, ArrowLeft: -1 },
  'quarter-circle': { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 },
}

const STAGGER_STEP_MS = 40
function actionStyle(index: number): Record<string, string> {
  const style: Record<string, string> = { '--ui-speed-dial-action-index': String(index) }
  if (props.direction === 'quarter-circle') {
    const { x, y } = quarterCirclePoint(index, props.items.length, props.radius)
    style['--ui-speed-dial-x'] = `${x}px`
    style['--ui-speed-dial-y'] = `${y}px`
  }
  return style
}
// 40ms stagger step baked into style.css's transition-delay calc()
void STAGGER_STEP_MS

const root = useTemplateRef<HTMLElement>('root')
const listEl = useTemplateRef<HTMLElement>('listEl')
const triggerRef = useTemplateRef<InstanceType<typeof Button>>('triggerRef')

function focusTrigger() {
  triggerRef.value?.el?.focus()
}

// Set when a hover opened the dial and no pointer click on the trigger has landed since.
let openedByHover = false

function openDial() {
  if (props.disabled) return
  open.value = true
}
function closeDial() {
  open.value = false
}
function toggleDial() {
  if (props.disabled) return
  open.value = !open.value
}
function onTriggerClick(event: MouseEvent) {
  // With openOn="hover", reaching the trigger opens the dial just before the
  // natural click lands on it; that first pointer click keeps it open instead
  // of toggling it straight back shut. Keyboard clicks (detail 0) still toggle.
  if (open.value && openedByHover && event.detail > 0) {
    openedByHover = false
    return
  }
  toggleDial()
}

function selectItem(item: T) {
  if (item.disabled) return
  emit('select', item)
  item.onSelect?.()
  if (props.closeOnSelect) {
    // Return focus to trigger (like Menu); actions unmount after leave transition.
    closeDial()
    focusTrigger()
  }
}

// useMenu handles roving-tabindex/arrows; onSelect unwired (clicks via @click).
const { onKeydown: onMenuKeydown, focusFirst, focusItem } = useMenu({ listEl })

// Arrow keys follow the visual direction; useMenu's vertical-only mapping would
// send ArrowUp toward the trigger on an upward dial and ignore Left/Right.
function onKeydown(event: KeyboardEvent) {
  const step = ARROW_STEPS[props.direction][event.key]
  if (!step) {
    if (!event.key.startsWith('Arrow')) onMenuKeydown(event)
    return
  }
  const items = Array.from(
    listEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
  ).filter((el) => el.getAttribute('aria-disabled') !== 'true')
  if (items.length === 0) return
  event.preventDefault()
  const current = items.indexOf(document.activeElement as HTMLElement)
  const from = current === -1 ? (step > 0 ? -1 : 0) : current
  focusItem(items[(from + step + items.length) % items.length])
}

// Focus first action on open (Menu pattern, minus floating-position gate).
watch(open, (value) => {
  if (value) nextTick(() => focusFirst())
  else openedByHover = false
})

// useLayer ensures Escape applies only to topmost open layer.
const layer = useLayer()
watch(open, (value) => (value ? layer.push() : layer.pop()), { flush: 'post' })
onMounted(() => {
  if (open.value) layer.push()
})
onScopeDispose(() => layer.pop())

function isOutside(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false
  return !root.value?.contains(target)
}

useEventListener(
  () => (open.value ? document : undefined),
  'pointerdown',
  (event: PointerEvent) => {
    if (!layer.isTopmost()) return
    if (isOutside(event.target)) closeDial()
  },
  true,
)
useEventListener(
  () => (open.value ? document : undefined),
  'focusin',
  (event: FocusEvent) => {
    if (!layer.isTopmost()) return
    if (isOutside(event.target)) closeDial()
  },
  true,
)
useEventListener(
  () => (open.value ? document : undefined),
  'keydown',
  (event: KeyboardEvent) => {
    if (!layer.isTopmost()) return
    if (event.key !== 'Escape') return
    event.preventDefault()
    closeDial()
    focusTrigger()
  },
  true,
)

// Hover only on real hover-capable pointers (not touch synthetic mouseenter).
function canHoverOpen(): boolean {
  if (props.openOn !== 'hover' || props.disabled) return false
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}
const HOVER_CLOSE_DELAY = 200
let hoverCloseTimer: ReturnType<typeof setTimeout> | undefined
function onRootMouseEnter() {
  if (!canHoverOpen()) return
  clearTimeout(hoverCloseTimer)
  if (!open.value) openedByHover = true
  open.value = true
}
function onRootMouseLeave() {
  if (props.openOn !== 'hover') return
  clearTimeout(hoverCloseTimer)
  hoverCloseTimer = setTimeout(() => {
    open.value = false
  }, HOVER_CLOSE_DELAY)
}
onScopeDispose(() => clearTimeout(hoverCloseTimer))

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.speedDial,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-speed-dial', props.disabled && 'ui-speed-dial--disabled'),
)
const actionsPart = computed(() => resolveUiPart(cx, undefined, 'ui-speed-dial-actions'))
const triggerPart = computed(() => resolveUiPart(cx, themedUi()?.trigger, 'ui-speed-dial-trigger'))
const actionPart = computed(() => resolveUiPart(cx, themedUi()?.action, 'ui-speed-dial-action'))

defineExpose({
  /** Root element. */
  el: root,
  /** Action list element (`role="menu"`). */
  listEl,
  /** Shows the actions. No-op while `disabled`. */
  open: openDial,
  /** Hides the actions. */
  close: closeDial,
  /** Shows or hides the actions. No-op while `disabled`. */
  toggle: toggleDial,
})
</script>
