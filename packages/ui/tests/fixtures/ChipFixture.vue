<template>
  <Chip
    ref="chip"
    :label="label"
    :removable="removable"
    :disabled="disabled"
    :size="size"
    @remove="removeCount++"
  />
  <output data-testid="remove-count">{{ removeCount }}</output>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Chip from '../../src/components/Chip/Chip.vue'

withDefaults(
  defineProps<{
    label?: string
    removable?: boolean
    disabled?: boolean
    size?: 'sm' | 'md'
  }>(),
  { label: 'Apple', removable: false, disabled: false, size: 'md' },
)

const removeCount = shallowRef(0)
const chip = useTemplateRef('chip')

defineExpose({ chip })
</script>
