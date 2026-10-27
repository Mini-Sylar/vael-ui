<template>
  <Teleport :to="teleportTo">
    <Transition name="ui-tour-spotlight" :css="!forceMount">
      <div
        v-if="forceMount || active"
        v-show="active"
        ref="overlay"
        :class="overlayPart.class"
        :style="[
          { ...cutoutVars, position: contained ? 'absolute' : undefined },
          overlayPart.style,
        ]"
        aria-hidden="true"
      />
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { UiPartValue } from '../../classes'
import type { MotionTiming } from '../../motion/types'

export interface TourSpotlightProps {
  targetEl?: HTMLElement | null
  active?: boolean
  /** Space between the target's own box and the cutout edge, in pixels. @default 4 */
  padding?: number
  /**
   * Cutout corner radius, in pixels. Clamped so it never exceeds half the padded box's own width/height.
   * @default 8
   */
  radius?: number
  /**
   * Snaps the cutout to the target 1:1 instead of gliding to it — for while a scroll driven by the same target change is in flight, so it doesn't lag a beat behind every scroll frame.
   * @default false
   */
  instant?: boolean
  /** `false` turns the glide off: the cutout jumps to each new target. @default true */
  glide?: boolean
  /** The glide's timing. Unset: its length scales with the distance, on `GLIDE_EASE`. */
  glideTiming?: MotionTiming
  forceMount?: boolean
  teleportTo?: string | HTMLElement
  /**
   * Scopes the dim/cutout to this element's own box instead of the viewport — clip-path coordinates become relative to it, and the overlay switches from `position: fixed` to `absolute`. Omit for page-level.
   * @default null
   */
  containerEl?: HTMLElement | null
  ui?: UiPartValue
}
</script>

<!--
  Cutout via `clip-path: path(evenodd, ...)`, not an SVG mask or the box-shadow spread trick:
  clip-path affects hit-testing (unlike mask), so the cutout region is natively click-through
  with no separate click-catcher element, and it doesn't repaint the whole viewport every frame
  the way an animated box-shadow spread would.

  The step-to-step glide is driven here in JS (rAF), NOT a CSS `transition: clip-path`. A CSS
  transition of `clip-path: path()` on a viewport-filling `position: fixed` layer hits a
  compositor bug in Chromium: for the transition's whole duration the layer rasterises clipped
  to a collapsed top-left rectangle with no visible cutout, then snaps correct when it ends.
  Writing a fresh, static `path()` string each frame sidesteps it — the compositor never sees an
  animating clip-path — and each frame's path is still a complete rounded-rect so there's no
  geometry popping.

  The path goes out as `--ui-tour-cutout`, which the stylesheet reads into `clip-path`. An inline
  `clip-path` from a consumer animating the cutout (glide off) then wins while it's set, and
  removing it shows this cutout again.

  The box goes out too, every frame of the glide: `--ui-tour-cutout-x`, `-y`, `-width`, `-height`
  and `-radius` (px, in the overlay's own coordinates), for a ring of your own that follows it.
-->
<script setup lang="ts">
import { prefersReducedMotion, restingRect } from '../../composables/dom'
import { easingFn, glideOf } from '../../composables/tourGlide'
import './Tour.css'
import { computed, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import { autoUpdate } from '@floating-ui/dom'
import { useClassMerge, resolveUiPart } from '../../classes'

const props = withDefaults(defineProps<TourSpotlightProps>(), {
  targetEl: null,
  active: false,
  padding: 4,
  radius: 8,
  instant: false,
  glide: true,
  glideTiming: undefined,
  forceMount: false,
  teleportTo: 'body',
  containerEl: null,
})

const contained = computed(() => props.containerEl !== null)

const overlay = useTemplateRef<HTMLElement>('overlay')
const cx = useClassMerge()
const overlayPart = computed(() => resolveUiPart(cx, props.ui, 'ui-tour-spotlight'))

// The resting cutout's path and box, as the custom properties the overlay carries.
const cutoutVars = shallowRef<Record<string, string>>({})

/** The cutout's geometry, in the overlay's own coordinate space, before it's serialised to a path. */
interface Cutout {
  x: number
  y: number
  w: number
  h: number
  /** Requested corner radius — clamped against the box's own size only at serialise time. */
  radius: number
  /** Mask extent: viewport, or the container's own box when contained. */
  vw: number
  vh: number
}

function measure(): Cutout {
  // Where it will rest: inside an overlay still springing in, the spotlight goes straight there.
  const rect = restingRect(props.targetEl!)
  const container = props.containerEl
  const containerRect = container?.getBoundingClientRect()
  const originX = containerRect?.left ?? 0
  const originY = containerRect?.top ?? 0
  const pad = props.padding
  return {
    x: rect.left - originX - pad,
    y: rect.top - originY - pad,
    w: rect.width + pad * 2,
    h: rect.height + pad * 2,
    radius: props.radius,
    vw: container ? container.clientWidth : window.innerWidth,
    vh: container ? container.clientHeight : window.innerHeight,
  }
}

function toPath({ x, y, w, h, radius, vw, vh }: Cutout): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  return (
    `path(evenodd, "M0,0 H${vw} V${vh} H0 Z ` +
    `M${x + r},${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w},${y + r} ` +
    `V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r},${y + h} ` +
    `H${x + r} A${r} ${r} 0 0 1 ${x},${y + h - r} ` +
    `V${y + r} A${r} ${r} 0 0 1 ${x + r},${y} Z")`
  )
}

// Travel-aware unless the Tour's motion sets a timing: a nudge to a neighbouring target resolves
// quickly; a sweep clear across the viewport earns a longer glide (tourGlide.ts, shared with the callout).
function glideBetween(a: Cutout, b: Cutout) {
  const travel = Math.hypot(b.x + b.w / 2 - (a.x + a.w / 2), b.y + b.h / 2 - (a.y + a.h / 2))
  return glideOf(overlay.value!, props.glideTiming, travel, Math.hypot(a.vw, a.vh))
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// The corner as drawn: a pill's 999 is half its height, so it eases from there.
const drawnRadius = (c: Cutout) => Math.max(0, Math.min(c.radius, c.w / 2, c.h / 2))
const tween = (a: Cutout, b: Cutout, t: number): Cutout => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  radius: lerp(drawnRadius(a), drawnRadius(b), t),
  vw: lerp(a.vw, b.vw, t),
  vh: lerp(a.vh, b.vh, t),
})

// `current` is whatever the overlay is clipped to right now (mid-glide included), so a step
// change that lands while the last one is still gliding retargets from the real position.
let current: Cutout | null = null
let from: Cutout | null = null
let to: Cutout | null = null
let animStart = 0
let animDuration = 0
let animEase: (p: number) => number = (p) => p
let animFrame: number | undefined

function stopAnim() {
  if (animFrame !== undefined) {
    cancelAnimationFrame(animFrame)
    animFrame = undefined
  }
  from = to = null
}

function varsOf(cutout: Cutout): Record<string, string> {
  const { x, y, w, h, radius } = cutout
  return {
    '--ui-tour-cutout': toPath(cutout),
    '--ui-tour-cutout-x': `${x}px`,
    '--ui-tour-cutout-y': `${y}px`,
    '--ui-tour-cutout-width': `${w}px`,
    '--ui-tour-cutout-height': `${h}px`,
    '--ui-tour-cutout-radius': `${Math.max(0, Math.min(radius, w / 2, h / 2))}px`,
  }
}

// Mid-glide frames go straight to the element; the ref (and so the template) gets the resting value.
function commit(cutout: Cutout, settled = true) {
  current = cutout
  const vars = varsOf(cutout)
  const style = overlay.value?.style
  if (style) for (const name in vars) style.setProperty(name, vars[name]!)
  if (settled) cutoutVars.value = vars
}

function tick(now: number) {
  animFrame = undefined
  if (!from || !to) return
  const p = animDuration > 0 ? Math.min(1, (now - animStart) / animDuration) : 1
  commit(p >= 1 ? to : tween(from, to, animEase(p)), p >= 1)
  if (p < 1) animFrame = requestAnimationFrame(tick)
  else from = to = null
}

// `fresh`: the first measure for this target. Later ones (positioning settling the same step)
// move the destination of a glide on its way and keep its clock.
function update(fresh = true) {
  if (!props.targetEl) return
  const next = measure()
  // Jump on first paint, during this step's scroll, with the glide off or with reduced motion.
  if (props.instant || !props.glide || current === null || prefersReducedMotion()) {
    stopAnim()
    commit(next)
    return
  }
  if (!fresh && to) {
    to = next
    return
  }
  from = current
  to = next
  animStart = performance.now()
  const glide = glideBetween(current, next)
  animDuration = glide.duration
  animEase = easingFn(glide.easing)
  if (animFrame === undefined) animFrame = requestAnimationFrame(tick)
}

let stopAutoUpdate: (() => void) | undefined
let pendingFrame: number | undefined
// Tracks which overlay element already had its real first paint. A fresh v-if mount resets it
// (and the cutout state below) so that first paint lands outright; a step change within the
// same open session keeps it, so `update()` glides from the current cutout instead.
let paintedOverlay: HTMLElement | null = null
watch(
  () => [props.active, props.targetEl, overlay.value, props.containerEl] as const,
  ([active, target, overlayEl]) => {
    stopAutoUpdate?.()
    stopAutoUpdate = undefined
    if (pendingFrame !== undefined) {
      cancelAnimationFrame(pendingFrame)
      pendingFrame = undefined
    }
    if (!active || !target || !overlayEl) {
      // Closed, or torn down: forget where the cutout sat so the next open snaps to its
      // first step rather than gliding in from a stale position.
      stopAnim()
      current = null
      return
    }
    // Each step: its first measure glides, the rest retarget.
    let fresh = true
    const measureStep = () => {
      update(fresh)
      fresh = false
    }
    if (paintedOverlay === overlayEl) {
      stopAutoUpdate = autoUpdate(target, overlayEl, measureStep)
      return
    }
    // First paint of a freshly-inserted overlay: some compositors don't reflect the real cutout
    // on a brand-new position:fixed element until a second paint forces it. Let it paint once
    // (blank), then wire up autoUpdate on the next frame so the real value lands on paint two.
    stopAnim()
    current = null
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = undefined
      paintedOverlay = overlayEl
      stopAutoUpdate = autoUpdate(target, overlayEl, measureStep)
    })
  },
  { flush: 'post' },
)

onScopeDispose(() => {
  stopAutoUpdate?.()
  stopAnim()
  if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame)
})

defineExpose({ el: overlay })
</script>
