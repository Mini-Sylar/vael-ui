<!-- Pagination with every part: the page list, its buttons, an ellipsis on each side and the page-size select. -->
<template>
  <div data-specimen class="specimen">
    <Pagination
      v-model:page="page"
      v-model:page-size="pageSize"
      :total="240"
      :sibling-count="0"
      :page-size-options="[10, 25, 50]"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Pagination } from 'vael-ui'

const page = shallowRef(12)
const pageSize = shallowRef(10)
</script>

<style scoped>
.specimen {
  inline-size: min(26rem, 100%);
}
</style>
