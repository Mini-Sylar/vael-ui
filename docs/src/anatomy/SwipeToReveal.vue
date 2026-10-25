<!-- SwipeToReveal with every part: a message row swiped open, its trailing actions revealed. -->
<template>
  <div data-specimen class="specimen">
    <SwipeToReveal v-model:open="open">
      <template #trailing-actions>
        <div class="actions">
          <Button variant="secondary" size="sm" icon aria-label="Archive">
            <PhArchive :size="18" />
          </Button>
          <Button variant="danger" size="sm" icon aria-label="Delete">
            <PhTrash :size="18" />
          </Button>
        </div>
      </template>
      <div class="content">
        <Avatar name="Ada Lovelace" size="sm" />
        <div class="body">
          <strong>Ada Lovelace</strong>
          <span class="preview">Your invoice is ready.</span>
        </div>
        <span class="time">9:41</span>
      </div>
    </SwipeToReveal>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Avatar, Button, SwipeToReveal } from 'vael-ui'
import { PhArchive, PhTrash } from '@phosphor-icons/vue'

const open = shallowRef(true)
</script>

<style scoped>
.specimen {
  inline-size: min(22rem, 100%);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
}
.content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}
.body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-inline-size: 0;
  font-size: 0.875rem;
}
.time {
  align-self: flex-start;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
.preview {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions {
  display: flex;
  align-items: stretch;
  gap: 1px;
  block-size: 100%;
  background: var(--ui-border);
}
.actions :deep(.ui-button) {
  border-radius: 0;
  inline-size: 3.25rem;
  block-size: auto;
}
</style>
