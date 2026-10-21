<template>
  <section class="demo">
    <h3>A rotating word</h3>
    <p class="note">
      Swap the value on a timer for a headline. The words after it ease along with the width. Tune
      it with <code>--ui-duration-text</code> and <code>--ui-ease-text</code>.
    </p>
    <p class="headline">
      Design for every <AnimatedText :value="words[index]!" class="word" />, in one place.
    </p>
  </section>
</template>

<script setup lang="ts">
import { onScopeDispose, shallowRef } from 'vue'
import { AnimatedText } from 'vael-ui'

const words = ['screen', 'language', 'theme', 'team', 'idea']
const index = shallowRef(0)
const timer = setInterval(() => (index.value = (index.value + 1) % words.length), 1800)
onScopeDispose(() => clearInterval(timer))
</script>

<style scoped>
.headline {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.word {
  color: var(--ui-primary);
  --ui-duration-text: 350ms;
}
</style>
