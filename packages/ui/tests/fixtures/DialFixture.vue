<template>
  <Dial data-testid="unbounded" v-model="unboundedValue" :step="1" />
  <output data-testid="unbounded-value">{{ unboundedValue }}</output>

  <Dial data-testid="bounded" v-model="boundedValue" :min="0" :max="10" :step="1" />
  <output data-testid="bounded-value">{{ boundedValue }}</output>

  <Dial data-testid="disabled" v-model="disabledValue" disabled :step="1" />

  <Dial
    data-testid="valuetext"
    v-model="valueTextValue"
    :min="0"
    :max="100"
    :value-text="(v) => `${v}%`"
  />

  <Dial data-testid="no-min" v-model="noMinValue" :max="20" :step="1" />

  <form data-testid="form">
    <Dial data-testid="form-dial" v-model="formValue" name="gain" :step="1" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Dial from '../../src/components/Dial.vue'

const unboundedValue = shallowRef(0)
const boundedValue = shallowRef(0)
const disabledValue = shallowRef(3)
const valueTextValue = shallowRef(40)
const noMinValue = shallowRef(5)
const formValue = shallowRef(2)

defineExpose({
  unboundedValue,
  boundedValue,
  disabledValue,
  valueTextValue,
  noMinValue,
  formValue,
})
</script>
