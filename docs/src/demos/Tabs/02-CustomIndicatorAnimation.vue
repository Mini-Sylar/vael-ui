<template>
  <section class="demo">
    <h3>Custom indicator animation (motion-v)</h3>
    <p class="note">
      Same zero-ownership contract, reached for a spring instead of the CSS default: a
      <code>motion.span</code> with a shared <code>layout-id</code> per tab, no composable needed.
      Quick, near-flat spring (duration 0.45s, bounce 0.15), no playful overshoot on a control
      pressed this often.
    </p>
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
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { motion } from 'motion-v'
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
  background: var(--ui-primary);
  opacity: 0.15;
  z-index: -1;
}
.tab-label {
  display: inline-block;
}
</style>
