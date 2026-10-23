<template>
  <section class="demo">
    <h3>Half stars with <code>allowHalf</code></h3>
    <p class="note">
      Half-star steps for the pointer and the keyboard, where the arrow keys step by 0.5.
    </p>
    <Field label="Your rating">
      <Rating v-model="value" allow-half :max="5" />
    </Field>
    <p class="demo-status">Value: {{ value }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Rating } from 'vael-ui'

const value = shallowRef(3.5)
</script>
