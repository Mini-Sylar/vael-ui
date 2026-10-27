<!-- Textarea with every part: the field, its start and end slots, and the bottom action strip. -->
<template>
  <div data-specimen class="specimen">
    <Textarea v-model="reply" :rows="3" aria-label="Reply">
      <template #start><span class="avatar" aria-hidden="true">AL</span></template>
      <template #end><Kbd>⌘↵</Kbd></template>
      <template #bottom-start>
        <Button size="sm" variant="ghost" aria-label="Attach a file"
          ><PhPaperclip :size="16"
        /></Button>
      </template>
      <template #bottom-end>
        <span class="count">{{ reply.length }}/280</span>
        <Button size="sm">Send</Button>
      </template>
    </Textarea>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Kbd, Textarea } from 'vael-ui'
import { PhPaperclip } from '@phosphor-icons/vue'

const reply = shallowRef('Thanks, Ada. The new billing email is live for the whole team.')
</script>

<style scoped>
.specimen {
  inline-size: min(24rem, 100%);
}
.avatar {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 9999px;
  background: var(--ui-muted);
  font-size: 0.6875rem;
  font-weight: 600;
}
.count {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
</style>
