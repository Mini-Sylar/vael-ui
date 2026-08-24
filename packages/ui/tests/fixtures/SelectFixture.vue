<template>
  <output data-testid="model">{{ JSON.stringify(model) }}</output>
  <output data-testid="open-state">{{ open ? 'open' : 'closed' }}</output>
  <output data-testid="reach-end-count">{{ reachEndCount }}</output>
  <output data-testid="query">{{ query }}</output>
  <Select
    ref="select"
    v-model="model"
    v-model:open="open"
    v-model:query="query"
    :items="items"
    :multiple="multiple"
    :clearable="clearable"
    :loading="loading"
    :virtualize="props.virtualize"
    :before-close="beforeClose"
    :force-mount="forceMount"
    :filter="filter"
    placeholder="Choose a fruit"
    @reach-end="reachEndCount++"
  >
    <template v-if="withHeader" #header>
      <span data-testid="select-header">header content</span>
    </template>
    <template v-if="withFooter" #footer>
      <span data-testid="select-footer">footer content</span>
    </template>
    <template v-if="customFilter" #filter="{ query: q, onKeydown }">
      <input
        data-testid="custom-filter"
        :value="q"
        @input="query = ($event.target as HTMLInputElement).value"
        @keydown="onKeydown"
      />
    </template>
  </Select>
  <button v-if="deferClose" data-testid="release-close" @click="releaseClose">release</button>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Select from '../../src/components/Select/Select.vue'
import type { SelectFilter, SelectItemData } from '../../src/components/Select/Select.vue'

const props = withDefaults(
  defineProps<{
    multiple?: boolean
    clearable?: boolean
    loading?: boolean
    virtualize?: boolean | { itemSize?: number; overscan?: number }
    itemCount?: number
    deferClose?: boolean
    forceMount?: boolean
    filter?: SelectFilter<SelectItemData>
    withHeader?: boolean
    withFooter?: boolean
    customFilter?: boolean
  }>(),
  {
    multiple: false,
    clearable: false,
    loading: false,
    deferClose: false,
    forceMount: false,
    // Explicit `undefined`: `virtualize`'s type includes `boolean`, and an
    // omitted default here would trip Vue's boolean-prop auto-false-when-
    // absent coercion, making it impossible to test Select's own "auto"
    // virtualization default through this fixture.
    virtualize: undefined,
    // Same `boolean`-in-the-union coercion issue as `virtualize` above.
    filter: undefined,
    withHeader: false,
    withFooter: false,
    customFilter: false,
  },
)

const items: SelectItemData[] = props.itemCount
  ? Array.from({ length: props.itemCount }, (_, i) => ({ label: `Item ${i}`, value: i }))
  : [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry', disabled: true },
      { label: 'Date', value: 'date' },
    ]

const model = shallowRef<string | number | (string | number)[] | null>(props.multiple ? [] : null)
const open = shallowRef(false)
const query = shallowRef('')
const reachEndCount = shallowRef(0)

let pendingDone: (() => void) | null = null
function beforeClose(done: () => void) {
  if (!props.deferClose) {
    done()
    return
  }
  pendingDone = done
}
function releaseClose() {
  pendingDone?.()
  pendingDone = null
}

const select = useTemplateRef('select')

defineExpose({ select })
</script>
