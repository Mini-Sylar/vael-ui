<template>
  <section class="demo">
    <h3>Stepper position: <code>end</code> (default) vs <code>split</code></h3>
    <p class="note">
      <code>end</code> stacks +/- into one column after the value. <code>split</code> puts one
      full-height button on each side instead, closer to a quantity stepper in a cart.
    </p>
    <div class="row">
      <InputNumber v-model="qtyEnd" :min="0" :max="20" :step="1" />
      <InputNumber v-model="qtySplit" stepper-position="split" :min="0" :max="20" :step="1" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { InputNumber } from 'vael-ui'

const qtyEnd = shallowRef<number | null>(2)
const qtySplit = shallowRef<number | null>(2)
</script>
