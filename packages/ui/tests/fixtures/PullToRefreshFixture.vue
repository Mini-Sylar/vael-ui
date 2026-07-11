<template>
  <button data-testid="programmatic-refresh" @click="ptr?.refresh()">Refresh</button>
  <PullToRefresh
    ref="ptr"
    class="ptr-fixture"
    style="block-size: 200px"
    :on-refresh="onRefresh"
    :threshold="threshold"
    :max-pull="maxPull"
  >
    <template v-if="customIndicator" #indicator="{ state, progress }">
      <div data-testid="custom-indicator">{{ state }}:{{ progress.toFixed(2) }}</div>
    </template>
    <div style="block-size: 2000px">tall content</div>
  </PullToRefresh>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import PullToRefresh from '../../src/components/PullToRefresh.vue'

withDefaults(
  defineProps<{
    onRefresh: () => Promise<void> | void
    threshold?: number
    maxPull?: number
    customIndicator?: boolean
  }>(),
  { customIndicator: false },
)

const ptr = useTemplateRef('ptr')
</script>
