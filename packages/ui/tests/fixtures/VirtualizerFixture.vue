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
        :ref="(el) => measureRow(row.index, el as HTMLElement | null)"
        :data-virtual-index="row.index"
        :data-testid="`row-${row.index}`"
        :style="rowStyle(row)"
      >
        Row {{ row.index }} — {{ dynamic ? variableHeight(row.index) : rowHeight }}px
      </div>
    </div>
  </div>
  <output data-testid="rendered-count">{{ items.length }}</output>
  <output data-testid="rendered-indices">{{ items.map((r) => r.index).join(',') }}</output>
  <output data-testid="reach-end-count">{{ reachEndCount }}</output>
  <output data-testid="reach-start-count">{{ reachStartCount }}</output>
  <output data-testid="measured-size">{{ measuredSize ?? '' }}</output>
  <button data-testid="scroll-to-2" @click="scrollToIndex(2)">scroll to 2</button>
  <button data-testid="scroll-to-50" @click="scrollToIndex(50)">scroll to 50</button>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useVirtualizer } from '../../src/composables/useVirtualizer'
import type { VirtualRow } from '../../src/composables/useVirtualizer'

const props = withDefaults(
  defineProps<{
    count?: number
    itemSize?: number
    rowHeight?: number
    overscan?: number
    dynamic?: boolean
    estimateSize?: number
  }>(),
  { count: 10000, rowHeight: 40, overscan: 8, dynamic: false },
)

// Deterministic, genuinely-different-per-row heights for dynamic-mode tests.
function variableHeight(index: number): number {
  return 40 + (index % 3) * 20
}

// Dynamic mode: keep the virtualizer's own position/translate, but let the row's
// real height come from content (variableHeight), not the virtualizer's current
// estimate — that's what measureRow() is meant to observe and correct for.
function rowStyle(row: VirtualRow): Record<string, string> {
  if (!props.dynamic) return { ...row.style, blockSize: `${props.rowHeight}px` }
  const { blockSize: _blockSize, ...position } = row.style
  return { ...position, blockSize: `${variableHeight(row.index)}px` }
}

const containerEl = useTemplateRef<HTMLElement>('containerEl')
const reachEndCount = shallowRef(0)
const reachStartCount = shallowRef(0)

const { listStyle, items, scrollToIndex, measuredSize, measureRow } = useVirtualizer({
  containerEl,
  count: () => props.count,
  itemSize: () => props.itemSize,
  overscan: () => props.overscan,
  dynamic: () => props.dynamic,
  estimateSize: () => props.estimateSize,
  onReachEnd: () => {
    reachEndCount.value++
  },
  onReachStart: () => {
    reachStartCount.value++
  },
})

defineExpose({ containerEl })
</script>
