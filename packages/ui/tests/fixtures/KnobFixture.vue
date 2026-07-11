<template>
  <Knob data-testid="basic" v-model="basicValue" :min="0" :max="100" :step="5" />
  <output data-testid="basic-value">{{ basicValue }}</output>

  <Knob data-testid="disabled" v-model="disabledValue" disabled :min="0" :max="100" />

  <Knob
    data-testid="valuetext"
    v-model="valueTextValue"
    :min="0"
    :max="100"
    :value-text="(v) => `${v}%`"
  />

  <form data-testid="form">
    <Knob data-testid="form-knob" v-model="formValue" name="gain" :min="0" :max="10" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Knob from '../../src/components/Knob.vue'

const basicValue = shallowRef(20)
const disabledValue = shallowRef(10)
const valueTextValue = shallowRef(40)
const formValue = shallowRef(5)

defineExpose({ basicValue, disabledValue, valueTextValue, formValue })
</script>
