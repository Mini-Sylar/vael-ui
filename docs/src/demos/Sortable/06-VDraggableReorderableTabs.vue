<template>
  <section class="demo">
    <h3>v-draggable: reorderable tabs</h3>
    <p>
      The directive is the "just make this list draggable" escape hatch — it runs the same engine,
      so the springs and the lift-out preview are identical. A directive on a component attaches to
      its root element, so it works directly on our own headless <code>&lt;Tabs&gt;</code> — no
      separate "draggable tabs" component needed. It addresses rows by position, so there's no
      keyboard path: reach for <code>&lt;Sortable&gt;</code> when you need one.
    </p>
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
    <p class="sortable-demo-order">{{ tabs.join(' / ') }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { Tabs, vDraggable } from 'vael-ui'

const tabs = reactive(['Overview', 'Activity', 'Settings'])
const activeTab = shallowRef('Overview')
// Each tab is also a click target (switches the active tab) — touchDragDelay
// gives touch a hold to tell "select this tab" from "drag it" apart. A plain
// dedicated handle (see the demo below) doesn't need this.
const tabsDraggable = computed(() => ({ items: tabs, axis: 'x' as const, touchDragDelay: 150 }))
</script>

<style scoped>
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
.sortable-demo-order {
  display: block;
  margin-block-start: 0.75rem;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
</style>
