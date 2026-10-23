<template>
  <section class="demo">
    <h3>Nested / stacked sheets</h3>
    <p class="note">
      Open a sheet from inside another and they stack: the one behind steps back a little, and comes
      forward again as the one on top closes. Escape and focus act on the top sheet only. There's
      nothing to wire up.
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
