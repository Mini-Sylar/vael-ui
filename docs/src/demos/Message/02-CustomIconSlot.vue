<template>
  <section class="demo">
    <h3>Custom icon with <code>#icon</code> (Phosphor)</h3>
    <p class="note">
      The <code>#icon</code> slot replaces the automatic <code>StatusIcon</code> on one Message, so
      you can use any icon set, such as Phosphor.
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
