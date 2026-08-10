<template>
  <Slider
    data-testid="single"
    style="width: 200px"
    v-model="singleValue"
    :min="0"
    :max="100"
    :step="5"
  />
  <output data-testid="single-value">{{ singleValue }}</output>

  <Slider data-testid="range" style="width: 200px" v-model="rangeValue" :min="0" :max="100" />
  <output data-testid="range-value">{{ JSON.stringify(rangeValue) }}</output>

  <Slider
    data-testid="vertical"
    style="height: 200px"
    v-model="verticalValue"
    orientation="vertical"
    :min="0"
    :max="100"
  />

  <Slider data-testid="disabled" style="width: 200px" v-model="disabledValue" disabled />

  <Slider
    data-testid="valuetext"
    style="width: 200px"
    v-model="valueTextValue"
    :min="0"
    :max="100"
    :value-text="(v) => `$${v}`"
  />

  <form data-testid="form">
    <Slider data-testid="form-slider" style="width: 200px" v-model="formValue" name="amount" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Slider from '../../src/components/Slider/Slider.vue'

const singleValue = shallowRef(20)
const rangeValue = shallowRef<[number, number]>([20, 60])
const verticalValue = shallowRef(30)
const disabledValue = shallowRef(10)
const valueTextValue = shallowRef(40)
const formValue = shallowRef(50)

defineExpose({
  singleValue,
  rangeValue,
  verticalValue,
  disabledValue,
  valueTextValue,
  formValue,
})
</script>
