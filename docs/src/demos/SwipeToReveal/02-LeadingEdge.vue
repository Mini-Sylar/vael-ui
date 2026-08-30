<template>
  <section class="demo">
    <h3>Reveal from the leading edge, <code>side="leading"</code></h3>
    <ul class="swipe-list">
      <li class="swipe-row">
        <SwipeToReveal side="leading">
          <template #actions="{ close }">
            <div class="swipe-actions">
              <Button variant="primary" size="sm" @click="close">Mark read</Button>
            </div>
          </template>
          <div class="swipe-content">
            <Avatar name="Priya Nair" size="sm" />
            <div class="swipe-body">
              <strong>Priya Nair</strong>
              <p class="note swipe-preview">
                Drag right instead, actions live behind the left edge.
              </p>
            </div>
          </div>
        </SwipeToReveal>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { Avatar, Button, SwipeToReveal } from 'vael-ui'
</script>

<style scoped>
.swipe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-inline-size: 28rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
}
.swipe-row + .swipe-row {
  border-block-start: 1px solid var(--ui-border);
}
.swipe-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--ui-surface);
}
.swipe-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-inline-size: 0;
  flex: 1;
}
.swipe-preview {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.swipe-actions {
  display: flex;
  align-items: stretch;
  gap: 1px;
  block-size: 100%;
  background: var(--ui-border);
}
.swipe-actions :deep(.ui-button) {
  border-radius: 0;
  inline-size: 5.5rem;
}
</style>
