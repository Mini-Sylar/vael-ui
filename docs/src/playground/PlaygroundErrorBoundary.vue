<template>
  <p v-if="error" class="playground-error">
    Interactive preview isn't available for this component's current props. See the examples below.
  </p>
  <slot v-else />
</template>

<script setup lang="ts">
import { onErrorCaptured, shallowRef, watch } from 'vue'

const props = defineProps<{ resetKey: unknown }>()
const error = shallowRef(false)

onErrorCaptured((err) => {
  error.value = true
  console.error('[playground]', err)
  return false
})

watch(
  () => props.resetKey,
  () => (error.value = false),
)
</script>

<style scoped>
.playground-error {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
}
</style>
