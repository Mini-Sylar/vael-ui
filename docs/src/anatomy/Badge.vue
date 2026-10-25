<!-- Badge on buttons: a count, a dot and a capped count. -->
<template>
  <div data-specimen class="specimen">
    <Button icon variant="outline" aria-label="Notifications, 3 unread">
      <template #badge><Badge variant="danger" :count="3" /></template>
      <PhBell />
    </Button>
    <Button icon variant="outline" aria-label="Messages, new">
      <template #badge><Badge dot /></template>
      <PhChatCircle />
    </Button>
    <Button variant="secondary">
      <template #badge><Badge variant="info" :count="128" /></template>
      Inbox
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Badge, Button } from 'vael-ui'
import { PhBell, PhChatCircle } from '@phosphor-icons/vue'
</script>

<style scoped>
.specimen {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  inline-size: min(18rem, 100%);
}
</style>
