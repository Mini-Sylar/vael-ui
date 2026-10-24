<template>
  <section class="demo">
    <h3>Vertical volume: CSS and spring (GSAP)</h3>
    <p class="note">
      A phone-style volume control built on <code>orientation="vertical"</code>. The GSAP version
      eases the fill, grows while you hold it and stretches when you drag past the top or bottom,
      then springs back when you let go.
    </p>
    <div class="pair">
      <figure>
        <Slider
          v-model="cssVolume"
          orientation="vertical"
          class="volume volume-css"
          aria-label="Volume"
        >
          <template #track="{ percents }">
            <span class="volume-icon"><component :is="iconFor(cssVolume)" :size="22" /></span>
            <span
              class="volume-fill"
              :style="{ clipPath: clipTo(percents[0] ?? 0) }"
              aria-hidden="true"
            >
              <span class="volume-icon"><component :is="iconFor(cssVolume)" :size="22" /></span>
            </span>
          </template>
        </Slider>
        <figcaption>CSS</figcaption>
      </figure>
      <figure>
        <Slider
          ref="gsapSlider"
          v-model="gsapVolume"
          orientation="vertical"
          class="volume"
          aria-label="Volume"
        >
          <template #track>
            <span class="volume-icon"><component :is="iconFor(gsapVolume)" :size="22" /></span>
            <span ref="gsapFill" class="volume-fill" aria-hidden="true">
              <span class="volume-icon"><component :is="iconFor(gsapVolume)" :size="22" /></span>
            </span>
          </template>
        </Slider>
        <figcaption>GSAP</figcaption>
      </figure>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { gsap } from 'gsap'
import { PhSpeakerHigh, PhSpeakerLow, PhSpeakerSlash } from '@phosphor-icons/vue'
import { Slider } from 'vael-ui'

const cssVolume = shallowRef(60)
const gsapVolume = shallowRef(60)

const iconFor = (value: number) =>
  value === 0 ? PhSpeakerSlash : value < 50 ? PhSpeakerLow : PhSpeakerHigh
const clipTo = (percent: number) => `inset(${100 - percent}% 0 0 0)`

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const gsapSlider = useTemplateRef<InstanceType<typeof Slider>>('gsapSlider')
const gsapFill = useTemplateRef<HTMLElement>('gsapFill')

const fill = { percent: gsapVolume.value }
const paintFill = () => gsapFill.value && (gsapFill.value.style.clipPath = clipTo(fill.percent))
const fillTo = gsap.quickTo(fill, 'percent', {
  duration: 0.45,
  ease: 'power3.out',
  onUpdate: paintFill,
})
onMounted(paintFill)

watch(gsapVolume, (value) => {
  if (reduce()) {
    fill.percent = value
    paintFill()
  } else fillTo(value)
})

watch(
  () => gsapSlider.value?.dragging,
  (dragging) => {
    const root = gsapSlider.value?.el
    if (!root || reduce()) return
    gsap.to(root, {
      scaleX: dragging ? 1.04 : 1,
      scaleY: dragging ? 1.04 : 1,
      duration: dragging ? 0.25 : 0.7,
      ease: dragging ? 'power2.out' : 'elastic.out(1, 0.4)',
      overwrite: 'auto',
    })
  },
)

const MAX_STRETCH = 0.1
useEventListener(window, 'pointermove', (event: PointerEvent) => {
  const slider = gsapSlider.value
  const track = slider?.trackEl
  if (!slider?.dragging || !track || reduce()) return
  const rect = track.getBoundingClientRect()
  const raw = (rect.bottom - event.clientY) / rect.height
  const over = raw < 0 ? raw : raw > 1 ? raw - 1 : 0
  // Rubber band: the further past the edge, the less it gives.
  const give = MAX_STRETCH * (1 - 1 / (Math.abs(over) * 4 + 1))
  gsap.to(slider.el, {
    transformOrigin: over < 0 ? 'center top' : 'center bottom',
    scaleY: 1.04 + give,
    scaleX: 1.04 - give * 0.4,
    duration: 0.15,
    ease: 'power2.out',
    overwrite: 'auto',
  })
})
</script>

<style scoped>
.pair {
  display: flex;
  gap: 3rem;
  padding-block: 1rem;
}

figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
}

figcaption {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.volume {
  --ui-slider-thumb-size: 0px;
  --ui-slider-track: 4rem;
  inline-size: 4rem;
  block-size: 11rem;
}

.volume-css {
  transition: scale 200ms var(--ui-ease-out);
}

.volume-css[data-dragging] {
  scale: 1.04;
}

.volume:has(:deep(.ui-slider-thumb[data-focus-visible])) :deep(.ui-slider-track) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 3px;
}

.volume :deep(.ui-slider-track) {
  overflow: hidden;
  border-radius: 1.25rem;
  background: var(--ui-muted);
}

.volume :deep(.ui-slider-fill) {
  display: none;
}

.volume :deep(.ui-slider-thumb) {
  inline-size: 100%;
  block-size: 1px;
  border: none;
  background: transparent;
  box-shadow: none;
  outline: none;
}

.volume-fill {
  position: absolute;
  inset: 0;
  background: var(--ui-text);
}

.volume-icon {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0.875rem;
  display: grid;
  place-items: center;
  color: var(--ui-text-muted);
  pointer-events: none;
}

.volume-fill .volume-icon {
  color: var(--ui-surface);
}

@media (prefers-reduced-motion: reduce) {
  .volume-css[data-dragging] {
    scale: 1;
  }
}
</style>
