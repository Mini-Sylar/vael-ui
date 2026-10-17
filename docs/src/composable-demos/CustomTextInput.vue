<template>
  <input
    :id="control.id"
    v-model="model"
    class="custom-input"
    :aria-describedby="control.describedBy()"
    :aria-invalid="control.invalid() || undefined"
    :aria-required="control.required() || undefined"
    @focus="control.onFocus"
    @blur="control.onBlur"
  />
</template>

<script setup lang="ts">
import { useFieldControl } from 'vael-ui'

const model = defineModel<string>({ default: '' })

// Inside the Field's slot, so it picks up that Field's id and ARIA wiring.
const control = useFieldControl({ filled: () => model.value.length > 0 })
</script>

<style scoped>
.custom-input {
  inline-size: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) - 2px);
  background: var(--ui-surface);
  color: var(--ui-text);
  font: inherit;
}

.custom-input[aria-invalid='true'] {
  border-color: var(--ui-danger);
}
</style>
