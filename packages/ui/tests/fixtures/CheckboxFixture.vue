<template>
  <Checkbox
    ref="checkbox"
    data-testid="basic"
    v-model="boolValue"
    label="Subscribe"
    name="subscribe"
    :disabled="disabled"
    :invalid="invalid"
    :indeterminate="indeterminate"
  />
  <output data-testid="bool-value">{{ String(boolValue) }}</output>

  <Checkbox data-testid="opt-a" v-model="group" value="a" label="A" name="opts" />
  <Checkbox data-testid="opt-b" v-model="group" value="b" label="B" name="opts" />
  <output data-testid="group-value">{{ JSON.stringify(group) }}</output>

  <form ref="formEl" data-testid="form">
    <Checkbox data-testid="form-check" v-model="formValue" name="agree" label="Agree" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Checkbox from '../../src/components/Checkbox.vue'

withDefaults(
  defineProps<{
    disabled?: boolean
    invalid?: boolean
    indeterminate?: boolean
  }>(),
  { disabled: false, invalid: false, indeterminate: false },
)

const boolValue = shallowRef(false)
const group = shallowRef<Array<string | number>>([])
const formValue = shallowRef(true)

const checkbox = useTemplateRef('checkbox')
const formEl = useTemplateRef('formEl')

defineExpose({ boolValue, group, formValue, checkbox, formEl })
</script>
