<template>
  <section class="demo">
    <h3>Multi-file drag-and-drop, with per-file progress</h3>
    <p class="note">
      Upload progress is a consumer composition, not a library feature: each added file gets a fake
      timer driving its own <code>Progress</code> value. Constrained here to images/PDF/text,
      5&nbsp;MB max, 3 files max, drop something else (or something huge) to see the reject-toast
      path.
    </p>
    <FileUpload
      v-model:files="uploadFiles"
      :max-size="5 * 1024 * 1024"
      :max-files="3"
      accept="image/*,.pdf,.txt"
      @add="onAdd"
      @remove="onFileRemove"
      @reject="onReject"
    >
      <template #item="{ file, remove }">
        <div class="upload-item">
          <div class="upload-item-row">
            <span class="upload-item-name">{{ file.name }}</span>
            <Button size="sm" variant="ghost" icon aria-label="Remove file" @click="remove">
              <PhX weight="bold" />
            </Button>
          </div>
          <Progress :value="progressFor(file)" size="sm" />
        </div>
      </template>
    </FileUpload>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { Button, FileUpload, Progress, toast } from 'vael-ui'
import type { FileRejectReason } from 'vael-ui'
import { PhX } from '@phosphor-icons/vue'

const uploadFiles = shallowRef<File[]>([])

const progress = reactive(new Map<string, number>())
const timers = new Map<string, ReturnType<typeof setInterval>>()

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function progressFor(file: File): number {
  return progress.get(fileKey(file)) ?? 0
}

function onAdd(files: File[]) {
  for (const file of files) {
    const key = fileKey(file)
    progress.set(key, 0)
    const timer = setInterval(() => {
      const current = progress.get(key) ?? 0
      const next = Math.min(100, current + 8 + Math.random() * 10)
      progress.set(key, next)
      if (next >= 100) {
        clearInterval(timer)
        timers.delete(key)
      }
    }, 200)
    timers.set(key, timer)
  }
}

function onFileRemove(file: File) {
  const key = fileKey(file)
  const timer = timers.get(key)
  if (timer) clearInterval(timer)
  timers.delete(key)
  progress.delete(key)
}

const REJECT_REASON_TEXT: Record<FileRejectReason, string> = {
  accept: 'is not an accepted file type',
  maxSize: 'is larger than 5 MB',
  maxFiles: "would exceed this dropzone's 3-file limit",
}

function onReject({ file, reason }: { file: File; reason: FileRejectReason }) {
  toast.error(`"${file.name}" ${REJECT_REASON_TEXT[reason]}`)
}
</script>

<style scoped>
.upload-item {
  display: grid;
  gap: 0.375rem;
}
.upload-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
.upload-item-name {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
