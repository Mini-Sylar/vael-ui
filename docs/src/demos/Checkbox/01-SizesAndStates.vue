<template>
  <section class="demo">
    <h3>Sizes and states</h3>
    <div class="row">
      <Checkbox v-model="basic" size="sm" label="Small" />
      <Checkbox v-model="basic" size="md" label="Medium" />
      <Checkbox :model-value="true" label="Checked" disabled />
      <Checkbox :model-value="false" label="Unchecked" disabled />
      <Checkbox v-model="invalidChecked" label="Invalid" invalid />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Checkbox } from 'vael-ui'

const basic = shallowRef(false)
const invalidChecked = shallowRef(false)
</script>
