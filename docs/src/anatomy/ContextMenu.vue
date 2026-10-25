<!-- ContextMenu open with every part: right-clicked on a file, its panel has a header and a footer. -->
<template>
  <div data-specimen class="specimen">
    <ContextMenu ref="menu" v-model:open="open" :items="items" :close-on-outside="false">
      <div ref="file" class="file">
        <PhFilePdf :size="28" />
        <span>
          <strong>Q3 report.pdf</strong>
          <span class="muted">Edited by Ada Lovelace</span>
        </span>
      </div>
      <template #header><span class="muted">Q3 report.pdf</span></template>
      <template #footer><span class="muted">2.4 MB · shared with 3 people</span></template>
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { ContextMenu } from 'vael-ui'
import type { MenuEntry } from 'vael-ui'
import { PhCopy, PhDownloadSimple, PhFilePdf, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'

const items: MenuEntry[] = [
  { label: 'Rename', icon: PhPencilSimple, shortcut: 'F2' },
  { label: 'Duplicate', icon: PhCopy },
  { label: 'Download', icon: PhDownloadSimple },
  { type: 'separator' },
  { label: 'Delete', icon: PhTrash, danger: true },
]
const open = ref(false)
const menu = useTemplateRef('menu')
const file = useTemplateRef<HTMLElement>('file')

// Where it was right-clicked: a point on the file, opened there as a pointer would.
const point = () => {
  const box = file.value!.getBoundingClientRect()
  return { x: box.left + 40, y: box.bottom - 6 }
}
// The point is fixed to the viewport, so it follows the file as the page scrolls.
function follow() {
  const anchor = menu.value?.anchorEl
  if (!anchor || !file.value) return
  const { x, y } = point()
  anchor.style.left = `${x}px`
  anchor.style.top = `${y}px`
}
onMounted(() => {
  const { x, y } = point()
  menu.value?.openAt(x, y)
  addEventListener('scroll', follow, { capture: true, passive: true })
})
onBeforeUnmount(() => removeEventListener('scroll', follow, { capture: true }))
</script>

<style scoped>
.specimen {
  inline-size: min(18rem, 100%);
  min-block-size: 22rem;
}
.file {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 0.5rem);
  background: var(--ui-surface);
}
.file strong {
  display: block;
  font-size: 0.875rem;
}
.muted {
  display: block;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
