<template>
  <section class="demo">
    <h3>Custom <code>#icon</code> slot (Phosphor)</h3>
    <p class="note">
      The <code>#icon</code> slot overrides the automatic <code>StatusIcon</code> per instance, pass
      any icon set you like, including Phosphor.
    </p>
    <div class="message-stack">
      <Message title="Automatic icon" variant="success">
        No <code>#icon</code> given, so the variant's own <code>StatusIcon</code> renders.
      </Message>
      <Message title="Starred repository" variant="default">
        <template #icon>
          <PhStar weight="fill" />
        </template>
        Custom <code>#icon</code> slot, here a filled Phosphor star instead of the default glyph.
      </Message>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Message } from 'vael-ui'
import { PhStar } from '@phosphor-icons/vue'
</script>

<style scoped>
.message-stack {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}
</style>
