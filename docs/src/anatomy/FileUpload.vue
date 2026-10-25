<!-- FileUpload with every part: the dropzone, and a list of three files, each with a remove button. -->
<template>
  <div data-specimen class="specimen">
    <FileUpload v-model:files="files" multiple />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { FileUpload } from 'vael-ui'

// Files of a given size, filled with zeros.
const file = (name: string, kb: number, type: string) =>
  new File([new Uint8Array(kb * 1024)], name, { type })

const files = shallowRef<File[]>([
  file('team-plan.pdf', 240, 'application/pdf'),
  file('invoice-2026-10.pdf', 86, 'application/pdf'),
  file('avatar.png', 412, 'image/png'),
])
</script>

<style scoped>
.specimen {
  inline-size: min(22rem, 100%);
}
</style>
