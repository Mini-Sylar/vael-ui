<template>
  <section class="demo">
    <h3><code>disabled</code>, trigger click is a no-op</h3>
    <Collapsible :open="false" disabled class="collapsible-demo">
      <template #trigger="{ open }">
        <Button variant="outline" disabled>{{ open ? 'Hide' : 'Show' }} disabled panel</Button>
      </template>
      <p class="collapsible-panel-text">Never shown, the trigger above is disabled.</p>
    </Collapsible>
  </section>
</template>

<script setup lang="ts">
import { Button, Collapsible } from 'vael-ui'
</script>

<style scoped>
.collapsible-demo {
  max-width: 24rem;
  margin-block-end: 1.5rem;
}
.collapsible-panel-text {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
</style>
