<!-- Avatar with every part: one with a loaded image and a status badge, one showing its initials fallback. -->
<template>
  <div data-specimen class="specimen">
    <div class="person">
      <Avatar :src="portrait" name="Ada Lovelace" size="lg">
        <template #badge><Badge dot variant="success" /></template>
      </Avatar>
      <span class="name">Ada Lovelace</span>
    </div>
    <div class="person">
      <Avatar name="Grace Hopper" size="lg" />
      <span class="name">Grace Hopper</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Avatar, Badge } from 'vael-ui'

// An inline portrait, so the image loads without a network request.
const portrait =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#8fb5e8"/><stop offset="1" stop-color="#c9a6e4"/>' +
      '</linearGradient></defs>' +
      '<rect width="80" height="80" fill="url(#g)"/>' +
      '<circle cx="40" cy="32" r="14" fill="#f3e3d3"/>' +
      '<path d="M14 80c2-16 13-26 26-26s24 10 26 26z" fill="#3f4a6b"/>' +
      '</svg>',
  )
</script>

<style scoped>
.specimen {
  display: flex;
  gap: 2rem;
}
.person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.name {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
