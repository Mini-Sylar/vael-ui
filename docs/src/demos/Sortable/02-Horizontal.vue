<template>
  <section class="demo">
    <h3>Horizontal</h3>
    <p>
      <code>axis="x"</code> reorders along the row instead — the same engine that will drive table
      column reorder. Arrow keys follow the axis (<Kbd>←</Kbd>/<Kbd>→</Kbd>).
    </p>
    <Sortable v-model:items="columns" axis="x" item-key="id" label-key="label" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Kbd, Sortable } from 'vael-ui'

const columns = ref([
  { id: 'c1', label: 'Order' },
  { id: 'c2', label: 'Customer' },
  { id: 'c3', label: 'Amount' },
  { id: 'c4', label: 'Status' },
])
</script>
