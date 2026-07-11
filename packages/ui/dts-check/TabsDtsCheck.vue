<template>
  <Tabs v-model:active="active" :items="items" @change="onChange">
    <template #default="{ active: current, select, items: slotItems }">
      <button
        v-for="item in slotItems"
        :key="item"
        role="tab"
        :aria-selected="expectUnion(current) === item"
        @click="select(expectUnion(item))"
      >
        {{ item }}
      </button>
    </template>
  </Tabs>
</template>

<script setup lang="ts">
/**
 * Throwaway consumer of the BUILT output (dist/index.d.ts, not src).
 * Compiles only if the generic `T` of Tabs is inferred as the literal
 * union 'home' | 'billing' — if T degraded to `string`, every
 * `expectUnion(...)` call below would be a type error.
 */
import { shallowRef } from 'vue'
import { Tabs } from '../dist/index.js'

type Section = 'home' | 'billing'
const active = shallowRef<Section>('home')
const items: Section[] = ['home', 'billing']

function expectUnion(value: Section): Section {
  return value
}

function onChange(item: Section) {
  expectUnion(item)
}
</script>
