<template>
  <section class="demo">
    <h3>Haptics</h3>
    <p class="note">
      <code>haptics</code> adds a short tap, on phones that offer one, when something commits: a
      Switch flips, a swiped row snaps, a Sortable row lands, a held Button completes, a pull passes
      the refresh point. Each gets fitting feedback: a tick for the Switch, a light bump for the
      row, a firmer one for the drop, the heaviest for the hold. <code>{ intensity }</code> scales
      them all. Open this page on a phone to feel it; desktops stay silent.
    </p>
    <ConfigProvider :haptics="{ intensity: 1.2 }">
      <div class="stack">
        <Switch v-model="alerts" label="Alerts" />
        <Button variant="danger" :hold="900" @click="cleared++">Hold to clear history</Button>
        <SwipeToReveal class="row">
          <template #trailing-actions="{ close }">
            <Button variant="danger" size="sm" @click="close">Delete</Button>
          </template>
          <div class="row-content">Swipe this row left</div>
        </SwipeToReveal>
        <Sortable v-model:items="steps" item-key="id" label-key="label" class="steps">
          <template #item="{ item }">{{ item.label }}</template>
        </Sortable>
      </div>
    </ConfigProvider>
    <p class="demo-status">Cleared {{ cleared }} times.</p>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { Button, ConfigProvider, Sortable, SwipeToReveal, Switch } from 'vael-ui'

const alerts = shallowRef(true)
const cleared = shallowRef(0)
const steps = ref([
  { id: 1, label: 'Draft' },
  { id: 2, label: 'Review' },
  { id: 3, label: 'Publish' },
])
</script>

<style scoped>
.stack {
  display: grid;
  justify-items: start;
  gap: 1rem;
  max-inline-size: 22rem;
}
.row {
  inline-size: 100%;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.row-content {
  padding: 0.75rem 1rem;
  background: var(--ui-surface);
}
.steps {
  inline-size: 100%;
}
</style>
