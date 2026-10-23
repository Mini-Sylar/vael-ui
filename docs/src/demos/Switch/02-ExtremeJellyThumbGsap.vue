<template>
  <section class="demo">
    <h3>Extreme: a jelly thumb (GSAP)</h3>
    <p class="note">
      <code>:motion="false"</code> turns off Switch's own transitions, and you animate the exposed
      <code>thumbEl</code> and <code>trackEl</code>. The thumb stretches as it starts, overshoots
      and wobbles to a stop, while the track squashes and its color fills in behind the thumb. Click
      again mid-flight and it reverses from where it is.
    </p>
    <Switch ref="turbo" v-model="enabled" label="Turbo mode" :motion="false" />
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Switch } from 'vael-ui'

const enabled = shallowRef(false)
const turbo = useTemplateRef('turbo')

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const center = (el: Element) => {
  const rect = el.getBoundingClientRect()
  return rect.left + rect.width / 2
}
let jelly: gsap.core.Timeline | null = null

// The thumb sits where Switch's CSS `translate` puts it. GSAP would fold that into `transform`
// and freeze it, so the timeline tweens plain numbers and writes the thumb's own `translate` and
// `scale` on top of that position.
function release(thumb: HTMLElement, track: HTMLElement) {
  for (const prop of ['translate', 'scale', 'transform-origin']) thumb.style.removeProperty(prop)
  track.style.removeProperty('background')
  track.style.removeProperty('border-color')
  gsap.set(track, { clearProps: 'transform' })
}

// Runs before the DOM updates, so the thumb is still where it's leaving from, even mid-flight.
watch(enabled, async (on) => {
  const thumb = turbo.value?.thumbEl
  const track = turbo.value?.trackEl
  if (!thumb || !track) return
  const from = center(thumb)
  jelly?.kill()
  release(thumb, track)
  const oldColor = getComputedStyle(track).backgroundColor
  await nextTick()
  if (reduce()) return

  // Vue has already moved the thumb to its new side; start it back where it was.
  const rest = parseFloat(getComputedStyle(thumb).translate) || 0
  const dx = from - center(thumb)
  const newColor = getComputedStyle(track).backgroundColor
  const [onColor, offColor] = on ? [newColor, oldColor] : [oldColor, newColor]
  // How far the thumb moves between off and on, the same distance Switch's CSS uses.
  const { width, height } = track.getBoundingClientRect()
  const travel = width - height

  // The fill tracks the thumb's progress from off to on: none at the off spot, full at the on
  // spot. Its edge stays under the thumb in between, so neither color peeks out around it.
  const thumbState = { x: dx, scaleX: 1, scaleY: 1 }
  const draw = () => {
    const position = rest + thumbState.x
    thumb.style.translate = `${position}px -50%`
    thumb.style.scale = `${thumbState.scaleX} ${thumbState.scaleY}`
    const edge = Math.min(Math.max(position / travel, 0), 1) * 100
    // Painted under the track's 1px border too, once, so no stray color shows at either end.
    track.style.background = `linear-gradient(to right, ${onColor} ${edge}%, ${offColor} ${edge}%) border-box no-repeat`
  }
  // Switch gives the "on" track a colored border; hide it until the fill catches up.
  track.style.borderColor = 'transparent'
  thumb.style.transformOrigin = dx < 0 ? 'left center' : 'right center'
  draw()

  jelly = gsap
    .timeline({ onUpdate: draw, onComplete: () => release(thumb, track) })
    .to(thumbState, { x: 0, duration: 0.55, ease: 'back.out(1.8)' }, 0)
    // Stretch along the way it's going, then wobble back to round on landing.
    .to(thumbState, { scaleX: 1.7, scaleY: 0.75, duration: 0.12, ease: 'power2.out' }, 0)
    .to(thumbState, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1.2, 0.3)' }, 0.14)
    .fromTo(
      track,
      { scaleX: 1, scaleY: 1 },
      {
        keyframes: { scaleX: [0.94, 1.04, 1], scaleY: [1.06, 0.97, 1] },
        duration: 0.6,
        ease: 'power2.out',
      },
      0,
    )
})
</script>
