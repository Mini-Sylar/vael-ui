<template>
  <div data-testid="basic">
    <InputNumber
      ref="basic"
      v-model="basicValue"
      :min="min"
      :max="max"
      :step="step"
      :locale="locale"
      :mode="mode"
      :currency="currency"
      :disabled="disabled"
      :invalid="invalid"
      :allow-empty="allowEmpty"
      :controls="controls"
      name="amount"
    />
  </div>
  <output data-testid="basic-value">{{ String(basicValue) }}</output>
  <button type="button" data-testid="call-increment" @click="basic?.increment()">inc</button>
  <button type="button" data-testid="call-decrement" @click="basic?.decrement()">dec</button>

  <form ref="formEl" data-testid="form">
    <InputNumber v-model="formValue" name="qty" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import InputNumber from '../../src/components/InputNumber/InputNumber.vue'

withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    locale?: string
    mode?: 'decimal' | 'currency' | 'percent'
    currency?: string
    disabled?: boolean
    invalid?: boolean
    allowEmpty?: boolean
    controls?: boolean
  }>(),
  {
    step: 1,
    mode: 'decimal',
    disabled: false,
    invalid: false,
    allowEmpty: true,
    controls: true,
  },
)

const basicValue = shallowRef<number | null>(null)
const formValue = shallowRef<number | null>(5)

const basic = useTemplateRef('basic')
const formEl = useTemplateRef('formEl')

defineExpose({ basicValue, formValue, basic, formEl })
</script>
