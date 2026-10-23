<template>
  <section class="demo">
    <h3>Extreme: the dot hops to the next option (GSAP)</h3>
    <p class="note">
      <code>:motion="false"</code> turns off Radio's own transitions, and you animate the exposed
      <code>controlEl</code> and <code>dotEl</code>. Choosing a plan sends the dot out of the old
      circle on an arc that overshoots and settles into the new one. The old circle empties and the
      new one fills as the dot arrives.
    </p>
    <RadioGroup v-model="plan">
      <Radio
        v-for="option in plans"
        :key="option.value"
        :ref="(radio) => track(option.value, radio)"
        :value="option.value"
        :label="option.label"
        :description="option.description"
        :motion="false"
      />
    </RadioGroup>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, shallowRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Radio, RadioGroup } from 'vael-ui'

const plans = [
  { value: 'free', label: 'Free', description: 'For trying things out' },
  { value: 'pro', label: 'Pro', description: 'For people who ship' },
  { value: 'team', label: 'Team', description: 'For everyone else too' },
]
const plan = shallowRef<string | null>('free')

type RadioHandle = {
  el: HTMLElement | null
  controlEl: HTMLElement | null
  dotEl: HTMLElement | null
}
const radios = new Map<string, RadioHandle>()
function track(value: string, radio: unknown) {
  if (radio) radios.set(value, radio as RadioHandle)
  else radios.delete(value)
}

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const resting = 'transform,backgroundColor,borderColor,boxShadow,zIndex'
let hop: gsap.core.Timeline | null = null
function reset() {
  for (const radio of radios.values()) {
    gsap.set([radio.el, radio.controlEl, radio.dotEl], { clearProps: resting })
  }
}

// The whole hop, from the old circle's position to the new one's.
function buildHop(old: RadioHandle, target: RadioHandle, from: DOMRect): gsap.core.Timeline {
  const controlEl = target.controlEl!
  const dotEl = target.dotEl!
  const to = controlEl.getBoundingClientRect()
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  // Colors come from the real states, so the fill and the ripple match any theme.
  const filled = getComputedStyle(controlEl)
  const empty = getComputedStyle(old.controlEl!)
  const fill = { backgroundColor: filled.backgroundColor, borderColor: filled.borderColor }
  const hollow = { backgroundColor: empty.backgroundColor, borderColor: empty.borderColor }
  const dotColor = getComputedStyle(dotEl).backgroundColor
  const ripple = (alpha: number) =>
    fill.backgroundColor.replace(/rgba?\(([^)]+)\)/, `rgba($1, ${alpha})`)
  // The arc bulges sideways for a vertical hop and upward for a horizontal one.
  const sideways = Math.abs(dy) >= Math.abs(dx)
  const along = sideways ? 'y' : 'x'
  const across = sideways ? 'x' : 'y'
  const flight = 0.5
  // A short wind-up: anything longer reads as lag between the click and the dot moving.
  const launch = 0.05
  const land = launch + flight * 0.8

  // The ball's shape follows its speed, so it is round when slow (the start, the top of the arc, the
  // settle) and stretched along its path when fast. `squash` adds the wind-up and the landing.
  // Everything goes through this one function, so no two tweens fight over the scale.
  const shape = { squash: -0.5 }
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI
  let speed = 0
  let last = { x: dx, y: dy, t: performance.now() }
  const apply = () => {
    const x = gsap.getProperty(dotEl, 'x') as number
    const y = gsap.getProperty(dotEl, 'y') as number
    const now = performance.now()
    const dt = Math.max(now - last.t, 1)
    const vx = ((x - last.x) / dt) * 1000
    const vy = ((y - last.y) / dt) * 1000
    last = { x, y, t: now }
    const v = Math.hypot(vx, vy)
    speed += (v - speed) * 0.5
    // Turn the stretch to face the way it is going, once it is going somewhere.
    if (v > 80) angle = (Math.atan2(-vx, vy) * 180) / Math.PI
    const long = Math.max(0.35, 1 + shape.squash + Math.min(speed / 600, 1.4))
    gsap.set(dotEl, { rotation: angle, scaleX: 1 / Math.sqrt(long), scaleY: long })
  }

  // Starting state, applied now rather than on the timeline's first tick: Vue has already flipped the
  // new radio to checked, and a frame painted before this would show the dot at its destination.
  gsap.set(target.el, { zIndex: 5 })
  gsap.set(controlEl, hollow)
  gsap.set(dotEl, { x: dx, y: dy, backgroundColor: fill.backgroundColor })
  apply()

  const tl = gsap.timeline({ onUpdate: apply, onComplete: reset })
  // The old circle gives way: it pinches as the dot leaves, then springs back empty.
  tl.fromTo(old.controlEl!, fill, { ...hollow, duration: 0.22, ease: 'power2.out' }, 0.04)
  tl.fromTo(
    old.controlEl!,
    { scale: 1 },
    {
      keyframes: { scale: [0.82, 1], easeEach: 'power2.out' },
      duration: 0.4,
      immediateRender: false,
    },
    0,
  )

  // Position: it starts where the old dot was, flies on an arc and overshoots its new home.
  tl.to(dotEl, { [along]: 0, duration: flight, ease: 'back.out(2.2)' }, launch)
  tl.to(
    dotEl,
    {
      keyframes: { [across]: [(sideways ? dx : dy) - 22, 0], easeEach: 'sine.inOut' },
      duration: flight * 0.85,
    },
    launch,
  )
  // Wind-up: squashed along its path, letting go as it launches. Landing: a hard squash that springs back.
  tl.to(shape, { squash: 0, duration: 0.12, ease: 'power2.out' }, launch)
  tl.fromTo(
    shape,
    { squash: -0.55 },
    { squash: 0, duration: 0.5, ease: 'elastic.out(1, 0.35)', immediateRender: false },
    land,
  )

  // Landing: the ball turns white as the circle fills, pops, and a ripple leaves it.
  tl.to(dotEl, { backgroundColor: dotColor, duration: 0.14, ease: 'power1.out' }, land)
  tl.to(controlEl, { ...fill, duration: 0.14, ease: 'power2.out' }, land)
  tl.fromTo(
    controlEl,
    { scale: 1 },
    {
      keyframes: { scale: [1.15, 1], easeEach: 'elastic.out(1, 0.4)' },
      duration: 0.55,
      immediateRender: false,
    },
    land,
  )
  tl.fromTo(
    controlEl,
    { boxShadow: `0 0 0 0 ${ripple(0.4)}` },
    {
      boxShadow: `0 0 0 10px ${ripple(0)}`,
      duration: 0.5,
      ease: 'power2.out',
      immediateRender: false,
    },
    land,
  )
  return tl
}

// Runs before the DOM updates, so the old circle is still where the dot is leaving from.
watch(plan, async (next, prev) => {
  const old = prev ? radios.get(prev) : undefined
  const from = old?.controlEl?.getBoundingClientRect()
  await nextTick()
  hop?.kill()
  reset()
  const target = next ? radios.get(next) : undefined
  if (!from || !old?.controlEl || !target?.controlEl || !target.dotEl || reduce()) return
  hop = buildHop(old, target, from)
})

// The first hop pays for parsing colors and eases and for the first style reads. Play one invisibly
// right after mount, so the first real click isn't the slow one.
onMounted(() => {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const [a, b] = [...radios.values()]
      if (!a?.controlEl || !b?.controlEl || !b.dotEl || reduce()) return
      buildHop(a, b, a.controlEl.getBoundingClientRect()).progress(1).kill()
      reset()
    }),
  )
})
</script>
