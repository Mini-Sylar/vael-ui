<template>
  <section class="demo">
    <h3>Fixed rows (default)</h3>
    <Textarea v-model="fixedValue" :rows="3" placeholder="Doesn't grow" class="textarea-fixed" />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Textarea } from 'vael-ui'

const fixedValue = shallowRef('')
</script>

<style scoped>
.textarea-fixed {
  max-width: 28rem;
  margin-block-end: 0.75rem;
}
</style>
