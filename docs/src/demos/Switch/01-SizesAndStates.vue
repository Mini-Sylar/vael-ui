<template>
  <section class="demo">
    <h3>Sizes and states</h3>
    <div class="row">
      <Switch v-model="notify" size="sm" label="Small" />
      <Switch v-model="notify" size="md" label="Medium" />
      <Switch :model-value="true" label="On" disabled />
      <Switch :model-value="false" label="Off" disabled />
      <Switch v-model="invalidSwitch" label="Invalid" invalid />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Switch } from 'vael-ui'

const notify = shallowRef(true)
const invalidSwitch = shallowRef(false)
</script>
