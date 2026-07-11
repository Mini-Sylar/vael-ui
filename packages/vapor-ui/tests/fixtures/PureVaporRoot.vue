<template vapor>
  <VaporSpikeButton />
  <VaporSpikeDialog />
  <VaporSpikeVirtualList />
  <VaporSpikeAttrsSlots @click="onSpikeClick">
    <template #extra>
      <span data-testid="vapor-attrs-slots-extra-content">Extra slot content</span>
    </template>
  </VaporSpikeAttrsSlots>
  <output data-testid="vapor-attrs-slots-parent-clicked">{{ parentClicked ? 'yes' : 'no' }}</output>
</template>

<script setup lang="ts" vapor>
// A real SFC root, not a runtime-compiled template string — a plain object
// with a `template:` string compiles via the runtime compiler to VDOM, which
// would silently reintroduce a VDOM/Vapor boundary (and need the interop
// plugin to bridge it), defeating the entire point of this pure-Vapor tree.
import { shallowRef } from 'vue'
import VaporSpikeButton from './VaporSpikeButton.vue'
import VaporSpikeDialog from './VaporSpikeDialog.vue'
import VaporSpikeVirtualList from './VaporSpikeVirtualList.vue'
import VaporSpikeAttrsSlots from './VaporSpikeAttrsSlots.vue'

const parentClicked = shallowRef(false)
function onSpikeClick() {
  parentClicked.value = true
}
</script>
