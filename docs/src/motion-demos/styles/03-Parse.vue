<template>
  <section class="demo">
    <Textarea v-model="text" :rows="8" class="field" />
    <ul v-if="parsed.issues.length" class="issues">
      <li v-for="issue in parsed.issues" :key="issue">{{ issue }}</li>
    </ul>
    <ConfigProvider :motion="parsed.style">
      <Button @click="open = true">Open dialog</Button>
      <Dialog v-model:open="open" title="Rename project">
        <p>Edit the style above and open this again.</p>
      </Dialog>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button, ConfigProvider, Dialog, Textarea, parseMotionStyle } from 'vael-ui'

const text = ref(`{
  "version": 1,
  "spring": { "damping": 0.6, "response": 0.4 },
  "overlay": {
    "initial": { "opacity": 0, "scale": "0.85", "filter": "url(#x)" }
  }
}`)
const open = ref(false)

const parsed = computed(() => {
  try {
    return parseMotionStyle(JSON.parse(text.value))
  } catch {
    return { style: { version: 1 as const }, issues: ['not valid JSON'] }
  }
})
</script>

<style scoped>
.field {
  width: 100%;
  margin-bottom: 0.5rem;
  font-family: ui-monospace, monospace;
}
.issues {
  margin: 0 0 0.75rem;
  padding-left: 1.25rem;
  color: var(--ui-text-muted);
}
</style>
