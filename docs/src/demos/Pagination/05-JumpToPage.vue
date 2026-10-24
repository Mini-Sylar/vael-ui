<template>
  <section class="demo">
    <h3>Jump to page</h3>
    <p class="note">
      Put an <code>InputNumber</code> next to the pagination for long lists. <code>min</code> and
      <code>max</code> keep the number within the page count. Press Enter or leave the field to go
      to that page.
    </p>
    <div class="pager">
      <Pagination v-model:page="page" :total="TOTAL" :page-size="PAGE_SIZE" aria-label="Results" />
      <label class="jump">
        Go to page
        <InputNumber
          v-model="target"
          class="jump-input"
          size="sm"
          :min="1"
          :max="pageCount"
          :controls="false"
          @keydown.enter="go"
          @blur="go"
        />
      </label>
    </div>
    <p class="demo-status">Page {{ page }} of {{ pageCount }}</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { InputNumber, Pagination } from 'vael-ui'

const TOTAL = 1240
const PAGE_SIZE = 10
const pageCount = Math.ceil(TOTAL / PAGE_SIZE)

const page = shallowRef(1)
const target = shallowRef<number | null>(1)
// The field follows the pagination's buttons too.
watch(page, (value) => (target.value = value))

function go() {
  if (target.value != null) page.value = target.value
}
</script>

<style scoped>
.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
.jump {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
.jump-input {
  inline-size: 5rem;
}
</style>
