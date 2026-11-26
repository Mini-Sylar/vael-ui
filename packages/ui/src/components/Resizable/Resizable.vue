<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[sizeStyle, rootPart.style]"
    :data-resizing="isDragging || undefined"
    :data-motion="props.motion === false ? 'off' : undefined"
    :aria-disabled="disabled || undefined"
    :tabindex="canMove && !disabled ? 0 : undefined"
    v-bind="attrs"
    :id="boxId"
    @pointerdown="canMove ? onMovePointerdown($event) : undefined"
    @keydown="canMove ? onMoveKeydown($event) : undefined"
  >
    <slot />
    <div
      v-for="side in edges"
      :key="side"
      :ref="(el) => (handleEls[side] = el as HTMLElement | null)"
      :class="handlePart.class"
      :style="handlePart.style"
      :data-direction="direction"
      :data-edge="side"
      :data-flush="flushOf[side] || undefined"
      :data-active="(isDragging && grabbed === side) || undefined"
      role="separator"
      :aria-orientation="direction === 'horizontal' ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(modelValue)"
      :aria-valuemin="min"
      :aria-valuemax="valueMax"
      :aria-label="labelOf(side)"
      :aria-controls="boxId"
      :tabindex="disabled ? -1 : 0"
      @pointerdown.stop="grab($event, side)"
      @keydown.stop="key($event, side)"
      @focus="measureAvailable"
    >
      <slot name="handle" :edge="side" />
    </div>
  </div>
</template>

<!-- General-purpose resize primitive: wraps content + draggable handle, axis/edge-agnostic; no live-drag transitions -->
<script setup lang="ts">
import './Resizable.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import {
  computed,
  nextTick,
  reactive,
  shallowRef,
  useAttrs,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import type { Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useMessages, resizableMessages } from '../../messages'
import { useResizable } from '../../composables/useResizable'
import type { ResizeDirection, ResizeEdge } from '../../composables/useResizable'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { ResizableMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
// The handles control the box they resize, as the APG window splitter says; yours if you set `id`.
const ownId = useId()
const boxId = computed(() => (attrs.id as string | undefined) ?? ownId)

/** Panel size in pixels along `direction`. Overshoots `min` or `max` elastically mid-drag, then settles within them. */
const modelValue = defineModel<number>('size', { required: true })
/**
 * Where a span starts, in pixels along `direction`, for a bar on a timeline: bind it and the
 * panel positions itself from this start (give its container `position: relative`). A handle on the
 * start edge moves the start and the size together, so the far end stays put. Bind it from the
 * start; it isn't read as a span if it begins unset.
 */
const offsetModel = defineModel<number>('offset')

const props = withDefaults(
  defineProps<{
    /** Smallest size in pixels. @default 0 */
    min?: number
    /** Largest size in pixels. @default Infinity */
    max?: number
    /**
     * Axis the panel resizes along: `'horizontal'` sets its width, `'vertical'` its height.
     * @default 'horizontal'
     */
    direction?: ResizeDirection
    /**
     * Which edge the handle sits on. `'start'` flips the drag so moving toward the panel grows it.
     * `'both'` puts a handle on each edge, and pulling one moves only that side: the far end stays
     * put. Add `v-model:offset` to give the start a position of your own, for a span.
     * @default 'end'
     */
    edge?: ResizeEdge | 'both'
    /**
     * Resizes from the middle: the handle you pull follows the pointer and the opposite edge moves
     * as far the other way, so the panel's centre stays put.
     * @default false
     */
    centered?: boolean
    /** With `offset`: the span stays between these, start and end, in pixels. */
    bounds?: [number, number]
    /** A scrolling container: near its edges it scrolls under the pointer during a drag, and the
     * drag follows. Its `scroll-padding` marks what covers it, such as a sticky column. */
    scrollEl?: HTMLElement | null
    /**
     * With `offset`: press on the panel and drag to move the whole span, and the arrow keys move
     * it a step. A still press stays a click. Set `false` to resize only.
     * @default true with `offset`
     */
    movable?: boolean
    /** Snaps the size to a multiple of `step` on release, the drag itself staying smooth, and
     * an arrow key resizes one step. Unset, a drag doesn't snap and an arrow key moves 16 px. */
    step?: number
    /** Disables dragging and keyboard resizing, and removes the handle from the tab order. @default false */
    disabled?: boolean
    /** Accessible label for the handle. With `edge="both"` the labels are the messages' `start` and `end`. @default 'Resize' */
    ariaLabel?: string
    /**
     * How it moves: its appearance (`{ initial: { root: { opacity: 0 } } }`) and its states
     * (`{ states: { dragging: { handle: { scale: '1.2' } } } }`). `false` turns its own animation
     * off.
     */
    motion?: ResizableMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; handle: UiPartValue }>
  }>(),
  {
    min: 0,
    max: Infinity,
    direction: 'horizontal',
    edge: 'end',
    disabled: false,
    ariaLabel: undefined,
    centered: false,
    bounds: undefined,
    scrollEl: undefined,
    movable: undefined,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

const emit = defineEmits<{
  /** Fires once per settled interaction: on pointer release, or after each key press. Save here instead of on every drag frame. */
  commit: []
}>()

defineSlots<{
  /** Panel content. */
  default(): unknown
  /** Custom content inside a drag handle; `edge` says which when there are two. */
  handle(props: { edge: ResizeEdge }): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
// One handle, or two with `edge="both"`.
const edges = computed<ResizeEdge[]>(() =>
  props.edge === 'both' ? ['start', 'end'] : [props.edge],
)
const handleEls = reactive<Partial<Record<ResizeEdge, HTMLElement | null>>>({})
const handleEl = computed(() => handleEls[edges.value[0]!] ?? null)
// A span when `offset` is bound from the start.
const span = offsetModel.value !== undefined
const canMove = computed(() => span && (props.movable ?? true))
// With a handle on each edge and no `offset` of its own, the panel keeps how far its start has
// gone: a start handle moves it by that much, so the far end stays put.
const shift = shallowRef(0)
const placed = computed(() => span || props.edge === 'both' || props.centered)
const startRef = (span ? offsetModel : shift) as Ref<number>
// The most it can be while a handle is pulled: what its container has room for on that side.
let reach = Infinity

const { isDragging, onHandlePointerdown, onHandleKeydown, onMovePointerdown, onMoveKeydown } =
  useResizable(modelValue, {
    min: () => props.min,
    max: () => Math.min(props.max, reach),
    direction: () => props.direction,
    edge: () => (props.edge === 'both' ? 'end' : props.edge),
    step: () => props.step,
    disabled: () => props.disabled,
    offset: () => (placed.value ? startRef : undefined),
    // A pulled panel stops at `min`; only a span flips over its other end.
    flip: () => span,
    centered: () => props.centered,
    bounds: () => props.bounds,
    scrollEl: () => props.scrollEl,
    onCommit: () => emit('commit'),
  })

// Which handle the pointer is on, so only that one shows it's active.
const grabbed = shallowRef<ResizeEdge | null>(null)

// With two handles and no `offset`, the edge you aren't pulling stays where it is on screen, even
// when the layout around the panel moves it (a panel centred in its container grows both ways).
// Its screen position is taken when a handle is pressed, and put back after each change of size.
let pin: { side: ResizeEdge | 'middle'; at: number } | null = null
const drift = shallowRef(0)
const isRtl = () => !!root.value && getComputedStyle(root.value).direction === 'rtl'
function edgeAt(side: ResizeEdge | 'middle'): number {
  const box = root.value!.getBoundingClientRect()
  if (side === 'middle')
    return props.direction === 'vertical' ? (box.top + box.bottom) / 2 : (box.left + box.right) / 2
  if (props.direction === 'vertical') return side === 'start' ? box.top : box.bottom
  return (side === 'start') !== isRtl() ? box.left : box.right
}
// How far the panel can grow on a side before it leaves its container (padding included).
function roomOn(side: ResizeEdge): number {
  const parent = root.value?.parentElement
  if (!parent || !root.value) return Infinity
  const box = root.value.getBoundingClientRect()
  const room = parent.getBoundingClientRect()
  const style = getComputedStyle(parent)
  const edge = (name: 'Left' | 'Right' | 'Top' | 'Bottom') =>
    Number.parseFloat(style[`border${name}Width`]) || 0
  if (props.direction === 'vertical')
    return side === 'start'
      ? box.top - (room.top + edge('Top'))
      : room.bottom - edge('Bottom') - box.bottom
  const left = (side === 'start') !== isRtl()
  return left ? box.left - (room.left + edge('Left')) : room.right - edge('Right') - box.right
}
function holdOther(side: ResizeEdge) {
  if (span || (props.edge !== 'both' && !props.centered) || !root.value) return
  // The centre when resizing from the middle, else the edge you aren't pulling.
  const held = props.centered ? 'middle' : side === 'start' ? 'end' : 'start'
  pin = { side: held, at: edgeAt(held) }
  const grown = Math.min(roomOn('start'), roomOn('end'))
  reach = props.centered
    ? Math.max(modelValue.value, modelValue.value + 2 * grown)
    : Math.max(modelValue.value, modelValue.value + roomOn(side))
}
// A step's snap on release lands a frame later: let go of the pin after that.
function releasePin() {
  const mine = pin
  void nextTick(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (pin === mine && !isDragging.value) {
          pin = null
          reach = Infinity
        }
      }),
    ),
  )
}
watch(isDragging, (dragging) => dragging || releasePin())
// Another axis or edge starts from where the layout puts it.
watch(
  () => [props.direction, props.edge, props.centered],
  () => {
    shift.value = 0
    drift.value = 0
    pin = null
    reach = Infinity
  },
)
watch(
  [modelValue, shift],
  () => {
    if (!pin || !root.value) return
    const off = pin.at - edgeAt(pin.side)
    // The start inset moves it along the inline axis: the other way round right to left.
    if (Math.abs(off) > 0.01)
      drift.value += props.direction === 'horizontal' && isRtl() ? -off : off
  },
  { flush: 'post' },
)
function grab(event: PointerEvent, side: ResizeEdge) {
  grabbed.value = side
  holdOther(side)
  onHandlePointerdown(event, side)
}
function key(event: KeyboardEvent, side: ResizeEdge) {
  holdOther(side)
  onHandleKeydown(event, side)
  releasePin()
}

// The root is the panel: `panel` has no element of its own.
const parts = useStateMotion({
  key: 'resizable',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-resizable', handle: '.ui-resizable-handle' },
  states: () => ({ dragging: isDragging.value }),
  repeated: ['handle'],
  each: (part, el) =>
    part === 'handle'
      ? { dragging: isDragging.value && grabbed.value === el.getAttribute('data-edge') }
      : {},
})

const messages = useMessages({ resizable: resizableMessages })
// With two handles each has its own name; one keeps `ariaLabel`.
const labelOf = (side: ResizeEdge) =>
  props.edge === 'both'
    ? messages.value.resizable[side]
    : (props.ariaLabel ?? messages.value.resizable.label)
// Without a `max`, the most the panel can take is the room its container gives it.
const available = shallowRef(0)
function measureAvailable() {
  if (Number.isFinite(props.max)) return
  const parent = root.value?.parentElement
  if (!parent) return
  available.value = props.direction === 'horizontal' ? parent.clientWidth : parent.clientHeight
}
useResizeObserver(
  () => (Number.isFinite(props.max) ? null : root.value?.parentElement),
  measureAvailable,
)

// The handle straddles the panel's edge so it can be grabbed from either side. Where the panel
// reaches its container's edge there's nothing past it to grab, and the outer half would only push
// the page sideways: there, it tucks inside.
const flushOf = reactive<Record<ResizeEdge, boolean>>({ start: false, end: false })
function measureFlush() {
  const panel = root.value
  const parent = panel?.parentElement
  if (!panel || !parent) return
  const box = panel.getBoundingClientRect()
  const room = parent.getBoundingClientRect()
  const style = getComputedStyle(parent)
  const horizontal = props.direction === 'horizontal'
  const rtl = horizontal && style.direction === 'rtl'
  const pad = (side: 'Left' | 'Right' | 'Top' | 'Bottom') =>
    Number.parseFloat(style[`padding${side}`]) + Number.parseFloat(style[`border${side}Width`])
  for (const side of edges.value) {
    // The edge the handle is on, in screen terms, against the container's content edge there.
    const towardEnd = (side === 'end') !== rtl
    flushOf[side] = horizontal
      ? towardEnd
        ? box.right >= room.right - pad('Right') - 0.5
        : box.left <= room.left + pad('Left') + 0.5
      : towardEnd
        ? box.bottom >= room.bottom - pad('Bottom') - 0.5
        : box.top <= room.top + pad('Top') + 0.5
  }
}
useResizeObserver(() => [root.value, root.value?.parentElement], measureFlush)
const valueMax = computed(() =>
  Number.isFinite(props.max)
    ? props.max
    : Math.max(Math.round(available.value), Math.round(modelValue.value), props.min),
)

const sizeStyle = computed(() => {
  const horizontal = props.direction === 'horizontal'
  return {
    [horizontal ? 'inlineSize' : 'blockSize']: `${modelValue.value}px`,
    // A span sits where its start says. With two handles and no `offset`, the panel is moved by how
    // far its start has gone.
    ...(placed.value
      ? {
          [horizontal ? 'insetInlineStart' : 'insetBlockStart']:
            `${startRef.value + (span ? 0 : drift.value)}px`,
        }
      : {}),
  }
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.resizable,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-resizable',
    `ui-resizable--${props.direction}`,
    props.disabled && 'ui-resizable--disabled',
    span && 'ui-resizable--span',
    !span && (props.edge === 'both' || props.centered) && 'ui-resizable--pinned',
    canMove.value && 'ui-resizable--movable',
  ),
)
const handlePart = computed(() => resolveUiPart(cx, themedUi()?.handle, 'ui-resizable-handle'))

defineExpose({
  /** Root element. */
  el: root,
  /** Drag handle element. */
  handleEl,
  /** Whether you're dragging the handle with a pointer. */
  isDragging,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
