<template>
  <output data-testid="active">{{ active }}</output>
  <output data-testid="changes">{{ changes }}</output>

  <Tabs v-model:active="active" :items="items" :orientation="props.orientation" @change="changes++">
    <template #default="{ active: current, select, items: list }">
      <button
        v-for="item in list"
        :key="item"
        role="tab"
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

const props = defineProps<{ orientation?: 'horizontal' | 'vertical' }>()

type Item = 'one' | 'two' | 'three'
const items: Item[] = ['one', 'two', 'three']
const active = shallowRef<Item>('one')
const changes = shallowRef(0)
</script>
