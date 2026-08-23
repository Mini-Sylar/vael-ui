<template>
  <ul v-draggable="items" data-testid="vapor-draggable-list">
    <li v-for="item in items" :key="item" :data-testid="`item-${item}`">{{ item }}</li>
  </ul>
</template>

<script setup lang="ts" vapor>
// Built dist import, not source — see built-draggable.test.ts's own comment.
import { vDraggable } from 'vael-ui/vapor'

const items = ['a', 'b', 'c']
</script>
