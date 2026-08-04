<template>
  <Switch
    ref="switchRef"
    data-testid="basic"
    v-model="value"
    label="Notifications"
    name="notify"
    :disabled="disabled"
  />
  <output data-testid="value">{{ String(value) }}</output>

  <form ref="formEl" data-testid="form">
    <Switch data-testid="form-switch" v-model="formValue" name="agree" label="Agree" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Switch from '../../src/components/Switch/Switch.vue'

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })

const value = shallowRef(false)
const formValue = shallowRef(true)

const switchRef = useTemplateRef('switchRef')
const formEl = useTemplateRef('formEl')

defineExpose({ value, formValue, switchRef, formEl })
</script>
