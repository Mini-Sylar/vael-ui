<template>
  <slot />
</template>

<!-- Controls inside a Field #prepend/#append cell get their own id and stay unnamed by the Field's label; disabled and focus still flow through -->
<script setup lang="ts">
import { inject, provide } from 'vue'
import { fieldKey } from '../../composables/fieldContext'
import type { FieldContext } from '../../composables/fieldContext'

const field = inject(fieldKey, undefined)

// controlId/labelId stay undefined so each control in the cell falls back to its own useId().
const cellContext = {
  controlId: undefined,
  labelId: undefined,
  describedBy: () => undefined,
  invalid: () => false,
  required: () => false,
  disabled: () => field?.disabled() ?? false,
  reportFocus: (focused: boolean) => field?.reportFocus(focused),
  reportFilled: () => {},
  reportStartInset: () => {},
} as unknown as FieldContext

provide(fieldKey, cellContext)
</script>
