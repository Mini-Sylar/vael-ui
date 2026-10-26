<template>
  <section class="demo">
    <h3>From code</h3>
    <div ref="row" class="row">
      <form class="code" @submit.prevent="check">
        <Input v-model="code" aria-label="Discount code" placeholder="Try SAVE10" class="field" />
        <Button type="submit" variant="secondary">Apply</Button>
      </form>
      <Button @click="add">
        Add to cart
        <template #trailing>
          <span class="count">{{ items }}</span>
        </template>
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { Button, Input } from 'vael-ui'
import { useAnimate } from 'vael-ui/motion'

// Selectors match inside the row, and anything still playing stops when this unmounts.
const { animate } = useAnimate(useTemplateRef('row'))
const code = shallowRef('')
const items = shallowRef(0)

// A wrong code shakes the field: an event, not a state, so it's played from code.
function check() {
  if (code.value.trim().toUpperCase() === 'SAVE10') return
  animate('.field', { x: [0, -8, 8, -5, 5, 0] }, { duration: 400 })
}

async function add() {
  items.value++
  await animate('.count', { scale: [1, 1.5, 1] }, { spring: 'bouncy' })
}
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
}
.code {
  display: flex;
  gap: 0.5rem;
}
.count {
  display: inline-grid;
  place-items: center;
  min-inline-size: 1.25rem;
  padding-inline: 0.25rem;
  border-radius: 999px;
  background: var(--ui-surface);
  color: var(--ui-text);
  font-size: 0.75rem;
}
</style>
