<template>
  <section class="demo">
    <h3>Your own height animation: <code>:motion="false"</code> and GSAP</h3>
    <p class="note">
      With <code>:motion="false"</code>, Accordion skips its height transition, and GSAP tweens the
      height of the exposed <code>panelEl</code> instead. The panel then gets no inline styles, so
      the demo styles the closed state too: a class keeps a closed panel at zero height. Each tween
      starts from the panel’s current height.
    </p>
    <Accordion v-model:value="springValue" :motion="false" class="accordion-demo">
      <AccordionItem
        ref="springItem"
        value="spring"
        title="GSAP-driven height"
        :ui="{ panel: 'gsap-panel' }"
      >
        <p class="spring-panel-text">
          This panel's height is a GSAP tween, not the library's CSS transition. The Accordion only
          tracks which item is open, <code>motion="false"</code> means it renders no inline
          block-size style of its own at all.
        </p>
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, unref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { Accordion, AccordionItem } from 'vael-ui'

const springValue = shallowRef<string | null>(null)
const springOpen = computed(() => springValue.value === 'spring')
const springItem = useTemplateRef<InstanceType<typeof AccordionItem>>('springItem')

// Runs before the re-render, while the panel still has its old height, so the
// tween starts exactly where the panel is (0 when closed, mid-tween if interrupted).
watch(springOpen, (open) => {
  const panel = unref(springItem.value?.panelEl)
  if (!panel) return
  gsap.killTweensOf(panel)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  gsap.fromTo(
    panel,
    { height: panel.offsetHeight },
    {
      height: open ? panel.scrollHeight : 0,
      duration: reduced ? 0 : 0.4,
      ease: 'power3.out',
      // Hand back to CSS once settled: auto height when open, the closed rule when closed.
      clearProps: 'height',
    },
  )
})
</script>

<style scoped>
.accordion-demo {
  max-width: 32rem;
  margin-block-end: 1.5rem;
}
.accordion-demo :deep(.gsap-panel) {
  overflow: hidden;
}
.accordion-demo :deep(.gsap-panel[data-state='closed']) {
  height: 0;
}
.spring-panel-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
</style>
