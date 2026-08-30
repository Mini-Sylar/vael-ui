<template>
  <section class="demo">
    <h3><code>allowHalf</code> precision</h3>
    <p class="note">Half-star steps for both pointer and keyboard (arrow keys step by 0.5).</p>
    <Rating v-model="value" allow-half :max="5" />
    <p class="note">Value: {{ value }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Rating } from 'vael-ui'

const value = shallowRef(3.5)
</script>
