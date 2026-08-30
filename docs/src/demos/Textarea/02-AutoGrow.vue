<template>
  <section class="demo">
    <h3>Auto-grow, native <code>field-sizing: content</code>, capped at <code>maxRows</code></h3>
    <p class="note">Type past the visible rows and watch it grow, up to 8 rows, then scroll.</p>
    <Textarea
      v-model="growValue"
      auto-grow
      :rows="2"
      :max-rows="8"
      placeholder="Keep typing…"
      class="textarea-fixed"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Textarea } from 'vael-ui'

const growValue = shallowRef('')
</script>

<style scoped>
.textarea-fixed {
  max-width: 28rem;
  margin-block-end: 0.75rem;
}
</style>
