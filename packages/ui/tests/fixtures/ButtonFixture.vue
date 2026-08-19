<template>
  <Button loading="auto" :loader :variant :size @click="onClick">
    <template #default="{ loading }">
      {{ !staticLabel && loading ? 'Saving…' : 'Save' }}
    </template>
  </Button>
</template>

<script setup lang="ts">
import Button from '../../src/components/Button/Button.vue'
import type {
  ButtonLoaderPlacement,
  ButtonSize,
  ButtonVariant,
} from '../../src/components/Button/Button.vue'

const props = defineProps<{
  task: () => Promise<unknown>
  /** Keep the label constant to test that the overlay loader never shifts layout. */
  staticLabel?: boolean
  loader?: ButtonLoaderPlacement
  variant?: ButtonVariant
  size?: ButtonSize
}>()

// loading="auto" (opt-in, not the default) is all the wiring auto-loading
// needs beyond this — no template ref, no run().
function onClick() {
  return props.task()
}
</script>
