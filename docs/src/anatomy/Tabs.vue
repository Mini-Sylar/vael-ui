<!-- Tabs with every part: the list, three tabs, and the indicator under the selected one. -->
<template>
  <div data-specimen class="specimen">
    <Tabs v-model:active="active" :items="items" aria-label="Project">
      <template #default="{ items: list, itemProps, indicatorProps }">
        <div v-bind="indicatorProps()" />
        <button v-for="item in list" :key="item" v-bind="itemProps(item)">
          {{ labels[item] }}
        </button>
      </template>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Tabs } from 'vael-ui'

type Tab = 'overview' | 'activity' | 'settings'
const items: Tab[] = ['overview', 'activity', 'settings']
const labels: Record<Tab, string> = {
  overview: 'Overview',
  activity: 'Activity',
  settings: 'Settings',
}
const active = shallowRef<Tab>('overview')
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
</style>
