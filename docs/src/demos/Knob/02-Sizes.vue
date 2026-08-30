<template>
  <section class="demo">
    <h3>Sizes</h3>
    <div class="row knob-row" style="align-items: flex-end">
      <Knob v-model="smValue" size="sm" :min="0" :max="10" />
      <Knob v-model="mdValue" size="md" :min="0" :max="10" />
      <Knob v-model="lgValue" size="lg" :min="0" :max="10" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Knob } from 'vael-ui'

const smValue = shallowRef(3)
const mdValue = shallowRef(5)
const lgValue = shallowRef(7)
</script>

<style scoped>
.knob-row {
  align-items: center;
  gap: 1.5rem;
}
</style>
