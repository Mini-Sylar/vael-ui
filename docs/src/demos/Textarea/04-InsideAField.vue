<template>
  <section class="demo">
    <h3>Inside a Field</h3>
    <Field label="Bio" description="Shown on your public profile." label-placement="top">
      <Textarea v-model="bioValue" :rows="3" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Textarea } from 'vael-ui'

const bioValue = shallowRef('')
</script>
