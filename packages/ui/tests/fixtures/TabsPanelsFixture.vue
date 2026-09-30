<template>
  <Tabs ref="tabs" v-model:active="active" :items="items" :id-base="idBase">
    <template #default="{ items: list, itemProps }">
      <button v-for="item in list" :key="item" v-bind="itemProps(item)">{{ item }}</button>
    </template>
  </Tabs>
  <output data-testid="panel-props">{{ JSON.stringify(tabs?.panelProps('two')) }}</output>
  <template v-if="idBase">
    <div v-for="item in items" v-show="item === active" :key="item" v-bind="panelAttrs(item)">
      Panel {{ item }}
    </div>
  </template>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Tabs from '../../src/components/Tabs/Tabs.vue'

const props = defineProps<{ idBase?: string }>()

type Item = 'one' | 'two'
const items: Item[] = ['one', 'two']
const active = shallowRef<Item>('one')
const tabs = useTemplateRef('tabs')

// Mirrors what the exposed panelProps() returns, without needing the ref at render time.
function panelAttrs(item: Item) {
  return {
    id: `${props.idBase}-panel-${item}`,
    role: 'tabpanel',
    'aria-labelledby': `${props.idBase}-tab-${item}`,
  }
}
</script>
