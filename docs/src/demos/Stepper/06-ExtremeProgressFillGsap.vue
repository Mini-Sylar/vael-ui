<template>
  <section class="demo">
    <h3>Extreme: the line fills and the next step pops (GSAP)</h3>
    <p class="note">
      <code>:motion-css="false"</code> hands over the exposed <code>circleEls</code> and
      <code>connectorEls</code>. Next fills the line through <code>--ui-stepper-fill</code>, and the
      next step pops when the fill reaches it. Back drains it.
    </p>
    <Stepper ref="stepper" v-model="step" :items="steps" :motion-css="false" class="stepper-demo">
      <template #indicator="{ index, completed }">
        <span class="glyph" :data-done="completed ? '' : undefined">
          <svg
            class="glyph-check"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8.5l3 3 7-7"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="glyph-number">{{ index + 1 }}</span>
        </span>
      </template>
    </Stepper>
    <div class="row">
      <Button variant="outline" :disabled="step === 0" @click="step--">Back</Button>
      <Button :disabled="step === steps.length - 1" @click="step++">Next</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Button, Stepper } from 'vael-ui'
import type { StepperItem } from 'vael-ui'

const steps: StepperItem[] = [
  { label: 'Account' },
  { label: 'Workspace' },
  { label: 'Invite' },
  { label: 'Launch' },
]
const step = shallowRef(1)
const stepper = useTemplateRef('stepper')

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
let run: gsap.core.Timeline | null = null

type Look = { backgroundColor: string; borderColor: string; color: string; check: number }
type Snapshot = { look: Look; scale: number }

function parts() {
  return {
    circles: stepper.value?.circleEls ?? [],
    connectors: stepper.value?.connectorEls ?? [],
  }
}
const layers = (circle: HTMLElement) => ({
  check: circle.querySelector<HTMLElement>('.glyph-check')!,
  number: circle.querySelector<HTMLElement>('.glyph-number')!,
})
function lookOf(circle: HTMLElement): Look {
  const style = getComputedStyle(circle)
  return {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    color: style.color,
    check: Number(getComputedStyle(layers(circle).check).opacity),
  }
}
const sameLook = (a: Look, b: Look) =>
  a.backgroundColor === b.backgroundColor &&
  a.borderColor === b.borderColor &&
  a.color === b.color &&
  a.check === b.check
// How far along the line the fill reaches, in steps. Mid-flight it sits between two indicators.
const fillOf = (connector: HTMLElement) =>
  Number(
    connector.style.getPropertyValue('--ui-stepper-fill') ||
      (connector.dataset.state === 'filled' ? 1 : 0),
  )

function release() {
  const { circles, connectors } = parts()
  for (const connector of connectors) connector.style.removeProperty('--ui-stepper-fill')
  for (const circle of circles) {
    const { check, number } = layers(circle)
    gsap.set(circle, { clearProps: 'transform,backgroundColor,borderColor,color' })
    gsap.set([check, number], { clearProps: 'opacity,filter' })
  }
}

// Runs before the DOM updates, so it reads what's on screen now, even mid-flight.
watch(step, async (to) => {
  const now = parts()
  const from = now.connectors.reduce((sum, connector) => sum + fillOf(connector), 0)
  const before: Snapshot[] = now.circles.map((circle) => ({
    look: lookOf(circle),
    scale: Number(gsap.getProperty(circle, 'scale')),
  }))
  run?.kill()
  await nextTick()
  release()
  if (reduce() || from === to) return
  // A step that becomes reachable swaps its trigger from a div to a button, so its circle is a
  // new element now, so read the exposed parts again.
  const { circles, connectors } = parts()

  const forward = to > from
  const distance = Math.abs(to - from)
  const duration = (forward ? 0.35 : 0.22) * Math.sqrt(distance)
  // From rest the fill eases in and out. Caught mid-flight it's already moving, so it skips the
  // ease-in rather than stalling before it turns around.
  const easeName = Number.isInteger(from) ? 'power2.inOut' : 'power2.out'
  const ease = gsap.parseEase(easeName)
  // When the fill's tip reaches position `at`, found by inverting the ease. Every pop is placed
  // at one of these times on the same timeline as the fill, so it lands exactly as the fill does.
  const timeAt = (at: number) => {
    const target =
      (Math.min(Math.max(at, Math.min(from, to)), Math.max(from, to)) - from) / (to - from)
    let [lo, hi] = [0, 1]
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      if (ease(mid) < target) lo = mid
      else hi = mid
    }
    return hi * duration
  }

  const progress = { at: from }
  const draw = () =>
    connectors.forEach((connector, i) =>
      connector.style.setProperty(
        '--ui-stepper-fill',
        String(Math.min(Math.max(progress.at - i, 0), 1)),
      ),
    )
  const tl = gsap.timeline({
    defaults: { duration: 0.18, ease: 'power2.out' },
    onUpdate: draw,
    onComplete: release,
  })
  run = tl
  tl.to(progress, { at: to, duration, ease: easeName }, 0)

  circles.forEach((circle, index) => {
    const { look, scale } = before[index]!
    const next = lookOf(circle)
    const { check, number } = layers(circle)
    // Hold the old look until the fill gets here.
    gsap.set(circle, {
      scale,
      backgroundColor: look.backgroundColor,
      borderColor: look.borderColor,
      color: look.color,
    })
    gsap.set(check, { opacity: look.check })
    gsap.set(number, { opacity: 1 - look.check })
    if (scale !== 1) tl.to(circle, { scale: 1 }, 0)
    if (sameLook(look, next)) return

    const at = timeAt(index)
    const { backgroundColor, borderColor, color } = next
    tl.to(circle, { backgroundColor, borderColor, color }, at)
    if (look.check !== next.check) {
      const [shown, hidden] = next.check ? [check, number] : [number, check]
      tl.to(hidden, { opacity: 0, filter: 'blur(3px)' }, at)
      tl.fromTo(
        shown,
        { filter: 'blur(3px)' },
        { opacity: 1, filter: 'blur(0px)', immediateRender: false },
        at,
      )
    }
    // Only arrivals pop. Steps the fill leaves behind or drains past change in place.
    if (forward && index > from) {
      tl.to(circle, { scale: 1.15, duration: 0.09 }, at).to(
        circle,
        { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' },
        '>',
      )
    }
  })
  draw()
})

onBeforeUnmount(() => run?.kill())
</script>

<style scoped>
.stepper-demo {
  max-inline-size: 32rem;
  margin-block-end: 1.25rem;
}
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.glyph {
  display: grid;
  place-items: center;
}
.glyph > * {
  grid-area: 1 / 1;
}
.glyph-check,
.glyph[data-done] .glyph-number {
  opacity: 0;
}
.glyph[data-done] .glyph-check {
  opacity: 1;
}
</style>
