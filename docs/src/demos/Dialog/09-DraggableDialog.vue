<template>
  <section class="demo">
    <h3>Draggable dialog</h3>
    <p class="note">
      <code>useDrag</code> with a <code>handle</code> moves the panel by its header. Let go and it
      stays where you put it; a quick flick carries on and settles on a spring, inside the window.
      With the grip focused, the arrow keys move it 10 px, or 50 px with Shift. It reopens centered.
    </p>
    <Button @click="open = true">Open dialog</Button>
    <Dialog
      ref="dialog"
      v-model:open="open"
      :aria-labelledby="titleId"
      :ui="{ header: 'drag-zone' }"
    >
      <template #header>
        <div class="drag-header">
          <Button
            variant="ghost"
            size="sm"
            icon
            class="grip"
            aria-label="Move dialog"
            :aria-describedby="`${titleId}-hint`"
            @keydown="nudge"
          >
            <PhDotsSixVertical :size="16" aria-hidden="true" />
          </Button>
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
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { Button, Dialog, useDrag } from 'vael-ui'
import type { DragPoint } from 'vael-ui'
import { PhDotsSixVertical } from '@phosphor-icons/vue'

const open = shallowRef(false)
const titleId = useId()
const dialog = useTemplateRef('dialog')
const panel = computed(() => dialog.value?.panelEl ?? null)

// Where a move to `to` (px from home) would put the panel, kept inside the window.
function inWindow(to: DragPoint): DragPoint {
  const rect = panel.value?.getBoundingClientRect()
  if (!rect) return to
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
  return {
    x: clamp(to.x, drag.x.value - rect.left, drag.x.value + innerWidth - rect.right),
    y: clamp(to.y, drag.y.value - rect.top, drag.y.value + innerHeight - rect.bottom),
  }
}

// Let go: a flick coasts where it was heading; slower, it stays where you put it, as a window does.
// Either way it stops at the window's edge.
const FLICK = 1000
let heading: DragPoint | null = null
const drag = useDrag({
  el: panel,
  handle: '.drag-zone',
  onRelease: ({ offset, velocity, projected }) => {
    heading = null
    return inWindow(Math.hypot(velocity.x, velocity.y) > FLICK ? projected : offset)
  },
  onRest: () => (heading = null),
})

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
  // From where the last press is heading, so keys pressed in a row add up.
  const from = heading ?? { x: drag.x.value, y: drag.y.value }
  heading = inWindow({ x: from.x + direction[0] * step, y: from.y + direction[1] * step })
  drag.throwTo(heading)
}
</script>

<style scoped>
.drag-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.grip {
  margin-inline-start: -0.5rem;
  cursor: inherit;
}
.drag-title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}
</style>

<!-- The whole header bar grabs, not just its title row. The panel is teleported, so it's styled here. -->
<style>
.drag-zone {
  cursor: grab;
  /* Touch drags move the panel instead of scrolling the page. */
  touch-action: none;
  user-select: none;
}
.drag-zone:active {
  cursor: grabbing;
}
</style>
