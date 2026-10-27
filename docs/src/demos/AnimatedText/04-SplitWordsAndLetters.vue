<template>
  <section class="demo">
    <h3>Word by word, or letter by letter</h3>
    <p class="note">
      <code>split</code> brings a new value in a piece at a time. Screen readers still read it
      whole.
    </p>
    <div class="rows">
      <p class="status">
        <AnimatedText :value="statuses[index]!" split="words" />
      </p>
      <p class="headline">
        <AnimatedText :value="words[index]!" split="letters" class="word" />
      </p>
    </div>
    <Button variant="secondary" @click="index = (index + 1) % words.length">Next</Button>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatedText, Button } from 'vael-ui'

const statuses = ['Uploading three files', 'Checking for duplicates', 'All files are safe']
const words = ['Upload', 'Check', 'Done']
const index = shallowRef(0)
</script>

<style scoped>
.rows {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.status {
  margin: 0;
  color: var(--ui-text-muted);
}
.headline {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.word {
  color: var(--ui-primary);
}
</style>
