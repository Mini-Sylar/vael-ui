<template>
  <RadioGroup
    ref="group"
    v-model="value"
    :disabled="disabled"
    :orientation="orientation"
    @change="changes++"
  >
    <Radio value="free" label="Free" />
    <Radio value="pro" label="Pro" description="Best for teams" />
    <Radio value="enterprise" label="Enterprise" disabled />
  </RadioGroup>
  <output data-testid="value">{{ String(value) }}</output>
  <output data-testid="changes">{{ changes }}</output>

  <form ref="formEl" data-testid="form">
    <RadioGroup v-model="formValue" name="plan">
      <Radio value="a" label="A" />
      <Radio value="b" label="B" />
    </RadioGroup>
  </form>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import RadioGroup from '../../src/components/RadioGroup.vue'
import Radio from '../../src/components/Radio.vue'

withDefaults(
  defineProps<{
    disabled?: boolean
    orientation?: 'horizontal' | 'vertical'
  }>(),
  { disabled: false, orientation: 'vertical' },
)

const value = shallowRef<string | number | null>(null)
const formValue = shallowRef<string | number | null>('a')
const changes = shallowRef(0)

const group = useTemplateRef('group')
const formEl = useTemplateRef('formEl')

defineExpose({ value, formValue, changes, group, formEl })
</script>
