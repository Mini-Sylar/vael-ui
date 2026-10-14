<template>
  <div data-testid="basic">
    <OtpInput
      ref="basic"
      v-model="basicValue"
      :length="length"
      :type="type"
      :mask="mask"
      :disabled="disabled"
      :invalid="invalid"
      :groups="groups"
      name="code"
      @complete="onComplete"
    />
  </div>
  <output data-testid="basic-value">{{ basicValue }}</output>
  <output data-testid="complete-count">{{ completeCount }}</output>
  <button type="button" data-testid="overflow-model" @click="basicValue = '123456789'">
    Set overlong value
  </button>

  <OtpInput data-testid="custom-separator" v-model="customValue" :groups="[2, 2]" :length="4">
    <template #separator="{ index }">
      <span data-testid="custom-sep">/{{ index }}</span>
    </template>
  </OtpInput>

  <form ref="formEl" data-testid="form">
    <OtpInput v-model="formValue" name="otp" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import OtpInput from '../../src/components/OtpInput/OtpInput.vue'

withDefaults(
  defineProps<{
    length?: number
    type?: 'numeric' | 'alphanumeric'
    mask?: boolean
    disabled?: boolean
    invalid?: boolean
    groups?: number | number[]
  }>(),
  { length: 6, type: 'numeric', mask: false, disabled: false, invalid: false },
)

const basicValue = shallowRef('')
const formValue = shallowRef('654321')
const customValue = shallowRef('')
const completeCount = shallowRef(0)
function onComplete() {
  completeCount.value++
}

const basic = useTemplateRef('basic')
const formEl = useTemplateRef('formEl')

defineExpose({ basicValue, formValue, completeCount, basic, formEl })
</script>
