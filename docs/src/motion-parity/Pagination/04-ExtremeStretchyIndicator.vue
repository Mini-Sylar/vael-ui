<template>
  <section class="demo">
    <h3>Extreme: a stretchy indicator</h3>
    <p class="note">
      Pagination's <code>stretch</code> lets the edge facing the new page leave first and the other
      follow on a bouncier spring, and <code>squash</code> starts each move a little flattened. The
      page numbers in the contrast color move with the pill.
    </p>
    <Pagination
      v-model:page="page"
      aria-label="Pagination with a stretchy indicator"
      :total="200"
      :sibling-count="2"
      :motion="motion"
    />
    <p class="demo-status">Page {{ page }} of 20</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Pagination } from 'vael-ui'
import type { PaginationMotion } from 'vael-ui'

const page = shallowRef(3)

// Fitted to the original: leading edge back.out(2.4) 0.5s, trailing elastic.out(1, 0.55) 0.7s after 70ms.
const motion: PaginationMotion = {
  spring: { damping: 0.5, response: 0.42 },
  stretch: { trail: { damping: 0.48, response: 0.26 }, delay: 0.07 },
  // Rides the trailing spring: 0.82 tall, springing back to full height.
  squash: 0.82,
}
</script>
