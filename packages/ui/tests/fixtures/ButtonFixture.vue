<template>
  <Button :loader :variant :size @click="onClick">
    <template #default="{ loading }">
      {{ !staticLabel && loading ? 'Saving…' : 'Save' }}
    </template>
  </Button>
</template>

<script setup lang="ts">
import Button from '../../src/components/Button.vue'
import type {
  ButtonLoaderPlacement,
  ButtonSize,
  ButtonVariant,
} from '../../src/components/Button.vue'

const props = defineProps<{
  task: () => Promise<unknown>
  /** Keep the label constant to test that the overlay loader never shifts layout. */
  staticLabel?: boolean
  loader?: ButtonLoaderPlacement
  variant?: ButtonVariant
  size?: ButtonSize
}>()

// The new default-auto contract: returning a promise from @click is all the
// wiring auto-loading needs — no template ref, no run().
function onClick() {
  return props.task()
}
</script>
