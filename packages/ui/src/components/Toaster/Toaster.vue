<template>
  <Teleport :to="teleportTo">
    <TransitionGroup
      :ref="registerToaster"
      name="ui-toast"
      tag="ol"
      :class="rootPart.class"
      :style="[rootStyle, rootPart.style]"
      v-bind="$attrs"
      :css="motionCss"
      role="region"
      aria-live="polite"
      :aria-label="messages.toaster.label"
      :data-expanded="expanded"
      :data-y-position="yPos"
      :data-x-position="xPos"
      :data-ui-theme="themeScope"
      @pointerenter="onToasterEnter"
      @pointerleave="onToasterLeave"
      @focusin="onToasterFocusIn"
      @focusout="onToasterFocusOut"
      @enter="enterHook"
      @leave="leaveHook"
    >
      <li
        v-for="(entry, index) in rendered"
        :key="entry.id"
        :ref="(el) => registerCard(entry.id, el as Element | null)"
        :class="toastPart(entry.variant).class"
        :style="[cardStyle(entry.id, index, entry.pinned), toastPart(entry.variant).style]"
        :data-front="entry.pinned || depthOf(entry.id) === 0"
        :data-pinned="entry.pinned"
        :data-expanded="expanded"
        :data-swiping="swipeState.get(entry.id)?.swiping ?? false"
        :data-swipe-out="swipeState.get(entry.id)?.swipeOut ?? false"
        :data-swipe-direction="swipeState.get(entry.id)?.direction ?? undefined"
        :data-y-position="yPos"
        @pointerdown="onPointerDown(entry.id, $event)"
        @pointermove="onPointerMove(entry.id, $event)"
        @pointerup="onPointerUp(entry.id)"
        @pointercancel="onPointerUp(entry.id)"
        @transitionrun="onCardTransition(entry.id, $event, true)"
        @transitionend="onCardTransition(entry.id, $event, false)"
        @transitioncancel="onCardTransition(entry.id, $event, false)"
      >
        <slot
          :entry="entry"
          :dismiss="() => dismiss(entry.id)"
          :depth="depthOf(entry.id)"
          :expanded="expanded"
        >
          <span :class="iconPart.class" :style="iconPart.style" aria-hidden="true">
            <StatusIcon :variant="entry.variant" />
          </span>
          <div :class="contentPart.class" :style="contentPart.style">
            <p :class="titlePart.class" :style="titlePart.style">{{ entry.title }}</p>
            <p
              v-if="entry.description"
              :class="descriptionPart.class"
              :style="descriptionPart.style"
            >
              {{ entry.description }}
            </p>
          </div>
          <button
            v-if="entry.action"
            type="button"
            :class="actionPart.class"
            :style="actionPart.style"
            @click="onActionClick(entry)"
          >
            {{ entry.action.label }}
          </button>
          <button
            type="button"
            :class="closePart.class"
            :style="closePart.style"
            :aria-label="messages.toast.dismiss"
            @click="dismiss(entry.id)"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none">
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
import './Toaster.css'
import '../shared/tokens.css'
import { computed, inject, onScopeDispose, reactive, ref, watch } from 'vue'
import { useDocumentVisibility } from '@vueuse/core'
import { useToastQueue } from '../../composables/useToast'
import type { ToastEntry, ToastId } from '../../composables/useToast'
import { useUiMessages } from '../../messages'
import { themeScopeKey, useThemedUi } from '../../theme'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import StatusIcon from '../internal/StatusIcon.vue'

// Port of vue-sonner's swipe-to-dismiss mechanics; constants are Sonner's.
const SWIPE_THRESHOLD = 45 // px
const SWIPE_VELOCITY_THRESHOLD = 0.11 // px/ms
const SWIPE_EXIT_MS = 200

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Screen corner or edge the toasts stack from. @default 'bottom-right' */
    position?: ToasterPosition
    /** Max toasts shown at once. Extra toasts wait off-screen, timers paused, until a slot opens.
     * @default 4 */
    maxVisible?: number
    /** Keeps the stack open as a list, so every toast stays readable. Timers keep running, and
     * hover or focus still pauses them. @default false */
    expand?: boolean
    /** Spacing between stacked cards, in pixels. @default 10 */
    gap?: number
    /** CSS selector to teleport the toast stack to. @default 'body' */
    teleportTo?: string
    /** `false` delegates enter/leave animations to `@card-enter`/`@card-leave` events. @default true */
    motionCss?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      toast: UiPartValue
      icon: UiPartValue
      content: UiPartValue
      title: UiPartValue
      description: UiPartValue
      action: UiPartValue
      close: UiPartValue
    }>
  }>(),
  {
    position: 'bottom-right',
    maxVisible: 4,
    expand: false,
    gap: 10,
    teleportTo: 'body',
    motionCss: true,
  },
)

const emit = defineEmits<{
  /** Fires when a toast enters, only while `motionCss` is `false`. Run your own animation, then call
   * `done()`. */
  'card-enter': [el: Element, done: () => void]
  /** Same as `@card-enter`, for a toast leaving. */
  'card-leave': [el: Element, done: () => void]
}>()

const enterHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('card-enter', el, done),
)
const leaveHook = computed(() =>
  props.motionCss ? undefined : (el: Element, done: () => void) => emit('card-leave', el, done),
)

defineSlots<{
  /** Replaces a toast's inner markup; the toaster still handles its positioning, stacking and swipe. */
  default(props: {
    entry: ToastEntry
    dismiss: () => void
    depth: number
    expanded: boolean
  }): unknown
}>()

const { toasts, dismiss, pauseAll, resumeAll, setWaiting } = useToastQueue()
const messages = useUiMessages()

// Extracted to bypass oxfmt removing semicolon from multi-statement @click expression.
function onActionClick(entry: ToastEntry) {
  entry.action!.onClick()
  dismiss(entry.id)
}
const themeScope = inject(themeScopeKey, undefined)
const visibility = useDocumentVisibility()
const toasterEl = ref<HTMLElement | null>(null)
function registerToaster(el: Element | { $el?: unknown } | null) {
  if (el instanceof HTMLElement) {
    toasterEl.value = el
  } else if (el && '$el' in el && el.$el instanceof HTMLElement) {
    toasterEl.value = el.$el
  }
}

// Pinned toasts sit in their own section past the stack; only the stack collapses and queues.
const stack = computed(() => toasts.filter((t) => !t.pinned))
const pinned = computed(() => toasts.filter((t) => t.pinned))
const visible = computed(() => stack.value.slice(-props.maxVisible))
// Pinned cards render last so they layer above the stack while it expands into them.
const rendered = computed(() => [...visible.value, ...pinned.value])
const isBottom = computed(() => props.position.startsWith('bottom'))
const yPos = computed(() => props.position.split('-')[0])
const xPos = computed(() => props.position.split('-')[1])

// Track heights with ResizeObserver to detect post-mount reflows and webfont loads.
// Maps, not objects: object keys would merge a custom id '3' with the automatic id 3.
const heights = reactive(new Map<ToastId, number>())
const resizeObservers = new Map<ToastId, ResizeObserver>()

// Collapsed back cards are forced to the front card's height (inline block-size), so only
// record natural heights while a card is unforced and not mid height-transition.
const heightTransitions = new Set<ToastId>()
function recordHeight(id: ToastId, el: HTMLElement, h = el.offsetHeight) {
  if (el.style.blockSize || heightTransitions.has(id)) return
  if (h > 0) heights.set(id, h)
}

function registerCard(id: ToastId, el: Element | null) {
  if (!(el instanceof HTMLElement)) return
  if (resizeObservers.has(id)) return
  const observer = new ResizeObserver(([entry]) => {
    recordHeight(id, el, entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight)
  })
  observer.observe(el)
  resizeObservers.set(id, observer)
}

function onCardTransition(id: ToastId, event: TransitionEvent, running: boolean) {
  if (event.target !== event.currentTarget) return
  if (event.propertyName !== 'block-size' && event.propertyName !== 'height') return
  if (running) {
    heightTransitions.add(id)
  } else {
    heightTransitions.delete(id)
    recordHeight(id, event.currentTarget as HTMLElement)
  }
}

function depthOf(id: ToastId) {
  const i = visible.value.findIndex((t) => t.id === id)
  return i === -1 ? 0 : visible.value.length - 1 - i
}

const frontHeight = computed<number | undefined>(() => {
  const front = visible.value[visible.value.length - 1]
  return front ? heights.get(front.id) : undefined
})

const stackHeight = computed(() => {
  if (visible.value.length === 0) return 0
  if (expanded.value) {
    return visible.value.reduce((sum, t) => sum + (heights.get(t.id) ?? 56) + props.gap, -props.gap)
  }
  return frontHeight.value ?? 56
})

// Where the pinned section starts: past the stack and the back cards peeking out of it.
const pinnedStart = computed(() => {
  if (visible.value.length === 0) return 0
  const peek = expanded.value ? 0 : Math.min(visible.value.length - 1, 3) * props.gap
  return stackHeight.value + peek + props.gap
})

// Position:absolute cards collapse parent; set explicit height to catch pointerleave.
const toasterHeight = computed(() => {
  if (pinned.value.length === 0) return stackHeight.value
  return pinned.value.reduce(
    (sum, t) => sum + (heights.get(t.id) ?? 56) + props.gap,
    pinnedStart.value - props.gap,
  )
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

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.toaster,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-toaster', `ui-toaster--${props.position}`),
)
function toastPart(variant: string) {
  return resolveUiPart(cx, themedUi()?.toast, 'ui-toast', `ui-toast--${variant}`)
}
const iconPart = computed(() => resolveUiPart(cx, themedUi()?.icon, 'ui-toast-icon'))
const contentPart = computed(() => resolveUiPart(cx, themedUi()?.content, 'ui-toast-content'))
const titlePart = computed(() => resolveUiPart(cx, themedUi()?.title, 'ui-toast-title'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-toast-description'),
)
const actionPart = computed(() => resolveUiPart(cx, themedUi()?.action, 'ui-toast-action'))
const closePart = computed(() => resolveUiPart(cx, themedUi()?.close, 'ui-toast-close'))

// Oldest pinned toast sits nearest the stack, so a new one never moves the ones already shown.
function pinnedOffsetOf(id: ToastId) {
  let offset = pinnedStart.value
  for (const t of pinned.value) {
    if (t.id === id) break
    offset += (heights.get(t.id) ?? 56) + props.gap
  }
  return offset
}

function offsetOf(id: ToastId) {
  const i = visible.value.findIndex((t) => t.id === id)
  if (i === -1) return 0
  let offset = 0
  for (let j = i + 1; j < visible.value.length; j++) {
    offset += (heights.get(visible.value[j].id) ?? 56) + props.gap
  }
  return offset
}

// Hover and focus open the stack and pause timers; `expand` only keeps it open.
const interacting = ref(false)
const expanded = computed(() => props.expand || interacting.value)
const hovered = ref(false)
const focusWithin = ref(false)
function openStack() {
  if (interacting.value) return
  interacting.value = true
  pauseAll()
}
function closeStack() {
  if (!interacting.value || hovered.value || focusWithin.value) return
  interacting.value = false
  if (visibility.value !== 'hidden') resumeAll()
}
function onToasterEnter() {
  hovered.value = true
  openStack()
}
function onToasterLeave() {
  if (activeSwipeId.value != null) return
  hovered.value = false
  closeStack()
}
// Collapsed back cards hide their content, so keyboard focus expands the stack too.
function onToasterFocusIn() {
  focusWithin.value = true
  openStack()
}
function onToasterFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null
  if (next && toasterEl.value?.contains(next)) return
  focusWithin.value = false
  closeStack()
}

function cardStyle(id: ToastId, index: number, isPinned: boolean) {
  const depth = isPinned ? 0 : Math.min(depthOf(id), 3)
  const sign = isBottom.value ? -1 : 1
  // Collapsed: fixed lift per depth (peek only); expanded: cumulative height.
  const offsetPx = isPinned ? pinnedOffsetOf(id) : expanded.value ? offsetOf(id) : depth * props.gap
  const stackY = sign * offsetPx
  const swipeX = swipeState.get(id)?.x ?? 0
  const swipeY = swipeState.get(id)?.y ?? 0
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
  // Sonner's collapsed stack: back cards take the front card's height so each one peeks by
  // exactly `gap`, however tall or short its own content is.
  const frontH = frontHeight.value
  if (!expanded.value && depth > 0 && frontH != null) style.blockSize = `${frontH}px`
  return style
}

interface SwipeState {
  x: number
  y: number
  swiping: boolean
  swipeOut: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
}
const swipeState = reactive(new Map<ToastId, SwipeState>())
const pointerStart = new Map<ToastId, { x: number; y: number; time: number }>()
const swipeAxis = new Map<ToastId, 'x' | 'y' | null>()
const activeSwipeId = ref<ToastId | null>(null)

function allowedDirections(): Array<'left' | 'right' | 'up' | 'down'> {
  return ['left', 'right', isBottom.value ? 'down' : 'up']
}
function dampen(delta: number) {
  return delta / (1.5 + Math.abs(delta) / 20)
}

function state(id: ToastId): SwipeState {
  let s = swipeState.get(id)
  if (!s) {
    swipeState.set(id, { x: 0, y: 0, swiping: false, swipeOut: false, direction: null })
    s = swipeState.get(id)!
  }
  return s
}

function onPointerDown(id: ToastId, event: PointerEvent) {
  if (event.button === 2) return
  const target = event.target as HTMLElement
  if (target.closest('button')) return // avoid swipe from close/action button.
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  pointerStart.set(id, { x: event.clientX, y: event.clientY, time: performance.now() })
  swipeAxis.set(id, null)
  activeSwipeId.value = id
}

function onPointerMove(id: ToastId, event: PointerEvent) {
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

function onPointerUp(id: ToastId) {
  const start = pointerStart.get(id)
  const axis = swipeAxis.get(id)
  pointerStart.delete(id)
  swipeAxis.delete(id)
  activeSwipeId.value = null
  const s = swipeState.get(id)
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
  if (!interacting.value) resumeAll()
}

watch(
  () => toasts.map((t) => t.id),
  (ids) => {
    const live = new Set(ids)
    for (const key of heights.keys()) {
      if (!live.has(key)) heights.delete(key)
    }
    for (const key of swipeState.keys()) {
      if (!live.has(key)) swipeState.delete(key)
    }
    for (const id of heightTransitions) {
      if (!live.has(id)) heightTransitions.delete(id)
    }
    for (const [id, observer] of resizeObservers) {
      if (!live.has(id)) {
        observer.disconnect()
        resizeObservers.delete(id)
      }
    }
  },
) // Clean up heights/swipe state/observers when toasts leave the queue.
onScopeDispose(() => {
  for (const observer of resizeObservers.values()) observer.disconnect()
  resizeObservers.clear()
})

// Pause timers when tab is hidden; useToastQueue tracks remaining time.
watch(visibility, (visibilityState) => {
  if (visibilityState === 'hidden') pauseAll()
  else if (!interacting.value) resumeAll()
})

// Toasts past maxVisible aren't on screen yet, so their timers wait until they are.
watch(
  () => stack.value.slice(0, Math.max(0, stack.value.length - props.maxVisible)).map((t) => t.id),
  (ids) => setWaiting(ids, !interacting.value && visibility.value !== 'hidden'),
  { immediate: true },
)
onScopeDispose(() => setWaiting([], !interacting.value))

defineExpose({
  /** Toast list (root) element. */
  toasterEl,
})
</script>
