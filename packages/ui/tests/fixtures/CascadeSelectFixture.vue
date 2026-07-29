<template>
  <output data-testid="value">{{ model ?? '' }}</output>
  <output data-testid="path">{{ path.join('>') }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <CascadeSelect
    v-model="model"
    v-model:open="open"
    :items="resolvedItems"
    :disabled="props.disabled"
    :clearable="props.clearable"
    placeholder="Pick a city"
    name="city"
    @select="onSelect"
  />
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import CascadeSelect from '../../src/components/CascadeSelect.vue'
import type { CascadeSelectItem, CascadeSelectPath } from '../../src/components/CascadeSelect.vue'

const props = withDefaults(
  defineProps<{ disabled?: boolean; clearable?: boolean; items?: CascadeSelectItem[] }>(),
  {
    disabled: false,
    clearable: false,
    items: undefined,
  },
)

const defaultItems: CascadeSelectItem[] = [
  {
    label: 'Africa',
    value: 'africa',
    children: [
      {
        label: 'Ghana',
        value: 'gh',
        children: [
          { label: 'Accra', value: 'accra' },
          { label: 'Kumasi', value: 'kumasi' },
        ],
      },
      {
        label: 'Nigeria',
        value: 'ng',
        disabled: true,
        children: [{ label: 'Lagos', value: 'lagos' }],
      },
    ],
  },
  {
    label: 'Europe',
    value: 'europe',
    children: [
      {
        label: 'France',
        value: 'fr',
        children: [
          { label: 'Paris', value: 'paris' },
          { label: 'Lyon', value: 'lyon' },
        ],
      },
    ],
  },
]

const resolvedItems = computed(() => props.items ?? defaultItems)

const model = shallowRef<string | number | null>(null)
const open = shallowRef(false)
const path = shallowRef<CascadeSelectPath>([])
function onSelect(_item: CascadeSelectItem, p: CascadeSelectPath) {
  path.value = p
}
</script>
