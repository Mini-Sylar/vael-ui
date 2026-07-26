<template>
  <section class="demo">
    <h2>FileUpload</h2>
    <p class="note">
      The library's job ends at a validated <code>File[]</code> model, no HTTP client, no
      auto-upload. Drag files onto the dropzone, click Browse, or click the dropzone itself.
    </p>

    <h3>Avatar upload (single file, image preview)</h3>
    <p class="note">
      <code>:multiple="false"</code> replaces the model on each pick instead of appending. The
      <code>#item</code> slot renders an object-URL preview of the picked image plus a real
      <code>Button</code> to clear it, the library still owns the row's mount/unmount transition.
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

    <h3>Extreme: GSAP stagger-in for new files (gsap)</h3>
    <p class="note">
      Drop several files at once, each row pops in with an offset delay via a GSAP stagger, layered
      on top of (not instead of) the library's own opacity fade on the <code>&lt;li&gt;</code>. The
      consumer only reaches the row's content via a function ref, never an internal class.
    </p>
    <FileUpload v-model:files="staggerFiles" @add="onStaggerAdd">
      <template #item="{ file, remove }">
        <div :ref="(el) => setStaggerRef(file, el as HTMLElement | null)" class="stagger-item">
          <span class="upload-item-name">{{ file.name }}</span>
          <Button size="sm" variant="ghost" icon aria-label="Remove file" @click="remove">
            <PhX weight="bold" />
          </Button>
        </div>
      </template>
    </FileUpload>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, reactive, shallowRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Button, FileUpload, Progress, toast } from 'vael-ui'
import type { FileRejectReason } from 'vael-ui'
import { PhTrash, PhX } from '@phosphor-icons/vue'

// Avatar upload: a single-file model plus an object-URL preview, revoked whenever it's replaced.
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

const uploadFiles = shallowRef<File[]>([])

// Key by file fingerprint; File objects aren't stable across model swaps
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

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const staggerFiles = shallowRef<File[]>([])
const staggerRefs = new Map<string, HTMLElement>()
function setStaggerRef(file: File, el: HTMLElement | null) {
  if (el) staggerRefs.set(fileKey(file), el)
  else staggerRefs.delete(fileKey(file))
}
function onStaggerAdd(files: File[]) {
  if (reduce()) return
  void nextTick(() => {
    const els = files.map((file) => staggerRefs.get(fileKey(file))).filter((el) => el != null)
    if (els.length === 0) return
    gsap.from(els, {
      y: 14,
      scale: 0.92,
      duration: 0.4,
      stagger: 0.06,
      ease: 'back.out(1.6)',
      clearProps: 'all',
    })
  })
}
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
.stagger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
</style>
