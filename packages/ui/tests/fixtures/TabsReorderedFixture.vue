<template>
  <output data-testid="active">{{ active }}</output>

  <Tabs v-model:active="active" :items="items">
    <template #default="{ active: current, select }">
      <button
        v-for="item in domOrder"
        :key="item"
        role="tab"
        :data-tab-value="item"
        :aria-selected="current === item"
        :tabindex="current === item ? 0 : -1"
        :data-testid="`tab-${item}`"
        @click="select(item)"
      >
        {{ item }}
      </button>
    </template>
  </Tabs>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Tabs from '../../src/components/Tabs/Tabs.vue'

type Item = 'one' | 'two' | 'three'
const items: Item[] = ['one', 'two', 'three']
// Deliberately NOT items order — this is what data-tab-value exists for.
const domOrder: Item[] = ['three', 'one', 'two']
const active = shallowRef<Item>('one')
</script>
