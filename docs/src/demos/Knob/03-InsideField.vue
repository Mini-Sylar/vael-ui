<template>
  <section class="demo">
    <h3>Inside a Field</h3>
    <Field label="Master volume" description="0-100, drag or use the arrow keys.">
      <Knob v-model="fieldValue" :min="0" :max="100" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Knob } from 'vael-ui'

const fieldValue = shallowRef(80)
</script>
