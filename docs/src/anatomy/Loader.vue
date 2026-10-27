<!-- Loader next to the text it stands for, as in a saving status. -->
<template>
  <div data-specimen class="specimen">
    <span class="status"><Loader size="1.25rem" /> Saving changes…</span>
  </div>
</template>

<script setup lang="ts">
import { Loader } from 'vael-ui'
</script>

<style scoped>
.specimen {
  display: flex;
  justify-content: center;
  inline-size: min(18rem, 100%);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
