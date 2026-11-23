<template>
  <section class="demo">
    <h3>Windows and a dock</h3>
    <p class="note">
      Non-modal dialogs you can move, resize and maximize while the page stays live. Drag the
      header, or focus the grip and use the arrow keys: 10 px, or 50 px with Shift. Resize from any
      edge or corner, or focus the bottom-right corner and use the arrow keys. Minimize shrinks a
      window into its icon in the dock, and the icon brings it back, or to the front if it's already
      open.
    </p>
    <div class="row">
      <Button variant="outline" @click="launch('notes')">Notes</Button>
      <Button variant="outline" @click="launch('preview')">Preview</Button>
    </div>

    <WindowFrame
      v-for="(win, index) in wins"
      :key="win.id"
      :ref="(frame) => (frames[win.id] = frame as FrameExposed | null)"
      v-model:open="win.open"
      :index="index"
      :title="win.title"
      :closing="win.closing"
      :dock="() => dock?.itemEls()[docked.indexOf(win)]"
      @close="close(win)"
      @closed="remove(win)"
    >
      <p>{{ win.title }} stays open while you work in the page behind it.</p>
      <Input placeholder="Type here…" />
    </WindowFrame>

    <Teleport to="body">
      <div
        v-if="docked.length"
        v-animate="{ initial: { opacity: 0, y: 16 }, exit: { opacity: 0, y: 8 }, duration: 220 }"
        class="dock-shell"
      >
        <Dock
          ref="dock"
          v-animate.size
          :items="items"
          :base-size="40"
          :max-size="56"
          :motion="{ initial: { item: { opacity: 0, scale: '0.6' } } }"
          tooltip-side="top"
          @select="(_, index) => show(docked[index]!)"
        />
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, useTemplateRef } from 'vue'
import type { Component } from 'vue'
import { Button, Dock, Input } from 'vael-ui'
import { animate, vAnimate } from 'vael-ui/motion'
import { PhImage, PhNotePencil } from '@phosphor-icons/vue'
import WindowFrame from './WindowFrame.vue'

interface Win {
  id: string
  title: string
  icon: Component
  open: boolean
  /** Leaving in place; the window is removed once it has gone. */
  closing: boolean
  /** Has its icon in the dock. */
  docked: boolean
}
interface FrameExposed {
  focus: () => void
}

const APPS: Record<string, Pick<Win, 'title' | 'icon'>> = {
  notes: { title: 'Notes', icon: PhNotePencil },
  preview: { title: 'Preview', icon: PhImage },
}

const wins = reactive<Win[]>([])
const frames: Record<string, FrameExposed | null> = {}
const dock = useTemplateRef('dock')
const docked = computed(() => wins.filter((win) => win.docked))
const items = computed(() => docked.value.map(({ title, icon }) => ({ label: title, icon })))

async function launch(id: string): Promise<void> {
  const existing = wins.find((win) => win.id === id)
  if (existing) return show(existing)
  wins.push({ id, ...APPS[id]!, open: true, closing: false, docked: true })
  // The first icon comes in with the dock; a later one is brought in here.
  if (docked.value.length === 1) return
  await nextTick()
  const icon = dock.value?.itemEls().at(-1)
  if (icon) animate(icon, { opacity: [0, 1], scale: ['0.6', '1'] }, { duration: 200 })
}

// Minimized, it comes back on top; open, it comes to the front.
function show(win: Win): void {
  if (win.open) frames[win.id]?.focus()
  else win.open = true
}

// The window leaves in place while its icon shrinks away, then the dock closes up. The last one's
// icon goes with the whole dock.
async function close(win: Win): Promise<void> {
  win.closing = true
  const icon = dock.value?.itemEls()[docked.value.indexOf(win)]
  if (icon && docked.value.length > 1)
    await animate(icon, { opacity: 0, scale: '0.6' }, { duration: 150 })
  win.docked = false
}

function remove(win: Win): void {
  wins.splice(wins.indexOf(win), 1)
  delete frames[win.id]
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
}
.dock-shell {
  position: fixed;
  inset-block-end: 1rem;
  inset-inline: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.dock-shell > * {
  pointer-events: auto;
}
</style>
