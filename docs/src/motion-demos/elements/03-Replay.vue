<template>
  <section class="demo">
    <h3>Replay</h3>
    <div class="row">
      <span class="cart" aria-label="Cart">
        <PhShoppingCart :size="28" />
        <!-- Plays its initial again each time the count changes. -->
        <span
          v-if="count"
          v-animate.bouncy="{ initial: { scale: 1.4 }, replay: count }"
          class="badge"
          >{{ count }}</span
        >
      </span>
      <Button @click="count++">Add to cart</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PhShoppingCart } from '@phosphor-icons/vue'
import { Button, vAnimate } from 'vael-ui'

const count = shallowRef(0)
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.cart {
  position: relative;
  display: inline-flex;
}
.badge {
  position: absolute;
  inset-block-start: -0.5rem;
  inset-inline-end: -0.75rem;
  min-inline-size: 1.25rem;
  padding-inline: 0.25rem;
  border-radius: 999px;
  background: var(--ui-text);
  color: var(--ui-surface);
  font-size: 0.75rem;
  line-height: 1.25rem;
  text-align: center;
}
</style>
