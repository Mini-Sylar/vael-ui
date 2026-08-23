<template>
  <section class="demo">
    <h3>Description, required marker, error</h3>
    <div class="field-grid">
      <Field
        label="Username"
        description="Visible to other members."
        required
        label-placement="float"
      >
        <Input v-model="username" />
      </Field>
      <Field label="Email" :error="emailError" label-placement="float">
        <Input v-model="email" type="email" :invalid="!!emailError" />
      </Field>
    </div>
    <div class="row">
      <Button
        size="sm"
        variant="outline"
        @click="emailError = emailError ? '' : 'Enter a valid email'"
      >
        Toggle error
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Field, Input } from 'vael-ui'

const username = shallowRef('')
const email = shallowRef('')
const emailError = shallowRef('')
</script>

<style scoped>
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
  max-width: 40rem;
  margin-block-end: 0.75rem;
}
</style>
