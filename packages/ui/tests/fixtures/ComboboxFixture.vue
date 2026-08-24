<template>
  <output data-testid="model">{{ JSON.stringify(model) }}</output>
  <output data-testid="query">{{ query }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="create-log">{{ createLog.join(',') }}</output>
  <Combobox
    ref="combobox"
    v-model="model"
    v-model:query="query"
    v-model:open="open"
    :items="items"
    :multiple="multiple"
    :loading="loading"
    :clearable="clearable"
    :filter="filter"
    :allow-custom="allowCustom"
    :open-on-focus="openOnFocus"
    placeholder="Search fruit"
    @create="createLog.push($event)"
  >
    <template v-if="withHeader" #header="{ count, total }">
      <span data-testid="combobox-header">{{ count }} of {{ total }}</span>
    </template>
    <template v-if="withFooter" #footer>
      <span data-testid="combobox-footer">footer</span>
    </template>
  </Combobox>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Combobox from '../../src/components/Combobox/Combobox.vue'
import type { SelectItemData } from '../../src/components/Combobox/Combobox.vue'

const props = withDefaults(
  defineProps<{
    multiple?: boolean
    loading?: boolean
    clearable?: boolean
    filter?: boolean | ((item: SelectItemData, query: string) => boolean)
    allowCustom?: boolean
    openOnFocus?: boolean
    itemCount?: number
    withHeader?: boolean
    withFooter?: boolean
  }>(),
  {
    multiple: false,
    loading: false,
    clearable: false,
    filter: true,
    allowCustom: false,
    // Explicit `undefined` — same boolean-union footgun as Select's own
    // `virtualize`/Combobox's own `openOnFocus` default (see Combobox.vue).
    openOnFocus: undefined,
    itemCount: undefined,
    withHeader: false,
    withFooter: false,
  },
)

const items: SelectItemData[] = props.itemCount
  ? Array.from({ length: props.itemCount }, (_, i) => ({ label: `Item ${i}`, value: i }))
  : [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry', disabled: true },
      { label: 'Cranberry', value: 'cranberry' },
      { label: 'Date', value: 'date' },
    ]

const model = shallowRef<string | number | (string | number)[] | null>(props.multiple ? [] : null)
const query = shallowRef('')
const open = shallowRef(false)
const createLog = shallowRef<string[]>([])

const combobox = useTemplateRef('combobox')

defineExpose({ combobox })
</script>
