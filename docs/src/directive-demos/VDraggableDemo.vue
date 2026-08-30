<template>
  <div class="demo v-draggable-demo">
    <Tabs
      v-draggable="tabsDraggable"
      v-model:active="activeTab"
      :items="tabs"
      class="draggable-tabs"
    >
      <template #default="{ items: list, itemProps }">
        <button
          v-for="item in list"
          :key="item"
          class="ui-tabs-item--static"
          v-bind="itemProps(item)"
        >
          {{ item }}
        </button>
      </template>
    </Tabs>
    <p class="v-draggable-order">{{ tabs.join(' / ') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { Tabs, vDraggable } from 'vael-ui'

const tabs = reactive(['Overview', 'Activity', 'Settings'])
const activeTab = shallowRef('Overview')
const tabsDraggable = computed(() => ({ items: tabs, axis: 'x' as const }))
</script>

<style scoped>
.v-draggable-demo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.draggable-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  inline-size: fit-content;
}
.draggable-tabs .ui-tabs-item {
  touch-action: none;
}
.v-draggable-order {
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
  margin: 0;
}
</style>
