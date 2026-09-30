<template>
  <section class="demo">
    <h3>With page-size select, <code>pageSizeOptions</code></h3>
    <Pagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-size-options="[10, 25, 50]"
    />
    <p class="demo-status">
      Showing {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} of
      {{ total }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Pagination } from 'vael-ui'

const total = 237
const page = shallowRef(1)
const pageSize = shallowRef(10)
</script>
