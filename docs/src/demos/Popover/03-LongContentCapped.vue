<template>
  <section class="demo">
    <h3>Long content, capped to the available space</h3>
    <p class="note">
      floating-ui's <code>size()</code> middleware measures the free space each time the popover
      opens and sets a <code>max-height</code> on the panel, which then scrolls. Long content never
      overflows the viewport, wherever the trigger sits. The fade at the top and bottom edges is
      <code>scrollFade</code>, which uses the same <code>v-scroll-mask</code> directive as Dialog.
    </p>
    <Popover v-model:open="longContentOpen">
      <template #trigger="{ open, setTriggerEl }">
        <Button :ref="setTriggerEl" variant="outline" @click="longContentOpen = !longContentOpen">
          {{ open ? 'Close' : 'Open' }} long content
        </Button>
      </template>
      <template #default>
        <p v-for="n in 12" :key="n" class="panel-text">
          Paragraph {{ n }}. This exists purely to overflow the panel's available space so the
          size() middleware's max-height and scroll actually have something to constrain.
        </p>
      </template>
    </Popover>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Popover } from 'vael-ui'

const longContentOpen = shallowRef(false)
</script>

<style scoped>
.panel-text {
  font-size: 0.8125rem;
}
</style>
