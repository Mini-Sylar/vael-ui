<template>
  <form ref="formEl" data-testid="form">
    <DatePicker v-model="model" name="departure" />
  </form>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import DatePicker from '../../src/components/DatePicker.vue'

const model = shallowRef<Date | null>(null)
const formEl = useTemplateRef('formEl')

defineExpose({ formEl })
</script>
