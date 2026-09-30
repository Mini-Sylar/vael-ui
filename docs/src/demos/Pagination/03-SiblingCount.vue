<template>
  <section class="demo">
    <h3><code>siblingCount</code>, compact vs. wide</h3>
    <div class="pagination-stack">
      <Pagination v-model:page="page" :total="500" :sibling-count="0" />
      <Pagination v-model:page="page" :total="500" :sibling-count="2" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Pagination } from 'vael-ui'

const page = shallowRef(25)
</script>

<style scoped>
.pagination-stack {
  display: grid;
  gap: 1rem;
  justify-items: start;
}
</style>
