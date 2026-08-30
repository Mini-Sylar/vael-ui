<template>
  <section class="demo">
    <h3>Determinate, with a real numeric value</h3>
    <div class="row progress-row">
      <Progress :value="uploadValue" label="Uploading" style="max-width: 20rem" />
      <Button size="sm" variant="outline" @click="startUpload">
        {{ uploadValue > 0 && uploadValue < 100 ? 'Uploading…' : 'Start upload' }}
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Progress } from 'vael-ui'

const uploadValue = shallowRef(0)
let uploadTimer: ReturnType<typeof setInterval> | undefined

function startUpload() {
  clearInterval(uploadTimer)
  uploadValue.value = 0
  uploadTimer = setInterval(() => {
    uploadValue.value = Math.min(100, uploadValue.value + 8)
    if (uploadValue.value >= 100) clearInterval(uploadTimer)
  }, 150)
}
</script>

<style scoped>
.progress-row {
  align-items: center;
}
</style>
