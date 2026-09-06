<template>
  <Teleport :to="teleportTo">
    <Transition name="ui-tour-spotlight" :css="!forceMount">
      <div
        v-if="forceMount || active"
        v-show="active"
        ref="overlay"
        :class="overlayPart.class"
        :style="[{ clipPath, position: contained ? 'absolute' : undefined }, overlayPart.style]"
        aria-hidden="true"
      />
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { UiPartValue } from '../../classes'

export interface TourSpotlightProps {
  targetEl?: HTMLElement | null
  active?: boolean
  /** Space between the target's own box and the cutout edge, in pixels. */
  padding?: number
  /** Cutout corner radius, in pixels. Clamped so it never exceeds half the padded box's own width/height. */
  radius?: number
  /** Snaps the cutout to the target 1:1 instead of gliding to it — for while a scroll driven by the same target change is in flight, so it doesn't lag a beat behind every scroll frame. */
  instant?: boolean
  forceMount?: boolean
  teleportTo?: string | HTMLElement
  /** Scopes the dim/cutout to this element's own box instead of the viewport — clip-path coordinates become relative to it, and the overlay switches from `position: fixed` to `absolute`. Omit for page-level. */
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
-->
<script setup lang="ts">
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
  forceMount: false,
  teleportTo: 'body',
  containerEl: null,
})

const contained = computed(() => props.containerEl !== null)

const overlay = useTemplateRef<HTMLElement>('overlay')
const cx = useClassMerge()
const overlayPart = computed(() => resolveUiPart(cx, props.ui, 'ui-tour-spotlight'))

const clipPath = shallowRef<string | undefined>(undefined)

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
  const rect = props.targetEl!.getBoundingClientRect()
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

// cubic-bezier solver — Newton-Raphson on x(t), then evaluate y(t).
function makeBezierEasing(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x
  const bx = 3 * (p2x - p1x) - cx
  const ax = 1 - cx - bx
  const cy = 3 * p1y
  const by = 3 * (p2y - p1y) - cy
  const ay = 1 - cy - by
  const xAt = (t: number) => ((ax * t + bx) * t + cx) * t
  const dxAt = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const dx = xAt(t) - x
      if (Math.abs(dx) < 1e-4) break
      const d = dxAt(t)
      if (Math.abs(d) < 1e-6) break
      t -= dx / d
    }
    return ((ay * t + by) * t + cy) * t
  }
}
// `--ui-ease-out` — a decisive smooth-out. The cutout is repositioning, not making an
// entrance, so it wants the library's position-change curve rather than the long, settling
// `--ui-ease-drawer` tail, which made the far sweeps in the stress test look like they crawl
// the last stretch after visually already arriving.
const easeGlide = makeBezierEasing(0.23, 1, 0.32, 1)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Travel-aware: a nudge to a neighbouring target resolves quickly; a sweep clear across the
// viewport earns a longer glide — but a far bound is still faster than the old flat 500ms.
// Range/curve follow the transitions-polish doctrine for a position change (~250–400ms).
const GLIDE_MIN_MS = 220
const GLIDE_MAX_MS = 380
function glideDuration(a: Cutout, b: Cutout): number {
  const travel = Math.hypot(b.x + b.w / 2 - (a.x + a.w / 2), b.y + b.h / 2 - (a.y + a.h / 2))
  const t = Math.min(1, travel / (Math.hypot(a.vw, a.vh) || 1))
  return GLIDE_MIN_MS + (GLIDE_MAX_MS - GLIDE_MIN_MS) * Math.sqrt(t)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const tween = (a: Cutout, b: Cutout, t: number): Cutout => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  radius: lerp(a.radius, b.radius, t),
  vw: lerp(a.vw, b.vw, t),
  vh: lerp(a.vh, b.vh, t),
})

// `current` is whatever the overlay is clipped to right now (mid-glide included), so a step
// change that lands while the last one is still gliding retargets from the real position.
let current: Cutout | null = null
let from: Cutout | null = null
let to: Cutout | null = null
let animStart = 0
let animDuration = GLIDE_MAX_MS
let animFrame: number | undefined

function stopAnim() {
  if (animFrame !== undefined) {
    cancelAnimationFrame(animFrame)
    animFrame = undefined
  }
  from = to = null
}

function commit(cutout: Cutout) {
  current = cutout
  clipPath.value = toPath(cutout)
}

function tick(now: number) {
  animFrame = undefined
  if (!from || !to) return
  const p = animDuration > 0 ? Math.min(1, (now - animStart) / animDuration) : 1
  commit(p >= 1 ? to : tween(from, to, easeGlide(p)))
  if (p < 1) animFrame = requestAnimationFrame(tick)
  else from = to = null
}

function update() {
  if (!props.targetEl) return
  const next = measure()
  // First paint, a scroll driven by this same step change (see `instant`), or reduced motion:
  // land on it outright. Otherwise glide from wherever the cutout currently sits.
  if (props.instant || current === null || prefersReducedMotion()) {
    stopAnim()
    commit(next)
    return
  }
  from = current
  to = next
  animStart = performance.now()
  animDuration = glideDuration(current, next)
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
    if (paintedOverlay === overlayEl) {
      stopAutoUpdate = autoUpdate(target, overlayEl, update)
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
      stopAutoUpdate = autoUpdate(target, overlayEl, update)
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
