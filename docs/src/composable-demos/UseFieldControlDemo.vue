<template>
  <section class="demo">
    <Field
      label="Username"
      description="A fully custom input, not vael-ui's Input — Field still knows how to label it, describe it, and show its error, because the input wires itself in with useFieldControl."
      :error="error"
      required
    >
      <CustomTextInput v-model="username" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Field } from 'vael-ui'
import CustomTextInput from './CustomTextInput.vue'

const username = shallowRef('')
const error = computed(() =>
  username.value.length > 0 && username.value.length < 3 ? 'Too short.' : undefined,
)
</script>

<style scoped>
.demo {
  inline-size: 18rem;
}
</style>
