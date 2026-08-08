<template>
  <Teleport :to="teleportTo">
    <Transition name="ui-tour-spotlight" :css="!forceMount">
      <div
        v-if="forceMount || active"
        v-show="active"
        ref="overlay"
        :class="overlayPart.class"
        :style="[{ clipPath }, instant && { transitionProperty: 'opacity' }, overlayPart.style]"
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
  /** Drops the clip-path transition so the cutout tracks 1:1 instead of chasing — for while a scroll driven by the same target change is in flight, so it doesn't lag a beat behind every scroll frame. */
  instant?: boolean
  forceMount?: boolean
  teleportTo?: string | HTMLElement
  ui?: UiPartValue
}
</script>

<!--
  Cutout via `clip-path: path(evenodd, ...)`, not an SVG mask or the box-shadow spread trick:
  clip-path is compositor-accelerated (unlike box-shadow) and affects hit-testing (unlike mask),
  so the cutout region is natively click-through with no separate click-catcher element. The path
  always emits the same rounded-rect command structure (arcs even at radius 0) so the browser can
  interpolate it smoothly between steps instead of snapping.
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
})

const overlay = useTemplateRef<HTMLElement>('overlay')
const cx = useClassMerge()
const overlayPart = computed(() => resolveUiPart(cx, props.ui, 'ui-tour-spotlight'))

const clipPath = shallowRef<string | undefined>(undefined)

function update() {
  const target = props.targetEl
  if (!target) return
  const rect = target.getBoundingClientRect()
  const pad = props.padding
  const x = rect.left - pad
  const y = rect.top - pad
  const w = rect.width + pad * 2
  const h = rect.height + pad * 2
  const r = Math.max(0, Math.min(props.radius, w / 2, h / 2))
  const vw = window.innerWidth
  const vh = window.innerHeight
  clipPath.value =
    `path(evenodd, "M0,0 H${vw} V${vh} H0 Z ` +
    `M${x + r},${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w},${y + r} ` +
    `V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r},${y + h} ` +
    `H${x + r} A${r} ${r} 0 0 1 ${x},${y + h - r} ` +
    `V${y + r} A${r} ${r} 0 0 1 ${x + r},${y} Z")`
}

let stopAutoUpdate: (() => void) | undefined
watch(
  () => [props.active, props.targetEl, overlay.value] as const,
  ([active, target, overlayEl]) => {
    stopAutoUpdate?.()
    stopAutoUpdate = undefined
    if (!active || !target || !overlayEl) return
    stopAutoUpdate = autoUpdate(target, overlayEl, update)
  },
  { flush: 'post' },
)

onScopeDispose(() => stopAutoUpdate?.())

defineExpose({ el: overlay })
</script>
