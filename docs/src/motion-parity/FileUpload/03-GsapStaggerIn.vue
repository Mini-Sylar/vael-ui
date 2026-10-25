<template>
  <section class="demo">
    <h3>Extreme: new files stagger in</h3>
    <p class="note">
      Drop several files at once and each row pops in after the one before it. The row's content is
      <code>v-animate</code> with an <code>initial</code> and a <code>stagger</code>, so rows added
      in the same moment rise one after another, on top of FileUpload's own opacity fade on the
      <code>&lt;li&gt;</code>.
    </p>
    <FileUpload v-model:files="files">
      <template #item="{ file, remove }">
        <div v-animate="pop" class="stagger-item">
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
import { shallowRef } from 'vue'
import { Button, FileUpload, vAnimate } from 'vael-ui'
import { PhX } from '@phosphor-icons/vue'

const files = shallowRef<File[]>([])

// Each row's content rises and grows in with a small overshoot, 60 ms after the one before.
const pop = {
  initial: { y: 14, scale: 0.92 },
  stagger: 0.06,
  spring: { damping: 0.6, response: 0.4 },
}
</script>

<style scoped>
.stagger-item {
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
