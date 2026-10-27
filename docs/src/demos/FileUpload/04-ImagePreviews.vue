<template>
  <section class="demo">
    <h3>Image previews</h3>
    <p class="note">
      Create an object URL for each image and show it in the <code>#item</code> slot. An object URL
      keeps its file in memory until you revoke it. Revoke each URL when its image is removed, and
      revoke the rest when the component unmounts.
    </p>
    <FileUpload v-model:files="files" accept="image/*" multiple>
      <template #item="{ file, remove }">
        <figure class="thumb">
          <img :src="previews.get(file)" :alt="file.name" />
          <figcaption>{{ file.name }}</figcaption>
          <Button
            size="sm"
            variant="ghost"
            icon
            :aria-label="`Remove ${file.name}`"
            @click="remove"
          >
            <PhX weight="bold" />
          </Button>
        </figure>
      </template>
    </FileUpload>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, reactive, shallowRef, watch } from 'vue'
import { Button, FileUpload } from 'vael-ui'
import { PhX } from '@phosphor-icons/vue'

const files = shallowRef<File[]>([])
// One object URL per file, made when it's added and revoked when it's removed.
const previews = reactive(new Map<File, string>())

watch(files, (current) => {
  for (const [file, url] of previews) {
    if (!current.includes(file)) {
      URL.revokeObjectURL(url)
      previews.delete(file)
    }
  }
  for (const file of current) {
    if (!previews.has(file)) previews.set(file, URL.createObjectURL(file))
  }
})

onUnmounted(() => previews.forEach((url) => URL.revokeObjectURL(url)))
</script>

<style scoped>
.thumb {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 0;
  font-size: 0.8125rem;
}
.thumb img {
  inline-size: 3rem;
  block-size: 3rem;
  flex: none;
  border-radius: calc(var(--ui-radius) - 4px);
  object-fit: cover;
  background: var(--ui-muted);
}
.thumb figcaption {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
