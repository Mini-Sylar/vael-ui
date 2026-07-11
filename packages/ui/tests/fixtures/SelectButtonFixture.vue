<template>
  <SelectButton
    ref="single"
    data-testid="single"
    v-model="singleValue"
    :items="items"
    :allow-empty="allowEmpty"
  />
  <output data-testid="single-value">{{ String(singleValue) }}</output>

  <SelectButton ref="multi" data-testid="multi" v-model="multiValue" :items="items" multiple />
  <output data-testid="multi-value">{{ JSON.stringify(multiValue) }}</output>

  <form ref="formEl" data-testid="form">
    <SelectButton v-model="formSingle" :items="items" name="single-choice" />
    <SelectButton v-model="formMulti" :items="items" multiple name="multi-choice" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import SelectButton from '../../src/components/SelectButton.vue'
import type { SelectButtonItem } from '../../src/components/SelectButton.vue'

withDefaults(defineProps<{ allowEmpty?: boolean }>(), { allowEmpty: true })

const items: SelectButtonItem[] = [
  { label: 'List', value: 'list' },
  { label: 'Grid', value: 'grid' },
  { label: 'Board', value: 'board', disabled: true },
]

const singleValue = shallowRef<string | number | null>('list')
const multiValue = shallowRef<Array<string | number>>([])
const formSingle = shallowRef<string | number | null>('list')
const formMulti = shallowRef<Array<string | number>>(['list', 'grid'])

const single = useTemplateRef('single')
const multi = useTemplateRef('multi')
const formEl = useTemplateRef('formEl')

defineExpose({ singleValue, multiValue, formSingle, formMulti, single, multi, formEl })
</script>
