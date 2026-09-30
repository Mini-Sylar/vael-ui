<template>
  <section class="demo">
    <h3>Full external control, <code>motionCss="false"</code> + GSAP height tween</h3>
    <p class="note">
      Same escape hatch as Accordion's: skip the built-in transition and drive the panel's height
      with GSAP instead. <code>useCollapse</code> writes no inline style at all once
      <code>motionCss</code> is <code>false</code>, so nothing fights the tween.
    </p>
    <Collapsible v-model:open="panelOpen" :motion-css="false" class="collapsible-demo">
      <template #trigger="{ open }">
        <Button variant="ghost" block style="justify-content: space-between">
          <span>Release notes</span>
          <template #trailing>
            <span class="collapsible-nav-chevron" :data-open="open" aria-hidden="true">
              <PhCaretRight :size="12" />
            </span>
          </template>
        </Button>
      </template>
      <div ref="heightRef" class="height-wrap" style="overflow: hidden">
        <p ref="contentRef" class="height-panel-text">
          v0.4.2 adds keyboard support to Dock and fixes a rubber-band overshoot in Resizable. This
          panel's height is entirely GSAP's, not the library's CSS transition.
        </p>
      </div>
    </Collapsible>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { Button, Collapsible } from 'vael-ui'
import { PhCaretRight } from '@phosphor-icons/vue'

const panelOpen = shallowRef(false)
const contentRef = useTemplateRef<HTMLElement>('contentRef')
const heightRef = useTemplateRef<HTMLElement>('heightRef')

watch(panelOpen, (open) => {
  const wrap = heightRef.value
  const content = contentRef.value
  if (!wrap || !content) return
  gsap.to(wrap, { height: open ? content.scrollHeight : 0, duration: 0.4, ease: 'power3.out' })
})
</script>

<style scoped>
.collapsible-demo {
  max-width: 24rem;
  margin-block-end: 1.5rem;
}
.collapsible-nav-chevron {
  display: inline-flex;
  transition: transform 0.2s ease;
}
.collapsible-nav-chevron[data-open='true'] {
  transform: rotate(90deg);
}
.height-panel-text {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
}
.height-wrap {
  height: 0;
}
</style>
