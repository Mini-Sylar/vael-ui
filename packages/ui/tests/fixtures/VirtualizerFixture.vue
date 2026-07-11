<template>
  <div
    ref="containerEl"
    data-testid="container"
    style="block-size: 200px; overflow-y: auto; position: relative"
  >
    <div :style="listStyle" data-testid="spacer">
      <div
        v-for="row in items"
        :key="row.index"
        :data-virtual-index="row.index"
        :data-testid="`row-${row.index}`"
        :style="{ ...row.style, blockSize: `${rowHeight}px` }"
      >
        Row {{ row.index }}
      </div>
    </div>
  </div>
  <output data-testid="rendered-count">{{ items.length }}</output>
  <output data-testid="rendered-indices">{{ items.map((r) => r.index).join(',') }}</output>
  <output data-testid="reach-end-count">{{ reachEndCount }}</output>
  <output data-testid="measured-size">{{ measuredSize ?? '' }}</output>
  <button data-testid="scroll-to-2" @click="scrollToIndex(2)">scroll to 2</button>
  <button data-testid="scroll-to-50" @click="scrollToIndex(50)">scroll to 50</button>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useVirtualizer } from '../../src/composables/useVirtualizer'

const props = withDefaults(
  defineProps<{ count?: number; itemSize?: number; rowHeight?: number; overscan?: number }>(),
  { count: 10000, rowHeight: 40, overscan: 8 },
)

const containerEl = useTemplateRef<HTMLElement>('containerEl')
const reachEndCount = shallowRef(0)

const { listStyle, items, scrollToIndex, measuredSize } = useVirtualizer({
  containerEl,
  count: () => props.count,
  itemSize: () => props.itemSize,
  overscan: () => props.overscan,
  onReachEnd: () => {
    reachEndCount.value++
  },
})

defineExpose({ containerEl })
</script>
