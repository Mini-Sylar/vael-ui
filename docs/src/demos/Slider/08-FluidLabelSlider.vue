<template>
  <section class="demo">
    <h3>Fluid slider: CSS and spring (motion-v)</h3>
    <p class="note">
      Same slider twice. The first draws its fill straight from the <code>#track</code> slot's
      <code>percents</code>. The second runs the fill through a spring, swells while held, and
      stretches with resistance when you drag past either end, using the exposed
      <code>trackEl</code> and <code>dragging</code>.
    </p>
    <div class="pair">
      <figure>
        <Slider v-model="cssValue" class="fluid-slider fluid-css" aria-label="Brightness">
          <template #track="{ percents }">
            <span class="fluid-label"
              ><span>Brightness</span><span>{{ cssValue }}%</span></span
            >
            <span
              class="fluid-fill"
              :style="{ clipPath: clipTo(percents[0] ?? 0) }"
              aria-hidden="true"
            >
              <span class="fluid-label"
                ><span>Brightness</span><span>{{ cssValue }}%</span></span
              >
            </span>
          </template>
        </Slider>
        <figcaption>CSS</figcaption>
      </figure>
      <figure>
        <Slider
          ref="springSlider"
          v-model="springValue"
          class="fluid-slider"
          aria-label="Brightness"
        >
          <template #track>
            <span class="fluid-label"
              ><span>Brightness</span><span>{{ springValue }}%</span></span
            >
            <span ref="springFill" class="fluid-fill" aria-hidden="true">
              <span class="fluid-label"
                ><span>Brightness</span><span>{{ springValue }}%</span></span
              >
            </span>
          </template>
        </Slider>
        <figcaption>Spring</figcaption>
      </figure>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useMotionValue, useMotionValueEvent, useReducedMotion, useSpring } from 'motion-v'
import { Slider } from 'vael-ui'

const cssValue = shallowRef(45)
const springValue = shallowRef(45)

const clipTo = (percent: number) => `inset(0 ${100 - percent}% 0 0 round 9999px)`

const springSlider = useTemplateRef<InstanceType<typeof Slider>>('springSlider')
const springFill = useTemplateRef<HTMLElement>('springFill')
const reduce = useReducedMotion()

const fill = useSpring(useMotionValue(springValue.value), { stiffness: 380, damping: 32 })
const press = useSpring(useMotionValue(1), { stiffness: 500, damping: 18 })
const stretch = useSpring(useMotionValue(0), { stiffness: 420, damping: 14 })

watch(springValue, (value) => (reduce.value ? fill.jump(value) : fill.set(value)))

useMotionValueEvent(fill, 'change', (value) => {
  if (springFill.value) springFill.value.style.clipPath = clipTo(value)
})
onMounted(() => springFill.value && (springFill.value.style.clipPath = clipTo(springValue.value)))

// Stretch toward the side being overdragged, from the opposite edge.
function paintPill() {
  const root = springSlider.value?.el
  if (!root) return
  const s = stretch.get()
  root.style.transformOrigin = s < 0 ? 'right center' : 'left center'
  root.style.transform = `scale(${press.get() * (1 + Math.abs(s))}, ${press.get() * (1 - Math.abs(s) * 0.4)})`
}
useMotionValueEvent(press, 'change', paintPill)
useMotionValueEvent(stretch, 'change', paintPill)

watch(
  () => springSlider.value?.dragging,
  (dragging) => {
    if (reduce.value) return
    press.set(dragging ? 1.03 : 1)
    if (!dragging) stretch.set(0)
  },
)

const MAX_STRETCH = 0.08
useEventListener(window, 'pointermove', (event: PointerEvent) => {
  const track = springSlider.value?.trackEl
  if (!track || !springSlider.value?.dragging || reduce.value) return
  const rect = track.getBoundingClientRect()
  const raw = (event.clientX - rect.left) / rect.width
  const over = raw < 0 ? raw : raw > 1 ? raw - 1 : 0
  // Rubber band: the further past the edge, the less it gives.
  stretch.set(Math.sign(over) * MAX_STRETCH * (1 - 1 / (Math.abs(over) * 4 + 1)))
})
</script>

<style scoped>
.pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.5rem 2rem;
  max-width: 42rem;
}

figure {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

figcaption {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.fluid-slider {
  --ui-slider-thumb-size: 0px;
  --ui-slider-track: 3rem;
}

.fluid-css {
  transition: scale 200ms var(--ui-ease-out);
}

.fluid-css[data-dragging] {
  scale: 1.03;
}

@media (prefers-reduced-motion: reduce) {
  .fluid-css[data-dragging] {
    scale: 1;
  }
}

.fluid-slider:has(:deep(.ui-slider-thumb[data-focus-visible])) :deep(.ui-slider-track) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.fluid-slider :deep(.ui-slider-track) {
  overflow: hidden;
  background: var(--ui-muted);
}

.fluid-slider :deep(.ui-slider-fill) {
  display: none;
}

.fluid-slider :deep(.ui-slider-thumb) {
  inline-size: 1px;
  block-size: 100%;
  border: none;
  background: transparent;
  box-shadow: none;
  outline: none;
}

.fluid-fill {
  position: absolute;
  inset: 0;
  background: var(--ui-text);
}

.fluid-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text);
  pointer-events: none;
}

.fluid-fill .fluid-label {
  color: var(--ui-surface);
}
</style>
