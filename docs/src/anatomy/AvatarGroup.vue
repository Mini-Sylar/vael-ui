<!-- AvatarGroup with every part: four stacked avatars (one photo, one with a status badge) and the "+N" overflow avatar. -->
<template>
  <div data-specimen class="specimen">
    <AvatarGroup :overflow-count="3">
      <Avatar :src="portrait" name="Ada Lovelace" />
      <Avatar name="Grace Hopper" />
      <Avatar name="Katherine Johnson" />
      <Avatar name="Margaret Hamilton" badge-placement="top-end">
        <template #badge><Badge dot variant="success" /></template>
      </Avatar>
    </AvatarGroup>
  </div>
</template>

<script setup lang="ts">
import { Avatar, AvatarGroup, Badge } from 'vael-ui'

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
