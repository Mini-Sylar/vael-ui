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
      @keydown="onKeydown"
    >
      <TransitionGroup name="ui-speed-dial-action">
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
import type { UiPartValue } from '../classes'

export type SpeedDialDirection = 'up' | 'down' | 'left' | 'right' | 'quarter-circle'
export type SpeedDialTriggerMode = 'click' | 'hover'

// Field names mirror Menu's MenuItemData (label/icon/value/disabled/onSelect) to allow shared item arrays.
export interface SpeedDialItem {
  label: string
  /** Any component (1em box) — SpeedDial renders it inside an icon-only Button. */
  icon?: Component
  value?: string
  disabled?: boolean
  onSelect?: () => void
}

export interface SpeedDialProps {
  items: ReadonlyArray<SpeedDialItem>
  direction?: SpeedDialDirection
  /** `hover` only activates on real hover-capable pointers; click always works too. */
  openOn?: SpeedDialTriggerMode
  disabled?: boolean
  /** Selecting an action closes the dial; `false` keeps it open. */
  closeOnSelect?: boolean
  /** Accessible name for both the trigger button and the action `role="menu"`. */
  ariaLabel?: string
  /** Arc radius (px) for `direction="quarter-circle"` — ignored otherwise. */
  radius?: number
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
<script setup lang="ts">
import { computed, nextTick, onMounted, onScopeDispose, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import Button from './Button/Button.vue'
import { useLayer } from '../composables/useLayerStack'
import { useMenu } from '../composables/useMenu'
import { useClassMerge, resolveUiPart } from '../classes'
import { useThemedUi } from '../theme'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<SpeedDialProps>(), {
  direction: 'up',
  openOn: 'click',
  disabled: false,
  closeOnSelect: true,
  ariaLabel: 'Actions',
  radius: 96,
})

const emit = defineEmits<{
  select: [item: SpeedDialItem]
}>()

defineSlots<{
  icon(props: { open: boolean }): unknown
  item(props: { item: SpeedDialItem; index: number }): unknown
}>()

const visibleItems = computed(() => (open.value ? props.items : []))

function orientationFor(direction: SpeedDialDirection): 'vertical' | 'horizontal' | undefined {
  if (direction === 'up' || direction === 'down') return 'vertical'
  if (direction === 'left' || direction === 'right') return 'horizontal'
  return undefined
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
function onTriggerClick() {
  toggleDial()
}

function selectItem(item: SpeedDialItem) {
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
const { onKeydown: onMenuKeydown, focusFirst } = useMenu({ listEl })

function onKeydown(event: KeyboardEvent) {
  onMenuKeydown(event)
}

// Focus first action on open (Menu pattern, minus floating-position gate).
watch(open, (value) => {
  if (value) nextTick(() => focusFirst())
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

defineExpose({ el: root, open: openDial, close: closeDial, toggle: toggleDial })
</script>
