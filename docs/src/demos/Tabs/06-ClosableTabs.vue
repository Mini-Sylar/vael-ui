<template>
  <section class="demo">
    <h3>Closable tabs</h3>
    <p class="note">
      Render each tab yourself, with a close button inside it. When you close the selected tab, the
      tab to its right is selected, or the one to its left if it was last. Focus moves to that tab,
      so keyboard users keep their place. Delete or Backspace closes the focused tab.
    </p>
    <Tabs v-model:active="active" :items="files" id-base="files">
      <template #default="{ items: list, itemProps, indicatorProps, tabId }">
        <div v-bind="indicatorProps()" />
        <div
          v-for="file in list"
          :key="file"
          v-bind="itemProps(file)"
          class="closable-tab"
          @keydown.delete="close(file, tabId)"
        >
          <span class="tab-label">{{ file }}</span>
          <button
            type="button"
            class="tab-close"
            tabindex="-1"
            :aria-label="`Close ${file}`"
            @click.stop="close(file, tabId)"
          >
            <PhX :size="12" aria-hidden="true" />
          </button>
        </div>
      </template>
    </Tabs>
    <p v-if="files.length === 0" class="demo-status">
      All tabs closed. <Button size="sm" variant="ghost" @click="reset">Reopen them</Button>
    </p>
    <p v-else class="demo-status">Editing {{ active }}</p>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, shallowRef } from 'vue'
import { Button, Tabs } from 'vael-ui'
import { PhX } from '@phosphor-icons/vue'

const ALL = ['App.vue', 'main.ts', 'router.ts', 'store.ts']
const files = ref([...ALL])
const active = shallowRef(ALL[0]!)

async function close(file: string, tabId: (item: string) => string) {
  const index = files.value.indexOf(file)
  const wasActive = file === active.value
  files.value.splice(index, 1)
  if (files.value.length === 0) return
  // The neighbor takes the closed tab's place: the one to its right, or the new last one.
  if (wasActive) active.value = files.value[Math.min(index, files.value.length - 1)]!
  await nextTick()
  document.getElementById(tabId(active.value))?.focus()
}

function reset() {
  files.value = [...ALL]
  active.value = ALL[0]!
}
</script>

<style scoped>
.closable-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding-inline-end: 0.375rem;
  cursor: pointer;
}
.tab-label {
  display: inline-block;
}
.tab-close {
  display: grid;
  place-items: center;
  inline-size: 1.125rem;
  block-size: 1.125rem;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  opacity: 0.55;
  cursor: pointer;
}
@media (hover: hover) and (pointer: fine) {
  .tab-close:hover {
    opacity: 1;
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
}
</style>
