<template>
  <section class="demo">
    <h3>Extreme: spring glide on keyboard/track jumps (motion-v)</h3>
    <p class="note">
      A drag stays 1:1 — the thumb's own <code>translate</code> already tracks the pointer exactly,
      so it's left alone. Arrow keys and clicking the track are a different kind of change (the
      value jumps straight to its new position); this spring-smooths only those, then converges back
      to the real value. It rides <code>thumbEls</code>: the base position stays in
      <code>translate</code>, a <code>transform: translateX()</code> carries only the shrinking gap
      between the spring and the real value, so the two properties never fight.
    </p>
    <div class="row slider-row">
      <Slider
        ref="springSlider"
        v-model="springValue"
        :min="0"
        :max="100"
        :step="10"
        style="max-width: 20rem"
      />
      <output class="note">{{ springValue }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useMotionValue, useSpring, useMotionValueEvent, useReducedMotion } from 'motion-v'
import { Slider } from 'vael-ui'

const springValue = shallowRef(50)
const springSlider = useTemplateRef<InstanceType<typeof Slider>>('springSlider')
const reduce = useReducedMotion()

const { width: trackWidth } = useElementSize(() => springSlider.value?.trackEl)

const percent = useMotionValue(springValue.value)
const smoothPercent = useSpring(percent, { stiffness: 300, damping: 30 })

watch(springValue, (value) => percent.set(value))

useMotionValueEvent(smoothPercent, 'change', (smoothed) => {
  const thumb = springSlider.value?.thumbEls?.[0]
  const root = springSlider.value?.el
  if (!thumb || !root) return
  if (reduce.value || root.hasAttribute('data-dragging')) {
    smoothPercent.jump(springValue.value)
    thumb.style.transform = ''
    return
  }
  const gapPx = ((smoothed - springValue.value) / 100) * trackWidth.value
  thumb.style.transform = gapPx ? `translateX(${gapPx}px)` : ''
})
</script>

<style scoped>
.slider-row {
  align-items: center;
  gap: 1rem;
}
</style>
