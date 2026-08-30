<template>
  <section class="demo">
    <h3><code>#start</code>/<code>#end</code> and the bottom action strip</h3>
    <Textarea v-model="composerValue" auto-grow :rows="2" :max-rows="6" class="textarea-fixed">
      <template #start>
        <span class="textarea-avatar" aria-hidden="true">AL</span>
      </template>
      <template #bottom-start>
        <Button size="sm" variant="ghost">Attach</Button>
      </template>
      <template #bottom-end>
        <span class="note char-count">{{ composerValue.length }}/280</span>
        <Button size="sm" :disabled="!composerValue">Post</Button>
      </template>
    </Textarea>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Textarea } from 'vael-ui'

const composerValue = shallowRef('')
</script>

<style scoped>
.textarea-fixed {
  max-width: 28rem;
  margin-block-end: 0.75rem;
}
.textarea-avatar {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 9999px;
  background: var(--ui-muted);
  font-size: 0.6875rem;
  font-weight: 600;
}
.char-count {
  margin-inline-end: 0.5rem;
}
</style>
