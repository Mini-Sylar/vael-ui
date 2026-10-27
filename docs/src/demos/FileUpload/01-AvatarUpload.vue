<template>
  <section class="demo">
    <h3>Avatar upload: one file with an image preview</h3>
    <p class="note">
      <code>:multiple="false"</code> replaces the file on each pick instead of adding to the list.
      The <code>#item</code> slot shows an object-URL preview of the image and a
      <code>Button</code> that removes it, while FileUpload still animates the row in and out.
    </p>
    <FileUpload v-model:files="avatarFile" :multiple="false" accept="image/*">
      <template #item="{ file, remove }">
        <div class="avatar-item">
          <img
            v-if="avatarPreviewUrl"
            :src="avatarPreviewUrl"
            :alt="`Preview of ${file.name}`"
            class="avatar-preview"
          />
          <span class="upload-item-name">{{ file.name }}</span>
          <Button size="sm" variant="ghost" icon aria-label="Remove avatar" @click="remove">
            <PhTrash weight="bold" />
          </Button>
        </div>
      </template>
    </FileUpload>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, shallowRef, watch } from 'vue'
import { Button, FileUpload } from 'vael-ui'
import { PhTrash } from '@phosphor-icons/vue'

const avatarFile = shallowRef<File[]>([])
const avatarPreviewUrl = shallowRef<string | null>(null)
watch(avatarFile, (files) => {
  if (avatarPreviewUrl.value) URL.revokeObjectURL(avatarPreviewUrl.value)
  const file = files[0]
  avatarPreviewUrl.value = file ? URL.createObjectURL(file) : null
})
onUnmounted(() => {
  if (avatarPreviewUrl.value) URL.revokeObjectURL(avatarPreviewUrl.value)
})
</script>

<style scoped>
.avatar-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.8125rem;
}
.avatar-preview {
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: 9999px;
  object-fit: cover;
  flex: none;
}
.upload-item-name {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
