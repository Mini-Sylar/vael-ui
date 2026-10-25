<template>
  <section class="demo">
    <h3>Extreme: a jelly highlight on your own spring</h3>
    <p class="note">
      With <code>motion: false</code> the composable only measures: its style jumps straight to the
      hovered row. Here vael-ui's own spring engine (<code>createSpring</code>) chases that target
      instead, under-damped so it overshoots, and the blob stretches along its speed and squashes
      across it, like jelly. Sweep the pointer up and down the list fast.
    </p>
    <div ref="list" class="jelly-list">
      <div ref="blob" class="jelly-blob" aria-hidden="true" />
      <button v-for="item in items" :key="item" type="button" class="jelly-row">
        {{ item }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { useHoverIndicator } from 'vael-ui'
import { createSpring } from 'vael-ui/motion'

const items = ['Inbox', 'Starred', 'Snoozed', 'Sent', 'Drafts', 'Archive', 'Trash']

const list = useTemplateRef<HTMLElement>('list')
const blob = useTemplateRef<HTMLElement>('blob')
// motion: false: the style lands on the row at once, and the springs below do the moving.
const { style } = useHoverIndicator(list, { itemSelector: '.jelly-row', motion: false })

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
// Under-damped (below 1) overshoots; a short response keeps it close behind the pointer.
const jelly = { damping: 0.55, response: 0.32 }
let shown = false

function paint() {
  const el = blob.value
  if (!el) return
  // Stretch along the motion and squash across it, more the faster it travels.
  const stretch = Math.min(Math.abs(top.velocity) / 2400, 0.45)
  el.style.translate = `0 ${top.value}px`
  el.style.blockSize = `${height.value}px`
  el.style.scale = `${1 - stretch * 0.35} ${1 + stretch}`
}
const top = createSpring(0, jelly, paint)
const height = createSpring(0, { damping: 0.7, response: 0.3 }, paint)
const fade = createSpring(0, { response: 0.2 }, (value) => {
  if (blob.value) blob.value.style.opacity = String(value)
})

watch(style, (next) => {
  // Its place comes as `translate` (x y, in px) and its height as `blockSize`.
  const visible = next.opacity !== '0' && next.translate !== undefined
  fade.set(visible ? 1 : 0)
  if (!visible) return
  const to = parseFloat(String(next.translate).split(' ')[1] ?? '0')
  const size = parseFloat(next.blockSize!)
  // The first row shown, or reduced motion: no travel, it just appears there.
  if (!shown || reduce()) {
    top.jump(to)
    height.jump(size)
    shown = true
    return
  }
  top.set(to)
  height.set(size)
})

onBeforeUnmount(() => [top, height, fade].forEach((spring) => spring.destroy()))
</script>

<style scoped>
.jelly-list {
  position: relative;
  isolation: isolate;
  display: grid;
  max-inline-size: 16rem;
  padding: 0.375rem;
  border-radius: calc(var(--ui-radius) + 4px);
  background: var(--ui-surface);
  box-shadow: var(--ui-panel-shadow);
}
.jelly-blob {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0.375rem;
  z-index: -1;
  border-radius: 999px;
  background: color-mix(in oklch, var(--ui-primary) 12%, var(--ui-surface));
  opacity: 0;
  pointer-events: none;
}
.jelly-row {
  padding: 0.625rem 1rem;
  border: none;
  background: none;
  color: var(--ui-text);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: start;
  cursor: pointer;
}
.jelly-row:focus-visible {
  outline: none;
}
</style>
