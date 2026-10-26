<template>
  <section v-if="picked" v-animate="{ layoutId: `card-${picked}` }" class="detail">Detail</section>
  <div class="grid">
    <template v-for="id in [1, 2, 3]" :key="id">
      <article
        v-if="picked !== id"
        v-animate="{ layoutId: `card-${id}` }"
        :class="`card card-${id}`"
      >
        Card {{ id }}
      </article>
    </template>
  </div>
</template>

<script setup lang="ts" vapor>
// The detail opens above the grid, pushing it down in the same update the card leaves in.
import { shallowRef } from 'vue'
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'

const picked = shallowRef(0)
defineExpose({ picked })
</script>

<style>
.detail {
  block-size: 200px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 100px);
  gap: 10px;
}
.card {
  block-size: 80px;
}
</style>
