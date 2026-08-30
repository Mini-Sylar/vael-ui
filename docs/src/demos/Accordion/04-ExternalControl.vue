<template>
  <section class="demo">
    <h3>Full external control, <code>motionCss="false"</code> + GSAP height tween</h3>
    <p class="note">
      The built-in transition is skipped entirely, GSAP tweens the panel's own height instead,
      proving the escape hatch, not just the default.
    </p>
    <Accordion v-model:value="springValue" :motion-css="false" class="accordion-demo">
      <AccordionItem value="spring" title="GSAP-driven height">
        <div ref="springHeightRef" class="spring-height-wrap">
          <p ref="springContentRef" class="spring-panel-text">
            This panel's height is a GSAP tween, not the library's CSS transition. The Accordion
            only tracks which item is open, <code>motionCss="false"</code> means it renders no
            inline block-size style of its own at all.
          </p>
        </div>
      </AccordionItem>
    </Accordion>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { Accordion, AccordionItem } from 'vael-ui'

const springValue = shallowRef<string | null>(null)
const springOpen = computed(() => springValue.value === 'spring')
const springContentRef = useTemplateRef<HTMLElement>('springContentRef')
const springHeightRef = useTemplateRef<HTMLElement>('springHeightRef')

watch(springOpen, (open) => {
  const wrap = springHeightRef.value
  const content = springContentRef.value
  if (!wrap || !content) return
  gsap.to(wrap, { height: open ? content.scrollHeight : 0, duration: 0.4, ease: 'power3.out' })
})
</script>

<style scoped>
.accordion-demo {
  max-width: 32rem;
  margin-block-end: 1.5rem;
}
.spring-panel-text {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
.spring-height-wrap {
  height: 0;
  overflow: hidden;
}
</style>
