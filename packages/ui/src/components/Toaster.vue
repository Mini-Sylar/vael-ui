<template>
  <Teleport :to="teleportTo">
    <TransitionGroup
      :ref="registerToaster"
      name="ui-toast"
      tag="ol"
      class="ui-toaster"
      :class="`ui-toaster--${position}`"
      :style="rootStyle"
      :css="motionCss"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      :data-expanded="expanded"
      :data-y-position="yPos"
      :data-x-position="xPos"
      :data-ui-theme="themeScope"
      @pointerenter="onToasterEnter"
      @pointerleave="onToasterLeave"
      @enter="enterHook"
      @leave="leaveHook"
    >
      <li
        v-for="(entry, index) in visible"
        :key="entry.id"
        :ref="(el) => registerCard(entry.id, el as Element | null)"
        class="ui-toast"
        :class="`ui-toast--${entry.variant}`"
        :style="cardStyle(entry.id, index)"
        :data-front="depthOf(entry.id) === 0"
        :data-expanded="expanded"
        :data-swiping="swipeState[entry.id]?.swiping ?? false"
        :data-swipe-out="swipeState[entry.id]?.swipeOut ?? false"
        :data-swipe-direction="swipeState[entry.id]?.direction ?? undefined"
        :data-y-position="yPos"
        @pointerdown="onPointerDown(entry.id, $event)"
        @pointermove="onPointerMove(entry.id, $event)"
        @pointerup="onPointerUp(entry.id)"
        @pointercancel="onPointerUp(entry.id)"
      >
        <slot
          :entry="entry"
          :dismiss="() => dismiss(entry.id)"
          :depth="depthOf(entry.id)"
          :expanded="expanded"
        >
          <span class="ui-toast-icon" aria-hidden="true">
            <StatusIcon :variant="entry.variant" />
          </span>
          <div class="ui-toast-content">
            <p class="ui-toast-title">{{ entry.title }}</p>
            <p v-if="entry.description" class="ui-toast-description">{{ entry.description }}</p>
          </div>
          <button
            v-if="entry.action"
            type="button"
            class="ui-toast-action"
            @click="onActionClick(entry)"
          >
            {{ entry.action.label }}
          </button>
          <button
            type="button"
            class="ui-toast-close"
            :aria-label="messages.toast.dismiss"
            @click="dismiss(entry.id)"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </slot>
      </li>
    </TransitionGroup>
  </Teleport>
</template>

<script lang="ts">
export type ToasterPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
</script>

<script setup lang="ts">
import { computed, inject, reactive, ref, watch } from 'vue'
import { useDocumentVisibility } from '@vueuse/core'
import { useToastQueue } from '../composables/useToast'
import type { ToastEntry } from '../composables/useToast'
import { useUiMessages } from '../messages'
import { themeScopeKey } from '../theme'
import StatusIcon from './internal/StatusIcon.vue'

// Port of vue-sonner's swipe-to-dismiss mechanics; constants are Sonner's.
const SWIPE_THRESHOLD = 45 // px
const SWIPE_VELOCITY_THRESHOLD = 0.11 // px/ms
const SWIPE_EXIT_MS = 200

const props = withDefaults(
  defineProps<{
    position?: ToasterPosition
    /** Max toasts shown at once; extras queue until visible slots free. */
    maxVisible?: number
    /** Spacing between stacked cards, px. */
    gap?: number
    teleportTo?: string
    /** `false` delegates enter/leave animations to `@card-enter`/`@card-leave` events. */
    motionCss?: boolean
  }>(),
  { position: 'bottom-right', maxVisible: 4, gap: 10, teleportTo: 'body', motionCss: true },
)

const emit = defineEmits<{
  'card-enter': [el: Element, done: () => void]
  'card-leave': [el: Element, done: () => void]
}>()

const enterHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('card-enter', el, done),
)
const leaveHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('card-leave', el, done),
)

defineSlots<{
  /** Replaces a card's entire inner markup. The library still owns the <li> itself (position/stacking/swipe). */
  default(props: {
    entry: ToastEntry
    dismiss: () => void
    depth: number
    expanded: boolean
  }): unknown
}>()

const { toasts, dismiss, pauseAll, resumeAll } = useToastQueue()
const messages = useUiMessages()

// Extracted to bypass oxfmt removing semicolon from multi-statement @click expression.
function onActionClick(entry: ToastEntry) {
  entry.action!.onClick()
  dismiss(entry.id)
}
const themeScope = inject(themeScopeKey, undefined)
const toasterEl = ref<HTMLElement | null>(null)
function registerToaster(el: Element | { $el?: unknown } | null) {
  if (el instanceof HTMLElement) {
    toasterEl.value = el
  } else if (el && '$el' in el && el.$el instanceof HTMLElement) {
    toasterEl.value = el.$el
  }
}

const visible = computed(() => toasts.slice(-props.maxVisible))
const isBottom = computed(() => props.position.startsWith('bottom'))
const yPos = computed(() => props.position.split('-')[0])
const xPos = computed(() => props.position.split('-')[1])

// Track heights with ResizeObserver to detect post-mount reflows and webfont loads.
const heights = reactive<Record<number, number>>({})
const resizeObservers = new Map<number, ResizeObserver>()

function registerCard(id: number, el: Element | null) {
  if (!(el instanceof HTMLElement)) return
  if (resizeObservers.has(id)) return
  const observer = new ResizeObserver(([entry]) => {
    const h = entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight
    if (h > 0) heights[id] = h
  })
  observer.observe(el)
  resizeObservers.set(id, observer)
}

function depthOf(id: number) {
  const i = visible.value.findIndex((t) => t.id === id)
  return i === -1 ? 0 : visible.value.length - 1 - i
}

// Position:absolute cards collapse parent; set explicit height to catch pointerleave.
const toasterHeight = computed(() => {
  if (visible.value.length === 0) return 0
  if (expanded.value) {
    return visible.value.reduce((sum, t) => sum + (heights[t.id] ?? 56) + props.gap, -props.gap)
  }
  const front = visible.value[visible.value.length - 1]
  return front ? (heights[front.id] ?? 56) : 0
})

// Inlined for structural correctness (position:fixed needs explicit inset); themeable via CSS variables.
const rootStyle = computed(() => {
  const offset = 'var(--ui-toast-offset, 1rem)'
  const style: Record<string, string> = {
    position: 'fixed',
    zIndex: 'var(--ui-z-toast, 60)',
    blockSize: `${toasterHeight.value}px`,
    [isBottom.value ? 'insetBlockEnd' : 'insetBlockStart']: offset,
  }
  if (xPos.value === 'center') {
    style.insetInlineStart = '50%'
    style.translate = '-50% 0'
  } else {
    style[xPos.value === 'left' ? 'insetInlineStart' : 'insetInlineEnd'] = offset
  }
  return style
})

function offsetOf(id: number) {
  const i = visible.value.findIndex((t) => t.id === id)
  if (i === -1) return 0
  let offset = 0
  for (let j = i + 1; j < visible.value.length; j++) {
    offset += (heights[visible.value[j].id] ?? 56) + props.gap
  }
  return offset
}

const expanded = ref(false)
function onToasterEnter() {
  expanded.value = true
  pauseAll()
}
function onToasterLeave() {
  if (activeSwipeId.value != null) return
  expanded.value = false
  resumeAll()
}

function cardStyle(id: number, index: number) {
  const depth = Math.min(depthOf(id), 3)
  const sign = isBottom.value ? -1 : 1
  // Collapsed: fixed lift per depth (peek only); expanded: cumulative height.
  const offsetPx = expanded.value ? offsetOf(id) : depth * props.gap
  const stackY = sign * offsetPx
  const swipeX = swipeState[id]?.x ?? 0
  const swipeY = swipeState[id]?.y ?? 0
  const style: Record<string, string | number> = {
    [isBottom.value ? 'insetBlockEnd' : 'insetBlockStart']: '0',
    zIndex: index,
    // Structural: use translate (independent property) to compose with CSS-driven enter/exit transform.
    position: 'absolute',
    insetInline: '0',
    touchAction: 'none',
    translate: `${swipeX}px ${stackY + swipeY}px`,
    '--toast-scale': expanded.value ? 1 : 1 - depth * 0.045,
    '--toast-opacity': expanded.value || depth === 0 ? 1 : 1 - depth * 0.3,
  }
  return style
}

interface SwipeState {
  x: number
  y: number
  swiping: boolean
  swipeOut: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
}
const swipeState = reactive<Record<number, SwipeState>>({})
const pointerStart = new Map<number, { x: number; y: number; time: number }>()
const swipeAxis = new Map<number, 'x' | 'y' | null>()
const activeSwipeId = ref<number | null>(null)

function allowedDirections(): Array<'left' | 'right' | 'up' | 'down'> {
  return ['left', 'right', isBottom.value ? 'down' : 'up']
}
function dampen(delta: number) {
  return delta / (1.5 + Math.abs(delta) / 20)
}

function state(id: number): SwipeState {
  return (swipeState[id] ??= { x: 0, y: 0, swiping: false, swipeOut: false, direction: null })
}

function onPointerDown(id: number, event: PointerEvent) {
  if (event.button === 2) return
  const target = event.target as HTMLElement
  if (target.closest('button')) return // avoid swipe from close/action button.
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  pointerStart.set(id, { x: event.clientX, y: event.clientY, time: performance.now() })
  swipeAxis.set(id, null)
  activeSwipeId.value = id
}

function onPointerMove(id: number, event: PointerEvent) {
  const start = pointerStart.get(id)
  if (!start) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  let axis = swipeAxis.get(id)
  if (!axis && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    swipeAxis.set(id, axis)
  }
  if (!axis) return

  const s = state(id)
  const allowed = allowedDirections()
  if (axis === 'y') {
    const wantsDown = dy > 0
    s.y =
      (wantsDown && allowed.includes('down')) || (!wantsDown && allowed.includes('up'))
        ? dy
        : dampen(dy)
    s.x = 0
  } else {
    const wantsRight = dx > 0
    s.x =
      (wantsRight && allowed.includes('right')) || (!wantsRight && allowed.includes('left'))
        ? dx
        : dampen(dx)
    s.y = 0
  }
  s.swiping = true
}

function onPointerUp(id: number) {
  const start = pointerStart.get(id)
  const axis = swipeAxis.get(id)
  pointerStart.delete(id)
  swipeAxis.delete(id)
  activeSwipeId.value = null
  const s = swipeState[id]
  if (!start || !s) return

  const delta = axis === 'x' ? s.x : s.y
  const elapsed = Math.max(1, performance.now() - start.time)
  const velocity = Math.abs(delta) / elapsed

  if (axis && (Math.abs(delta) >= SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD)) {
    s.swiping = false
    s.swipeOut = true
    s.direction = axis === 'x' ? (delta > 0 ? 'right' : 'left') : delta > 0 ? 'down' : 'up'
    setTimeout(() => dismiss(id), SWIPE_EXIT_MS)
  } else {
    s.swiping = false
    s.x = 0
    s.y = 0
  }
  if (!expanded.value) resumeAll()
}

watch(
  () => toasts.map((t) => t.id),
  (ids) => {
    const live = new Set(ids)
    for (const key of Object.keys(heights)) {
      if (!live.has(Number(key))) delete heights[Number(key)]
    }
    for (const key of Object.keys(swipeState)) {
      if (!live.has(Number(key))) delete swipeState[Number(key)]
    }
    for (const [id, observer] of resizeObservers) {
      if (!live.has(id)) {
        observer.disconnect()
        resizeObservers.delete(id)
      }
    }
  },
) // Clean up heights/swipe state/observers when toasts leave the queue.

// Pause timers when tab is hidden; useToastQueue tracks remaining time.
const visibility = useDocumentVisibility()
watch(visibility, (visibilityState) => (visibilityState === 'hidden' ? pauseAll() : resumeAll()))

defineExpose({ toasterEl })
</script>
