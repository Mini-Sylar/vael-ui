<template>
  <section class="demo">
    <h3>One spring</h3>
    <label class="slider">
      Damping {{ damping.toFixed(2) }}
      <input v-model.number="damping" type="range" min="0.3" max="1" step="0.05" />
    </label>
    <ConfigProvider :motion="{ spring: { damping, response: 0.4 } }">
      <div class="row">
        <Switch v-model="notify" label="Notify me" />
        <SelectButton v-model="view" :items="views" aria-label="View" />
        <Button variant="outline" @click="total += 128">
          Add 128 <AnimatedNumber :value="total" />
        </Button>
        <Button variant="secondary" @click="open = true">Filters</Button>
      </div>
      <Drawer v-model:open="open" side="right" title="Filters" aria-label="Filters">
        <p>Show only open orders from the last 30 days.</p>
      </Drawer>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatedNumber, Button, ConfigProvider, Drawer, SelectButton, Switch } from 'vael-ui'
import type { SelectButtonItem } from 'vael-ui'

const damping = shallowRef(0.5)
const notify = shallowRef(true)
const open = shallowRef(false)
const total = shallowRef(0)
const view = shallowRef<string | null>('list')
const views: SelectButtonItem[] = [
  { label: 'List', value: 'list' },
  { label: 'Grid', value: 'grid' },
  { label: 'Board', value: 'board' },
]
</script>

<style scoped>
.slider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-block-end: 1rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
</style>
