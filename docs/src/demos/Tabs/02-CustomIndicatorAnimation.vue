<template>
  <section class="demo">
    <h3>Custom indicator animation (motion-v)</h3>
    <p class="note">
      Instead of <code>indicatorProps</code>, each tab renders a motion-v
      <code>motion.span</code> with a shared <code>layout-id</code>, so motion-v slides it to the
      active tab. The spring is short with little bounce (<code>duration: 0.45</code>,
      <code>bounce: 0.15</code>), because tabs are pressed often.
    </p>
    <!-- LayoutGroup scopes the layout-id to this demo, so leaving the page releases it. -->
    <LayoutGroup id="tabs-spring-demo">
      <div class="row">
        <Tabs v-model:active="springActive" :items="items">
          <template #default="{ active: current, items: list, itemProps }">
            <button v-for="item in list" :key="item" v-bind="itemProps(item)">
              <motion.span
                v-if="current === item"
                layout-id="tab-indicator"
                class="tab-indicator"
                :transition="{ type: 'spring', duration: 0.45, bounce: 0.15 }"
              />
              <span class="tab-label">{{ item }}</span>
            </button>
          </template>
        </Tabs>
      </div>
    </LayoutGroup>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { LayoutGroup, motion } from 'motion-v'
import { Tabs } from 'vael-ui'

type Section = 'overview' | 'analytics' | 'settings'
const items: Section[] = ['overview', 'analytics', 'settings']

const springActive = shallowRef<Section>('overview')
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.tab-indicator {
  position: absolute;
  inset: 0;
  border-radius: var(--ui-radius);
  background: color-mix(in srgb, var(--ui-primary-hover) 15%, transparent);
  z-index: -1;
}
.tab-label {
  display: inline-block;
}
</style>
