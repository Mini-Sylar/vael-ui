<template>
  <form ref="formEl" data-testid="form">
    <Select v-model="model" :items="items" name="fruit" :multiple="multiple" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Select from '../../src/components/Select/Select.vue'
import type { SelectItemData } from '../../src/components/Select/Select.vue'

const props = withDefaults(defineProps<{ multiple?: boolean }>(), { multiple: false })

const items: SelectItemData[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry', disabled: true },
  { label: 'Date', value: 'date' },
]

const model = shallowRef<string | number | (string | number)[] | null>(props.multiple ? [] : null)
const formEl = useTemplateRef('formEl')

defineExpose({ formEl })
</script>
