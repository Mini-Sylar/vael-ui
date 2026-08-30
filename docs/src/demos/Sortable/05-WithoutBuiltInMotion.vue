<template>
  <section class="demo">
    <h3>Without the built-in motion</h3>
    <p>
      <code>motionCss="false"</code> skips the springs entirely — rows snap to their new slots,
      leaving the motion to you.
    </p>
    <Sortable v-model:items="plain" item-key="id" label-key="label" :motion-css="false" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sortable } from 'vael-ui'

const plain = ref([
  { id: 'p1', label: 'First' },
  { id: 'p2', label: 'Second' },
  { id: 'p3', label: 'Third' },
])
</script>
