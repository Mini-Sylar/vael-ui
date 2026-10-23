<template>
  <section class="demo">
    <h3>Your own height animation: <code>:motion="false"</code> and GSAP</h3>
    <p class="note">
      The same approach as the Accordion demo. With <code>:motion="false"</code>, Collapsible skips
      its height transition and writes no inline styles, so GSAP tweens the height of a wrapper
      inside the panel with nothing to conflict with it.
    </p>
    <Collapsible v-model:open="panelOpen" :motion="false" class="collapsible-demo">
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
  transition: transform var(--ui-duration-enter) var(--ui-ease-out);
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
