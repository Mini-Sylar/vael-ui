<template>
  <section class="demo">
    <h3>Custom <code>#header</code> slot</h3>
    <p class="note">
      Replaces the title and close row entirely: the default is opt-in, not forced.
    </p>
    <Button @click="customHeaderOpen = true">Share this page</Button>
    <BottomSheet v-model:open="customHeaderOpen" aria-label="Share">
      <template #header="{ close }">
        <div class="sheet-custom-header">
          <span class="sheet-custom-header-icon" aria-hidden="true">↗</span>
          <span class="sheet-title">Share this page</span>
          <Button size="sm" variant="ghost" @click="close()">Done</Button>
        </div>
      </template>
      <p class="sheet-lede">The trailing action here is "Done", not an ×, fully consumer-owned.</p>
    </BottomSheet>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, BottomSheet } from 'vael-ui'

const customHeaderOpen = shallowRef(false)
</script>

<style scoped>
.sheet-title {
  font-size: 0.9375rem;
  font-weight: 600;
}
.sheet-lede {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
.sheet-custom-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  inline-size: 100%;
}
.sheet-custom-header-icon {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 50%;
  background: var(--ui-muted);
}
.sheet-custom-header .sheet-title {
  flex: 1;
}
</style>
