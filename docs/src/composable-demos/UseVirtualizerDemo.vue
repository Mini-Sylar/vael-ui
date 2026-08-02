<template>
  <section class="demo">
    <div ref="containerEl" class="virtual-container">
      <div :style="listStyle">
        <div
          v-for="row in items"
          :key="row.index"
          :style="row.style"
          class="virtual-row"
          :data-virtual-index="row.index"
        >
          Row #{{ row.index }}
        </div>
      </div>
    </div>
    <p class="demo-status">
      Rendering <strong>{{ items.length }}</strong> of <strong>10,000</strong> rows
    </p>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useVirtualizer } from 'vael-ui'

const containerEl = useTemplateRef<HTMLElement>('containerEl')
const { listStyle, items } = useVirtualizer({
  containerEl,
  count: 10000,
  itemSize: 32,
})
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.virtual-container {
  block-size: 16rem;
  inline-size: 18rem;
  overflow-y: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
}

.virtual-row {
  display: flex;
  align-items: center;
  padding-inline: 0.75rem;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--ui-border);
}

.demo-status {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
