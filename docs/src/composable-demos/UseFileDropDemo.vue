<template>
  <section class="demo">
    <h3>A drop zone of your own</h3>
    <p class="note">
      Drag files from your desktop onto the box. <code>isDragOver</code> turns on while a drag is
      over it, and stays on as the pointer crosses the text inside. The composable passes every
      dropped file to <code>onFiles</code>; this demo keeps images and rejects the rest itself,
      since validation is your job. The button opens a file picker for anyone who can't drag.
    </p>
    <div ref="zone" class="drop-zone" :data-over="isDragOver || undefined">
      <p>{{ isDragOver ? 'Drop to add' : 'Drop images here' }}</p>
      <Button size="sm" variant="outline" @click="picker?.click()">Choose files</Button>
      <input ref="picker" type="file" accept="image/*" multiple hidden @change="onPick" />
    </div>
    <ul v-if="files.length > 0" class="drop-list">
      <li v-for="file in files" :key="file.name + file.size">
        {{ file.name }} <span>{{ (file.size / 1024).toFixed(0) }} KB</span>
      </li>
    </ul>
    <p v-if="rejected > 0" class="demo-status">
      Skipped {{ rejected }} {{ rejected === 1 ? 'file' : 'files' }} that weren't images.
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, useFileDrop } from 'vael-ui'

const zone = useTemplateRef<HTMLElement>('zone')
const picker = useTemplateRef<HTMLInputElement>('picker')
const files = shallowRef<File[]>([])
const rejected = shallowRef(0)

function add(incoming: File[]) {
  const images = incoming.filter((file) => file.type.startsWith('image/'))
  rejected.value = incoming.length - images.length
  files.value = [...files.value, ...images]
}

const { isDragOver } = useFileDrop(zone, { onFiles: add })

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  add(Array.from(input.files ?? []))
  input.value = ''
}
</script>

<style scoped>
.drop-zone {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  max-inline-size: 28rem;
  padding: 2rem 1rem;
  border: 2px dashed var(--ui-border);
  border-radius: var(--ui-radius);
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  transition:
    border-color var(--ui-duration-press) ease,
    background-color var(--ui-duration-press) ease;
}
.drop-zone p {
  margin: 0;
}
.drop-zone[data-over] {
  border-color: var(--ui-primary);
  background: color-mix(in oklch, var(--ui-primary) 8%, transparent);
}
.drop-list {
  display: grid;
  gap: 0.25rem;
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: 0.875rem;
}
.drop-list span {
  color: var(--ui-text-muted);
}
</style>
