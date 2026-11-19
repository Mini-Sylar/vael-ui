<template>
  <section class="demo">
    <h3>Draggable dialog</h3>
    <p class="note">
      <code>useDrag</code> with a <code>handle</code> moves the panel by its header, and a throw
      carries on at the speed you let go and settles on a spring, inside the window. With the grip
      button focused, the arrow keys move it 10 px, or 50 px with Shift. It opens centered again.
    </p>
    <Button @click="open = true">Open dialog</Button>
    <Dialog ref="dialog" v-model:open="open" :aria-labelledby="titleId">
      <template #header>
        <div class="drag-header">
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

// Let go: it coasts where the throw was heading, and stops at the window's edge.
const drag = useDrag({
  el: panel,
  handle: '.drag-header',
  onRelease: ({ projected }) => inWindow(projected),
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
  drag.throwTo(
    inWindow({
      x: drag.x.value + direction[0] * step,
      y: drag.y.value + direction[1] * step,
    }),
  )
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
