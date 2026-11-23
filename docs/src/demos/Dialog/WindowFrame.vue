<template>
  <Dialog
    ref="dialog"
    v-model:open="open"
    v-model:maximized="maximized"
    :modal="false"
    :show-close="false"
    :scroll-fade="false"
    :close-on-escape="false"
    :aria-labelledby="titleId"
    :motion="motion"
    :style="frame"
    :ui="{ header: 'win-header' }"
    class="win"
    @after-leave="onAfterLeave"
  >
    <template #header>
      <div class="bar">
        <Button
          variant="ghost"
          size="sm"
          icon
          aria-label="Move window"
          :aria-describedby="`${titleId}-move`"
          @keydown="nudge"
        >
          <PhDotsSixVertical :size="14" aria-hidden="true" />
        </Button>
        <span :id="`${titleId}-move`" hidden>Use the arrow keys to move the window.</span>
        <h2 :id="titleId" class="bar-title">{{ title }}</h2>
        <Button variant="ghost" size="sm" icon aria-label="Minimize" @click="open = false">
          <PhMinus :size="14" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon
          :aria-label="maximized ? 'Restore' : 'Maximize'"
          @click="maximized = !maximized"
        >
          <PhArrowsOut :size="14" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="sm" icon aria-label="Close" @click="$emit('close')">
          <PhX :size="14" aria-hidden="true" />
        </Button>
      </div>
    </template>
    <slot />
    <template v-if="!maximized">
      <!-- The bottom-right corner is the one handle the keyboard reaches. -->
      <span
        v-for="handle in HANDLES"
        :key="handle"
        :class="['edge', `edge-${handle}`]"
        v-bind="handle === 'se' ? keyboardHandle : { 'aria-hidden': true }"
        @pointerdown="resize.onHandlePointerdown($event, handle)"
        @keydown="resize.onHandleKeydown($event, handle)"
      />
      <span :id="`${titleId}-resize`" hidden>Use the arrow keys to resize the window.</span>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { Button, Dialog, useDrag, useResizable } from 'vael-ui'
import { PhArrowsOut, PhDotsSixVertical, PhMinus, PhX } from '@phosphor-icons/vue'

interface Props {
  title: string
  /** The dock icon this window shrinks into. */
  dock: () => HTMLElement | null | undefined
  /** Its place among the open windows, for the cascade. */
  index: number
  /** Asked to go: it leaves in place, then says `closed`. */
  closing: boolean
}
interface Point {
  x: number
  y: number
}

const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
const CASCADE = 32

const props = defineProps<Props>()
const emit = defineEmits<{ close: []; closed: [] }>()
const open = defineModel<boolean>('open', { default: true })

const titleId = useId()
const keyboardHandle = {
  role: 'button',
  tabindex: 0,
  'aria-label': 'Resize window',
  'aria-describedby': `${titleId}-resize`,
}
const dialog = useTemplateRef('dialog')
const panel = computed(() => dialog.value?.panelEl ?? null)
const maximized = shallowRef(false)

// A window is a span on each axis: where it starts and how long it runs.
const x = shallowRef(0)
const y = shallowRef(0)
const width = shallowRef(420)
const height = shallowRef(280)

// Minimizing shrinks into the dock. Closing has nowhere to go, so it leaves in place on the
// built-in look and the window is removed once it has gone.
const motion = computed(() =>
  props.closing ? undefined : { morph: { from: props.dock, hide: false }, resize: false },
)

// The motion above has to be in place before the window starts to leave.
watch(
  () => props.closing,
  async (closing) => {
    if (!closing) return
    await nextTick()
    open.value = false
  },
)

function onAfterLeave(): void {
  if (props.closing) emit('closed')
}

const frame = computed(() => ({
  position: 'fixed',
  margin: 0,
  // The height is the window's to set, past the dialog's usual cap.
  maxBlockSize: 'none',
  insetInlineStart: maximized.value ? '0' : `${x.value}px`,
  insetBlockStart: maximized.value ? '0' : `${y.value}px`,
  inlineSize: maximized.value ? '100dvw' : `${width.value}px`,
  blockSize: maximized.value ? '100dvh' : `${height.value}px`,
}))

const within = (start: number, size: number, room: number): number =>
  Math.min(Math.max(start, 0), Math.max(room - size, 0))

/** Where a move by `by` px from rest keeps the panel on screen. */
function onScreen(by: Point): Point {
  return {
    x: within(x.value + by.x, width.value, innerWidth) - x.value,
    y: within(y.value + by.y, height.value, innerHeight) - y.value,
  }
}

const KEYS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
}

const resize = useResizable(
  { horizontal: width, vertical: height },
  {
    horizontal: { offset: x, flip: false, min: 240, bounds: () => [0, innerWidth] },
    vertical: { offset: y, flip: false, min: 140, bounds: () => [0, innerHeight] },
  },
)

// The panel follows the pointer on `translate` with no render per frame. At rest the move folds
// into x and y, so a resize or a minimize starts from where the window was left.
let heading: Point | null = null
const move = useDrag({
  el: panel,
  handle: '.win-header',
  disabled: maximized,
  onRelease: ({ offset }) => {
    heading = null
    return onScreen(offset)
  },
  onRest: (offset) => {
    heading = null
    if (!offset.x && !offset.y) return
    x.value += offset.x
    y.value += offset.y
    move.reset({ animate: false })
  },
})

/** The arrow keys move the window 10 px, or 50 px with Shift. */
function nudge(event: KeyboardEvent): void {
  const direction = KEYS[event.key]
  if (!direction) return
  event.preventDefault()
  const step = event.shiftKey ? 50 : 10
  // From where the last press is heading, so keys pressed in a row add up.
  const from = heading ?? { x: move.x.value, y: move.y.value }
  heading = onScreen({ x: from.x + direction.x * step, y: from.y + direction.y * step })
  move.throwTo(heading)
}

defineExpose({ focus: () => panel.value?.focus() })

onMounted(() => {
  width.value = Math.min(width.value, innerWidth)
  x.value = within((innerWidth - width.value) / 2 + props.index * CASCADE, width.value, innerWidth)
  y.value = within(
    (innerHeight - height.value) / 2 + props.index * CASCADE,
    height.value,
    innerHeight,
  )
})
</script>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
/* The whole header is the handle. */
:deep(.win-header) {
  cursor: grab;
  touch-action: none;
  user-select: none;
}
:deep(.win-header:active) {
  cursor: grabbing;
}
.bar-title {
  flex: 1;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}
.edge {
  position: absolute;
  touch-action: none;
  --edge: 8px;
}
.edge-n,
.edge-s {
  inset-inline: var(--edge);
  block-size: var(--edge);
  cursor: ns-resize;
}
.edge-e,
.edge-w {
  inset-block: var(--edge);
  inline-size: var(--edge);
  cursor: ew-resize;
}
.edge-n {
  inset-block-start: 0;
}
.edge-s {
  inset-block-end: 0;
}
.edge-e {
  inset-inline-end: 0;
}
.edge-w {
  inset-inline-start: 0;
}
.edge-ne,
.edge-nw,
.edge-se,
.edge-sw {
  inline-size: calc(var(--edge) * 2);
  block-size: calc(var(--edge) * 2);
}
.edge-ne {
  inset: 0 0 auto auto;
  cursor: nesw-resize;
}
.edge-sw {
  inset: auto auto 0 0;
  cursor: nesw-resize;
}
.edge-nw {
  inset: 0 auto auto 0;
  cursor: nwse-resize;
}
.edge-se {
  inset: auto 0 0 auto;
  cursor: nwse-resize;
}
.edge-se:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -4px;
}
</style>
