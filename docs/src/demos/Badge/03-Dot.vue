<template>
  <section class="demo">
    <h3>Dot</h3>
    <div class="row">
      <span class="badge-status"><Badge dot variant="success" /> Online</span>
      <span class="badge-status"><Badge dot variant="warning" /> Away</span>
      <span class="badge-status"><Badge dot variant="danger" /> Busy</span>
      <Avatar name="Ada Lovelace">
        <template #badge>
          <Badge dot variant="success" />
        </template>
      </Avatar>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Avatar, Badge } from 'vael-ui'
</script>

<style scoped>
.badge-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}
</style>
