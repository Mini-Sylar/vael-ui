<template>
  <Combobox
    v-model="value"
    :items="items"
    allow-custom
    :tab-behavior="tabBehavior"
    placeholder="Tag"
    @create="(q: string, d: ComboboxCreateDetails) => reasons.push(d.reason)"
  >
    <template v-if="withSlots" #create="{ query, active }">
      <span data-testid="custom-create" :data-active="active || undefined">new {{ query }}</span>
    </template>
    <template v-if="withSlots" #item="{ item, query }">
      <span data-testid="custom-item">{{ item.label }} ({{ query }})</span>
    </template>
  </Combobox>
  <input data-testid="next-field" />
  <output data-testid="value">{{ JSON.stringify(value) }}</output>
  <output data-testid="reasons">{{ reasons.join(',') }}</output>
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import { Combobox } from 'vael-ui/vapor'
import type { ComboboxCreateDetails, ComboboxTabBehavior } from 'vael-ui/vapor'

defineProps<{ withSlots?: boolean; tabBehavior?: ComboboxTabBehavior }>()

const value = ref<string | number | null>(null)
const reasons = ref<string[]>([])
const items = ['bug', 'feature', 'docs'].map((label) => ({ label, value: label }))
</script>
