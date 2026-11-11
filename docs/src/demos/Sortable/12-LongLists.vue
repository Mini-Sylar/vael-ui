<template>
  <section class="demo">
    <h3>Long lists</h3>
    <p>
      <code>virtualize</code> renders only the rows near the screen; the rest keep a row of their
      measured size, so the scrollbar stays true and dragging, autoscroll and moving rows between
      lists work as before. Here, 1,000 rows in a box that scrolls.
    </p>
    <div class="scroller">
      <Sortable v-model:items="rows" item-key="id" label-key="label" variant="plain" virtualize />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sortable } from 'vael-ui'

const rows = ref(Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `Task ${i + 1}` })))
</script>

<style scoped>
.scroller {
  block-size: 18rem;
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
</style>
