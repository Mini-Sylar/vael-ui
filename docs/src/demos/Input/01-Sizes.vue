<template>
  <section class="demo">
    <h3>Sizes</h3>
    <div class="row">
      <Input v-model="sizeValue" size="sm" placeholder="Small" />
      <Input v-model="sizeValue" size="md" placeholder="Medium" />
      <Input v-model="sizeValue" size="lg" placeholder="Large" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Input } from 'vael-ui'

const sizeValue = shallowRef('')
</script>
