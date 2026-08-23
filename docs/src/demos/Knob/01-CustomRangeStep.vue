<template>
  <section class="demo">
    <h3>Custom range and step, with <code>valueText</code></h3>
    <div class="row knob-row">
      <Knob v-model="gain" :min="-24" :max="24" :step="3" :value-text="(v) => `${v} dB`" />
      <output class="note">{{ gain }} dB</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Knob } from 'vael-ui'

const gain = shallowRef(0)
</script>

<style scoped>
.knob-row {
  align-items: center;
  gap: 1.5rem;
}
</style>
