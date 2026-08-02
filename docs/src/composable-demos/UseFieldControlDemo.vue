<template>
  <section class="demo">
    <Field
      label="Username"
      description="A fully custom input, not vael-ui's Input — Field still knows how to label it, describe it, and show its error, because the input wires itself in with useFieldControl."
      :error="error"
      required
    >
      <input
        :id="control.id"
        v-model="username"
        class="custom-input"
        :aria-describedby="control.describedBy()"
        :aria-invalid="control.invalid() || undefined"
        :aria-required="control.required() || undefined"
        @focus="control.onFocus"
        @blur="control.onBlur"
      />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Field, useFieldControl } from 'vael-ui'

const username = shallowRef('')
const error = computed(() =>
  username.value.length > 0 && username.value.length < 3 ? 'Too short.' : undefined,
)

const control = useFieldControl({ filled: () => username.value.length > 0 })
</script>

<style scoped>
.demo {
  inline-size: 18rem;
}

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
