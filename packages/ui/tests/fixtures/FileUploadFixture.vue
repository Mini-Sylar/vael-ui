<template>
  <FileUpload data-testid="basic" v-model:files="files" />
  <output data-testid="count">{{ files.length }}</output>

  <FileUpload
    data-testid="accept"
    v-model:files="acceptFiles"
    accept="image/*"
    @reject="onReject('accept', $event)"
  />
  <output data-testid="accept-rejects">{{ rejects.accept.length }}</output>
  <output data-testid="accept-count">{{ acceptFiles.length }}</output>

  <FileUpload
    data-testid="maxsize"
    v-model:files="maxSizeFiles"
    :max-size="10"
    @reject="onReject('maxSize', $event)"
  />
  <output data-testid="maxsize-rejects">{{ rejects.maxSize.length }}</output>

  <FileUpload
    data-testid="maxfiles"
    v-model:files="maxFilesFiles"
    :max-files="1"
    @reject="onReject('maxFiles', $event)"
  />
  <output data-testid="maxfiles-rejects">{{ rejects.maxFiles.length }}</output>
  <output data-testid="maxfiles-count">{{ maxFilesFiles.length }}</output>

  <FileUpload data-testid="dedupe" v-model:files="dedupeFiles" />
  <output data-testid="dedupe-count">{{ dedupeFiles.length }}</output>

  <FileUpload data-testid="itemslot" v-model:files="itemSlotFiles">
    <template #item="{ file, remove }">
      <span data-testid="custom-item">{{ file.name }}</span>
      <button type="button" data-testid="custom-remove" @click="remove">x</button>
    </template>
  </FileUpload>

  <form data-testid="form">
    <FileUpload data-testid="form-upload" v-model:files="formFiles" name="attachments" />
  </form>
</template>

<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import FileUpload from '../../src/components/FileUpload.vue'
import type { FileRejectReason } from '../../src/components/FileUpload.vue'

const files = shallowRef<File[]>([])
const acceptFiles = shallowRef<File[]>([])
const maxSizeFiles = shallowRef<File[]>([])
const maxFilesFiles = shallowRef<File[]>([])
const dedupeFiles = shallowRef<File[]>([])
const itemSlotFiles = shallowRef<File[]>([])
const formFiles = shallowRef<File[]>([])

const rejects = reactive<{ accept: unknown[]; maxSize: unknown[]; maxFiles: unknown[] }>({
  accept: [],
  maxSize: [],
  maxFiles: [],
})

function onReject(bucket: keyof typeof rejects, payload: { file: File; reason: FileRejectReason }) {
  rejects[bucket].push(payload)
}

defineExpose({
  files,
  acceptFiles,
  maxSizeFiles,
  maxFilesFiles,
  dedupeFiles,
  itemSlotFiles,
  formFiles,
  rejects,
})
</script>
