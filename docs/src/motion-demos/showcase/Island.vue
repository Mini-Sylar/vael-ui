<!-- A black pill that springs to each activity's size, with a second bubble oozing out of its side. -->
<template>
  <section class="demo">
    <h3>Dynamic island</h3>
    <ConfigProvider :motion="style">
      <div class="stage">
        <!-- Drawn twice: the shapes under the goo filter, the sharp content over them. -->
        <div
          v-for="layer in layers"
          :key="layer"
          :class="['layer', layer]"
          :aria-hidden="layer === 'shapes' || undefined"
        >
          <div v-animate.size="island" class="island">
            <!-- One per activity: the old one shrinks into the shape as the new one grows out. -->
            <div :key="activity" v-animate="content" class="content">
              <template v-if="activity === 'call'"
                ><PhPhone :size="18" /><span>Maya · 02:14</span><span class="dot"
              /></template>
              <template v-else-if="activity === 'timer'"
                ><PhTimer :size="18" /><span class="big">04:59</span></template
              >
              <div v-else-if="activity === 'music'" class="music">
                <div class="art" />
                <div><strong>Late light</strong><span>Harbour Rooms</span></div>
                <PhPause :size="18" />
              </div>
              <span v-else class="idle" />
            </div>
          </div>
          <div
            v-if="activity === 'timer' || activity === 'call'"
            v-animate="layer === 'ink' ? icon : bubble"
            class="bubble"
          >
            <PhBellRinging v-if="activity === 'timer'" :size="18" />
            <PhMicrophone v-else :size="18" />
          </div>
        </div>
      </div>
    </ConfigProvider>
    <div class="switch">
      <Button v-for="a in activities" :key="a" size="sm" variant="secondary" @click="activity = a">
        {{ a }}
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ConfigProvider, vAnimate } from 'vael-ui'
import type { MotionStyle } from 'vael-ui'
import { PhBellRinging, PhMicrophone, PhPause, PhPhone, PhTimer } from '@phosphor-icons/vue'

// A goo: blurred, then its edge sharpened, so shapes that meet merge.
const style: MotionStyle = {
  version: 1,
  filters: { 'island-goo': { blur: 8, contrast: [18, -7] } },
}
const layers = ['shapes', 'ink']
const activities = ['idle', 'call', 'timer', 'music'] as const
const activity = shallowRef<(typeof activities)[number]>('idle')
// A shape arriving at a new size: a touch of bounce.
const spring = { spring: { damping: 0.72, response: 0.42 } }
// Follows its content's size, growing around its middle.
const island = spring
// Out of the island's edge, and back into it the same way.
const tucked = { x: -40, scale: '0.6' }
const bubble = { initial: tucked, exit: tucked, ...spring }
// Its icon rides along, and fades before it can reach the island's content.
const icon = {
  initial: { ...tucked, opacity: 0 },
  exit: { ...tucked, opacity: { value: 0, duration: 100 } },
  ...spring,
}
// Grows out of the shape as it nears its new size; the old one shrinks away quicker.
const hidden = { opacity: 0, blur: 3, scale: '0.9' }
const quick = (value: number | string) => ({ value, duration: 150 })
const content = {
  initial: hidden,
  exit: { opacity: quick(0), blur: quick(3), scale: quick('0.9') },
  delay: 0.08,
  duration: 250,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
}
</script>

<style scoped>
.demo {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 1.5rem;
  min-block-size: 12rem;
}
.stage {
  display: grid;
  justify-items: center;
}
/* Positioned: the bubble hangs off it, and the ink paints over the filtered shapes at rest. */
.layer {
  position: relative;
  grid-area: 1 / 1;
  display: flex;
  align-items: center;
}
.shapes {
  filter: url(#island-goo);
}
.shapes .content,
.shapes .bubble svg {
  visibility: hidden;
}
.island,
.bubble {
  background: #000;
  color: #fff;
}
.ink .island,
.ink .bubble {
  background: transparent;
}
.island {
  position: relative;
  display: inline-flex;
  /* A bigger activity is revealed from the middle as the shape grows. */
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 28px;
}
/* Hangs off the island's side, so it comes and goes without moving the island. */
.bubble {
  position: absolute;
  inset-block-start: calc(50% - 1.25rem);
  inset-inline-start: calc(100% + 0.375rem);
  display: grid;
  place-items: center;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: 50%;
  color: #f59e0b;
}
.content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  white-space: nowrap;
  font-size: 0.875rem;
}
.idle {
  inline-size: 5rem;
  block-size: 0.5rem;
}
.dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 50%;
  background: #34c759;
}
.big {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}
.music {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-block: 0.5rem;
}
.music div:nth-child(2) {
  display: grid;
}
.music span {
  color: rgb(255 255 255 / 0.6);
}
.art {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c3aed, #f97316);
}
.switch {
  display: flex;
  gap: 0.25rem;
  text-transform: capitalize;
}
</style>
