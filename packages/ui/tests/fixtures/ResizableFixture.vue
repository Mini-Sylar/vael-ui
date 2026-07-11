<template>
  <Resizable data-testid="single" v-model:size="size" :min="100" :max="300">
    <div style="height: 50px">content</div>
  </Resizable>
  <output data-testid="single-size">{{ size }}</output>

  <Resizable
    data-testid="vertical"
    v-model:size="verticalSize"
    direction="vertical"
    :min="50"
    :max="200"
  >
    <div>content</div>
  </Resizable>
  <output data-testid="vertical-size">{{ verticalSize }}</output>

  <Resizable data-testid="disabled" v-model:size="disabledSize" :min="100" :max="300" disabled>
    <div>content</div>
  </Resizable>
  <output data-testid="disabled-size">{{ disabledSize }}</output>

  <!-- Simulates a consumer driving the bound size from OUTSIDE a drag
       (the same v-model channel a "reset to default" button would use). -->
  <button type="button" data-testid="set-external" @click="size = 220">Set to 220</button>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Resizable from '../../src/components/Resizable.vue'

const size = shallowRef(150)
const verticalSize = shallowRef(100)
const disabledSize = shallowRef(150)

defineExpose({ size, verticalSize, disabledSize })
</script>
