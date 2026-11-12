<template>
  <section class="demo">
    <h3>How far a list can scroll</h3>
    <p class="note">
      <code>useScrollLength</code> is the distance a container can scroll. Load more rows and the
      number grows, with no listener on your side. “Jump to the end” scrolls exactly that far.
    </p>
    <div class="row">
      <Button variant="outline" @click="rows += 5">Load 5 more</Button>
      <Button variant="outline" @click="list?.scrollTo({ top: length, behavior: 'smooth' })">
        Jump to the end
      </Button>
      <span class="status">{{ rows }} rows, scrolls {{ Math.round(length) }}px</span>
    </div>
    <div ref="list" class="scroll-list" tabindex="0" aria-label="Rows">
      <div>
        <div v-for="n in rows" :key="n" class="scroll-row">Row {{ n }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button } from 'vael-ui'
import { useScrollLength } from 'vael-ui/motion'

const list = useTemplateRef<HTMLElement>('list')
const rows = shallowRef(10)
const length = useScrollLength(list)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.status {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}
.scroll-list {
  max-inline-size: 16rem;
  max-block-size: 10rem;
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.scroll-list:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
.scroll-row {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
</style>
