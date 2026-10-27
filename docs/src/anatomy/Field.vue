<!-- Field with every part: a label, a control group with prepend and append cells, a description and an error. -->
<template>
  <div data-specimen class="specimen">
    <Field
      label="Workspace URL"
      description="Your team signs in here."
      error="That address is already taken."
      required
    >
      <template #prepend>https://</template>
      <Input v-model="slug" />
      <template #append>.vael.app</template>
    </Field>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Input } from 'vael-ui'

const slug = shallowRef('lovelace')
</script>

<style scoped>
.specimen {
  inline-size: min(22rem, 100%);
}
</style>
