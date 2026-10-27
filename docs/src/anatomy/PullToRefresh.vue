<!-- PullToRefresh with every part: the zone held open mid-refresh, its indicator, bubble and label showing. -->
<template>
  <div data-specimen class="specimen">
    <PullToRefresh ref="ptr" class="box" :on-refresh="refresh">
      <ul class="list">
        <li v-for="item in inbox" :key="item">{{ item }}</li>
      </ul>
    </PullToRefresh>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { PullToRefresh } from 'vael-ui'

const inbox = [
  'Team plan renewed',
  'Billing email updated',
  'Ada Lovelace joined',
  'Invoice #1042 paid',
]

// A refresh that never settles, so the indicator stays in view.
const refresh = () => new Promise<void>(() => {})
const ptr = useTemplateRef('ptr')
onMounted(() => ptr.value?.refresh())
</script>

<style scoped>
.specimen {
  inline-size: min(20rem, 100%);
}
.box {
  block-size: 18rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.list li {
  padding: 0.75rem 1rem;
  border-block-start: 1px solid var(--ui-border);
  font-size: 0.875rem;
}
</style>
