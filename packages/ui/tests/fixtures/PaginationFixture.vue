<template>
  <Pagination
    data-testid="basic"
    v-model:page="page"
    v-model:page-size="pageSize"
    :total="total"
    :sibling-count="siblingCount"
    :page-size-options="pageSizeOptions"
  />
  <output data-testid="page">{{ page }}</output>
  <output data-testid="page-size">{{ pageSize }}</output>
  <output data-testid="page-size-change-count">{{ pageSizeChangeCount }}</output>
  <output data-testid="page-change-count">{{ pageChangeCount }}</output>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import Pagination from '../../src/components/Pagination.vue'

const props = withDefaults(
  defineProps<{
    total?: number
    initialPage?: number
    pageSize?: number
    siblingCount?: number
    pageSizeOptions?: number[]
  }>(),
  {
    total: 200,
    initialPage: 1,
    pageSize: 10,
    siblingCount: 1,
  },
)

const page = shallowRef(props.initialPage)
const pageSize = shallowRef(props.pageSize)
const pageChangeCount = shallowRef(0)
const pageSizeChangeCount = shallowRef(0)

watch(page, () => pageChangeCount.value++)
watch(pageSize, () => pageSizeChangeCount.value++)

defineExpose({ page, pageSize })
</script>
