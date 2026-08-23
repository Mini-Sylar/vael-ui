<template>
  <section class="demo">
    <h3>Nested / stacked sheets</h3>
    <p class="note">
      A sheet rendered inside another sheet's slot is detected automatically (provide/inject, same
      as Vaul's nested drawers): the parent recedes behind the child with Vaul's own 16px
      displacement, composed with its snap position, and comes back in sync with the child's real
      exit. Escape and focus stay scoped to the topmost one via Dialog's layer stack, with zero
      consumer wiring.
    </p>
    <Button @click="parentOpen = true">Open parent sheet</Button>
    <BottomSheet v-model:open="parentOpen" title="Parent sheet" aria-label="Parent sheet">
      <p class="sheet-lede">Open a second sheet on top of this one:</p>
      <Button @click="childOpen = true">Open child sheet</Button>
      <BottomSheet v-model:open="childOpen" title="Child sheet" aria-label="Child sheet">
        <p class="sheet-lede">
          The parent sheet behind this one is scaled and pushed back. Try Escape: it closes only
          this one.
        </p>
      </BottomSheet>
    </BottomSheet>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, BottomSheet } from 'vael-ui'

const parentOpen = shallowRef(false)
const childOpen = shallowRef(false)
</script>

<style scoped>
.sheet-lede {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
</style>
