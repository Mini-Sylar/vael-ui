<template>
  <section class="demo">
    <h3>Inside a Field</h3>
    <Field label="Rate your experience" description="1 to 5, half-stars allowed.">
      <Rating v-model="fieldValue" allow-half name="experience" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Rating } from 'vael-ui'

const fieldValue = shallowRef(0)
</script>
