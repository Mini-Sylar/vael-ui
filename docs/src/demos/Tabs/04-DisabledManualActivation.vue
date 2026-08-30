<template>
  <section class="demo">
    <h3>Disabled items and manual activation</h3>
    <p class="note">
      <code>activation="manual"</code>: arrow keys only move focus (tracked via the
      <code>focused</code> slot prop, driving tabindex here), Enter/Space commits. "Archived" is
      disabled and gets skipped over by arrow/Home/End navigation entirely.
    </p>
    <Tabs v-model:active="manualActive" :items="manualItems" activation="manual">
      <template #default="{ items: list, itemProps }">
        <button
          v-for="item in list"
          :key="item"
          class="ui-tabs-item--static"
          :aria-disabled="item === 'archived' || undefined"
          :disabled="item === 'archived'"
          v-bind="itemProps(item)"
        >
          <span class="tab-label">{{ item }}</span>
        </button>
      </template>
    </Tabs>
    <p class="panel-text">Selected: {{ manualActive }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Tabs } from 'vael-ui'

const manualItems = ['inbox', 'sent', 'archived', 'drafts']
const manualActive = shallowRef('inbox')
</script>

<style scoped>
.tab-label {
  display: inline-block;
}
.panel-text {
  margin: 1rem 0 0;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
