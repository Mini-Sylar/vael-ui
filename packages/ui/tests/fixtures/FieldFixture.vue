<template>
  <Field
    ref="field"
    :label="label"
    :description="description"
    :error="error"
    :required="required"
    :disabled="disabled"
    :label-placement="labelPlacement"
  >
    <Input ref="input" v-model="value" placeholder="Type here" />
  </Field>
  <button data-testid="fill" type="button" @click="value = 'programmatic'">Fill</button>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Field from '../../src/components/Field/Field.vue'
import Input from '../../src/components/Input/Input.vue'

withDefaults(
  defineProps<{
    label?: string
    description?: string
    error?: string
    required?: boolean
    disabled?: boolean
    labelPlacement?: 'top' | 'float' | 'inset'
  }>(),
  { labelPlacement: 'top' },
)

const value = shallowRef('')
const field = useTemplateRef('field')
const input = useTemplateRef('input')

defineExpose({ field, input, value })
</script>
