<template>
  <output data-testid="value">{{ model ?? '' }}</output>
  <output data-testid="path">{{ path.join('>') }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="model">{{ JSON.stringify(model) }}</output>
  <output data-testid="last-change">{{ JSON.stringify(lastChange) }}</output>
  <CascadeSelect
    v-model="model"
    v-model:open="open"
    :items="resolvedItems"
    :disabled="props.disabled"
    :clearable="props.clearable"
    :multiple="props.multiple"
    :display="props.display"
    :max-labels="props.maxLabels"
    placeholder="Pick a city"
    name="city"
    @select="onSelect"
    @change="lastChange = $event"
  >
    <template v-if="withHeader" #header>
      <span data-testid="cascade-select-header">header</span>
    </template>
    <template v-if="withFooter" #footer>
      <span data-testid="cascade-select-footer">footer</span>
    </template>
  </CascadeSelect>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import CascadeSelect from '../../src/components/CascadeSelect/CascadeSelect.vue'
import type {
  CascadeSelectItem,
  CascadeSelectPath,
} from '../../src/components/CascadeSelect/CascadeSelect.vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    clearable?: boolean
    items?: CascadeSelectItem[]
    withHeader?: boolean
    withFooter?: boolean
    multiple?: boolean
    display?: 'chip' | 'text' | 'count'
    maxLabels?: number
    initial?: (string | number)[]
  }>(),
  {
    disabled: false,
    clearable: false,
    items: undefined,
    withHeader: false,
    withFooter: false,
    multiple: false,
    display: 'chip',
    maxLabels: undefined,
    initial: undefined,
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

const model = shallowRef<string | number | (string | number)[] | null>(
  props.initial ?? (props.multiple ? [] : null),
)
const lastChange = shallowRef<unknown>(undefined)
const open = shallowRef(false)
const path = shallowRef<CascadeSelectPath>([])
function onSelect(_item: CascadeSelectItem, p: CascadeSelectPath) {
  path.value = p
}
</script>
