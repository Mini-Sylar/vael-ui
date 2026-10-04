<template>
  <section class="demo">
    <h3>Update one toast with id</h3>
    <p class="note">
      Every call with the same <code>id</code> updates one toast instead of adding another, so
      progress reads as a single message. <code>toast.promise</code> takes an <code>id</code> too.
    </p>
    <ul class="files">
      <li v-for="file in files" :key="file.name">
        <span>{{ file.name }}</span>
        <span class="demo-status">{{ file.state }}</span>
      </li>
    </ul>
    <div class="row">
      <Button :disabled="uploading" @click="upload">Upload files</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { Button, toast } from 'vael-ui'

type FileState = 'Waiting' | 'Uploading…' | 'Uploaded'
const names = ['report.pdf', 'photo.png', 'notes.md']
const files = ref(names.map((name) => ({ name, state: 'Waiting' as FileState })))
const uploading = shallowRef(false)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function upload() {
  uploading.value = true
  for (const file of files.value) file.state = 'Waiting'
  for (const [i, file] of files.value.entries()) {
    file.state = 'Uploading…'
    toast.loading(`Uploading ${i + 1} of ${files.value.length}…`, {
      id: 'upload',
      description: file.name,
    })
    await wait(900)
    file.state = 'Uploaded'
  }
  toast.success(`${files.value.length} files uploaded`, { id: 'upload' })
  uploading.value = false
}
</script>

<style scoped>
.files {
  display: grid;
  gap: 0.375rem;
  max-inline-size: 24rem;
  margin: 0 0 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  list-style: none;
}

.files li {
  display: flex;
  justify-content: space-between;
}
</style>
