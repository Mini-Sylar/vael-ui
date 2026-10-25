<template>
  <section class="demo">
    <h3>A spring thumb with vael-ui's spring</h3>
    <p class="note">
      One <code>createSpring</code> moves the thumb, and the stretch comes from the spring's speed:
      the thumb stretches as it speeds up, overshoots and settles round. Click again mid-flight and
      it reverses, keeping its momentum. <code>:motion="false"</code> turns off Switch's own
      movement, and the spring writes to the exposed <code>thumbEl</code>.
    </p>
    <Switch ref="sw" v-model="enabled" label="Turbo mode" :motion="false" />
  </section>
</template>

<script setup lang="ts">
import { nextTick, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { Switch } from 'vael-ui'
import { createSpring } from 'vael-ui/motion'

const enabled = shallowRef(false)
const sw = useTemplateRef('sw')
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Position 0 is off, 1 is on; the thumb's CSS rest position is cleared while the spring runs.
let travel = 0
const spring = createSpring(0, { damping: 0.55, response: 0.4 }, (p) => {
  const thumb = sw.value?.thumbEl
  if (!thumb) return
  const stretch = Math.min(Math.abs(spring.velocity) / 12, 0.45)
  thumb.style.translate = `${p * travel}px -50%`
  thumb.style.scale = `${1 + stretch} ${1 - stretch * 0.4}`
  if (!spring.isAnimating) {
    thumb.style.removeProperty('translate')
    thumb.style.removeProperty('scale')
  }
})
onScopeDispose(() => spring.destroy())

watch(enabled, async (on) => {
  const track = sw.value?.trackEl
  if (!track) return
  travel = track.offsetWidth - track.offsetHeight
  await nextTick()
  if (reduced()) spring.jump(on ? 1 : 0)
  else spring.set(on ? 1 : 0)
})
</script>
