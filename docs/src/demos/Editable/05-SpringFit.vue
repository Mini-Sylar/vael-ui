<template>
  <section class="demo">
    <h3>Spring: the field fits what you type, and the saved name drops in</h3>
    <p class="note">
      With <code>:motion="false"</code>, the swap between preview and input is yours. Two
      <code>createSpring</code> calls write to the elements Editable exposes: one sizes the input to
      its text as you type, with a little overshoot, and one drops the saved name into place.
      Nothing re-renders on each frame.
    </p>
    <Editable
      ref="editable"
      v-model="name"
      v-model:editing="editing"
      :motion="false"
      size="lg"
      aria-label="Project name"
      @submit="land"
    />
  </section>
</template>

<script setup lang="ts">
import { nextTick, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { createSpring, Editable } from 'vael-ui'
import type { SpringHandle } from 'vael-ui'

const name = shallowRef('Northwind launch')
const editing = shallowRef(false)
const editable = useTemplateRef('editable')
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

let widthSpring: SpringHandle | undefined
let canvas: CanvasRenderingContext2D | null = null

// Text width plus the field's padding and border, so the text just fits.
function fitWidth(input: HTMLInputElement, frame: HTMLElement): number {
  canvas ??= document.createElement('canvas').getContext('2d')
  const style = getComputedStyle(input)
  canvas!.font = style.font
  const text = canvas!.measureText(input.value || input.placeholder).width
  const content =
    input.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd)
  return Math.max(96, Math.ceil(text + frame.offsetWidth - content + 4))
}

// Measured before the swap, while the resting text is still on screen.
watch(editing, async (on) => {
  if (!on) return
  const from = editable.value?.previewEl?.getBoundingClientRect().width ?? 0
  await nextTick()
  const input = editable.value?.inputEl
  const frame = input?.closest<HTMLElement>('.ui-input')
  if (!input || !frame) return
  widthSpring?.destroy()
  widthSpring = createSpring(from, { damping: 0.6, response: 0.35 }, (width) => {
    frame.style.inlineSize = `${width}px`
  })
  const follow = () =>
    reduced() ? widthSpring!.jump(fitWidth(input, frame)) : widthSpring!.set(fitWidth(input, frame))
  follow()
  input.addEventListener('input', follow)
})

function land() {
  void nextTick(() => {
    const preview = editable.value?.previewEl
    if (!preview || reduced()) return
    // One spring from 0 to 1; below damping 1 it overshoots, so the name dips and settles.
    createSpring(0, { damping: 0.45, response: 0.4 }, (p) => {
      preview.style.transform = `translateY(${(1 - p) * -10}px) scale(${0.96 + 0.04 * p})`
      preview.style.opacity = String(Math.min(1, p * 1.5))
    }).set(1)
  })
}

onScopeDispose(() => widthSpring?.destroy())
</script>
