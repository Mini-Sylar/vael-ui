<template>
  <section class="demo">
    <h3>Draggable dialog</h3>
    <p class="note">
      Drag the header to move the dialog. Pointer capture keeps the drag going when the pointer
      leaves the header. With the grip button focused, the arrow keys move it 10 px, or 50 px with
      Shift. The dialog stays inside the window and opens centered again.
    </p>
    <Button @click="open = true">Open dialog</Button>
    <Dialog
      ref="dialog"
      v-model:open="open"
      :aria-labelledby="titleId"
      :ui="{
        panel: { style: { position: 'relative', left: `${offset.x}px`, top: `${offset.y}px` } },
      }"
    >
      <template #header>
        <div
          class="drag-header"
          @pointerdown="startDrag"
          @pointermove="drag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <button
            type="button"
            class="grip"
            aria-label="Move dialog"
            :aria-describedby="`${titleId}-hint`"
            @keydown="nudge"
          >
            <PhDotsSixVertical :size="16" aria-hidden="true" />
          </button>
          <h2 :id="titleId" class="drag-title">Layer settings</h2>
          <span :id="`${titleId}-hint`" hidden>Use the arrow keys to move the dialog.</span>
        </div>
      </template>
      <p>Move this out of the way to see what’s behind it, then close it as usual.</p>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Close</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { Button, Dialog } from 'vael-ui'
import { PhDotsSixVertical } from '@phosphor-icons/vue'

const open = shallowRef(false)
const titleId = useId()
const dialog = useTemplateRef('dialog')
const offset = reactive({ x: 0, y: 0 })
// A new open starts in the center.
watch(open, (isOpen) => isOpen && Object.assign(offset, { x: 0, y: 0 }))

// Moves the panel to an offset, kept inside the window.
function moveTo(x: number, y: number) {
  const panel = dialog.value?.panelEl
  if (!panel) return
  const rect = panel.getBoundingClientRect()
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
  offset.x = clamp(x, offset.x - rect.left, offset.x + window.innerWidth - rect.right)
  offset.y = clamp(y, offset.y - rect.top, offset.y + window.innerHeight - rect.bottom)
}

let start: { pointerX: number; pointerY: number; x: number; y: number } | null = null
function startDrag(event: PointerEvent) {
  if (event.button !== 0) return
  start = { pointerX: event.clientX, pointerY: event.clientY, x: offset.x, y: offset.y }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function drag(event: PointerEvent) {
  if (!start) return
  moveTo(start.x + event.clientX - start.pointerX, start.y + event.clientY - start.pointerY)
}
function endDrag() {
  start = null
}

const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}
function nudge(event: KeyboardEvent) {
  const direction = KEYS[event.key]
  if (!direction) return
  event.preventDefault()
  const step = event.shiftKey ? 50 : 10
  moveTo(offset.x + direction[0] * step, offset.y + direction[1] * step)
}
</script>

<style scoped>
.drag-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: -0.5rem 0;
  padding-block: 0.5rem;
  cursor: grab;
  /* Touch drags move the panel instead of scrolling the page. */
  touch-action: none;
  user-select: none;
}
.drag-header:active {
  cursor: grabbing;
}
.grip {
  display: grid;
  place-items: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  margin-inline-start: -0.5rem;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--ui-text-muted);
  cursor: inherit;
}
.grip:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 1px;
}
.drag-title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}
</style>
