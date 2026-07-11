<template>
  <div :ref="setContainerEl" data-testid="vapor-virtual-container" class="vapor-virtual-container">
    <div :style="listStyle">
      <div
        v-for="row in items"
        :key="row.index"
        class="vapor-virtual-row"
        data-testid="vapor-virtual-row"
        :data-index="row.index"
        :style="row.style"
      >
        Row {{ row.index }}
      </div>
    </div>
  </div>
  <output data-testid="vapor-virtual-rendered-count">{{ items.length }}</output>
</template>

<script setup lang="ts" vapor>
// Spike 3: the real useVirtualizer() composable — windowed v-for mount/
// unmount driven by scroll position, absolute-positioned via `translate` —
// authored as a genuinely Vapor component. This is the riskiest shape in
// the library: 1000 logical rows, only a handful ever actually in the DOM,
// constantly mounting/unmounting as the window scrolls. No interop plugin,
// no VDOM anywhere in this tree.
import { shallowRef } from 'vue'
import type { ComponentPublicInstance, Ref } from 'vue'
import { useVirtualizer } from 'vael-ui'
import type { VirtualRow } from 'vael-ui'

const containerEl = shallowRef<HTMLElement | null>(null)
function setContainerEl(el: Element | ComponentPublicInstance | null) {
  containerEl.value = el as HTMLElement | null
}

// Same dual-Vue-instance Ref branding friction documented for `dropzoneTarget`
// in App.vue — cast the whole return to THIS package's own local `Ref` type
// (not vael-ui's) so vue-tsc's template auto-unwrap recognizes it. The runtime
// objects are unaffected; only their TS identity differs across the two
// `vue` copies.
const { listStyle, items } = useVirtualizer({
  containerEl: containerEl as unknown as Parameters<typeof useVirtualizer>[0]['containerEl'],
  count: 1000,
  itemSize: 32,
}) as unknown as {
  listStyle: Ref<Record<string, string>>
  items: Readonly<Ref<VirtualRow[]>>
}
</script>

<style>
/* block-size/overflow/position are functional — useVirtualizer measures
   this box via useElementSize to compute the visible window, not just
   cosmetic. border/radius/background reuse the library's own tokens so
   this reads as part of the same design system, not raw unstyled HTML. */
.vapor-virtual-container {
  block-size: 200px;
  overflow: auto;
  position: relative;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface);
}
.vapor-virtual-row {
  position: absolute;
  inset-inline: 0;
  block-size: 32px;
  padding-inline: 0.75rem;
  display: flex;
  align-items: center;
  color: var(--ui-text);
}
.vapor-virtual-row:nth-child(even) {
  background: color-mix(in oklch, var(--ui-primary) 3%, var(--ui-surface));
}
</style>
