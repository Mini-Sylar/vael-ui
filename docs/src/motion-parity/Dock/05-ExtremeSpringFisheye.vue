<template>
  <section class="demo">
    <h3>Extreme: a spring fisheye</h3>
    <p class="note">
      <code>:magnify="false"</code> turns the built-in magnification off, and
      <code>itemEls()</code> returns the item buttons. A <code>useSpringValue</code> per icon for
      its size and one for its shift chase where the pointer puts them, so each icon swells, pushes
      its neighbors aside and overshoots on its own. Picking an app launches it with a double hop:
      <code>states.selected</code> plays it on that <code>item</code>, keyframes placed with
      <code>times</code> and an easing for each rise and fall.
    </p>
    <div class="stage">
      <Dock
        ref="dock"
        aria-label="Applications"
        :items="appItems"
        :magnify="false"
        :motion="hop"
        @select="launched = $event.label"
      />
    </div>
    <p class="demo-status">
      Last launched: <strong>{{ launched ?? 'none yet' }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { Dock, useSpringValue } from 'vael-ui'
import type { DockItemData, DockMotion } from 'vael-ui'
import {
  PhBrowser,
  PhCalendar,
  PhChatCircleDots,
  PhEnvelopeSimple,
  PhGear,
  PhMusicNotes,
  PhNotePencil,
} from '@phosphor-icons/vue'

const appItems: DockItemData[] = [
  { label: 'Finder', value: 'finder', icon: PhBrowser },
  { label: 'Mail', value: 'mail', icon: PhEnvelopeSimple, badge: 3 },
  { label: 'Messages', value: 'messages', icon: PhChatCircleDots },
  { label: 'Notes', value: 'notes', icon: PhNotePencil },
  { label: 'Calendar', value: 'calendar', icon: PhCalendar },
  { label: 'Music', value: 'music', icon: PhMusicNotes },
  { label: 'Settings', value: 'settings', icon: PhGear },
]

const dock = useTemplateRef('dock')
const launched = shallowRef<string | null>(null)
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const PEAK = 1.8
const REACH = 62
// A spring per icon, fitted to the original's measured curve (stiffness 420, damping 28, stepped once
// a frame). A new pointer position only moves the targets, so each icon keeps its speed.
const SPRING = { damping: 0.77, response: 0.27 }
const sizes = appItems.map(() => useSpringValue(1, { ...SPRING, epsilon: 1e-4 }))
const shifts = appItems.map(() => useSpringValue(0, { ...SPRING, epsilon: 0.01 }))
let items: HTMLElement[] = []

// Size and shift ride `transform`, so the launch hop on `translate` isn't scaled with the icon.
watchEffect(() => {
  let grow = 0
  sizes.forEach((size, i) => {
    // Read before the guard, so the effect tracks every spring from the start.
    const scale = size.value.value
    const shift = shifts[i]!.value.value
    const el = items[i]
    if (!el) return
    el.style.transform = `translateX(${shift}px) scale(${scale})`
    grow += (scale - 1) * el.offsetWidth
  })
  // The bar widens with the icons, so the outer ones never hang off its ends.
  dock.value?.el?.style.setProperty('--grow', `${grow}px`)
})

function aim(scales: number[], offsets: number[]) {
  sizes.forEach((spring, i) => spring.set(scales[i]!))
  shifts.forEach((spring, i) => spring.set(offsets[i]!))
}

// Where each icon sits when nothing is magnified, across the dock (positioned, so it's their offsetParent).
const rest = () => items.map((el) => el.offsetLeft + el.offsetWidth / 2)

function onMove(event: PointerEvent) {
  const root = dock.value?.el
  if (!root || reduce() || event.pointerType !== 'mouse') return
  const x = event.clientX - root.getBoundingClientRect().left
  const centers = rest()
  const scales = centers.map((c) => 1 + (PEAK - 1) * Math.exp(-((x - c) ** 2) / (2 * REACH ** 2)))
  // Growing icons push their neighbors out of the way, so the dock widens around the pointer.
  const grown = items.map((el, i) => (scales[i]! - 1) * el.offsetWidth)
  const total = grown.reduce((sum, g) => sum + g, 0)
  // Left to right as they sit: right to left, the first icon is at the far end.
  const order = centers.map((_, i) => i).sort((a, b) => centers[a]! - centers[b]!)
  const offsets: number[] = []
  let before = 0
  for (const i of order) {
    offsets[i] = before + grown[i]! / 2 - total / 2
    before += grown[i]!
  }
  aim(scales, offsets)
}
const onLeave = () =>
  aim(
    items.map(() => 1),
    items.map(() => 0),
  )

// Launching: two hops, the second lower, each a GSAP power2.out rise and bounce.out fall.
const RISE = 'cubic-bezier(0.33, 1, 0.67, 1)'
// GSAP's bounce.out at every 11th of the way: it lands at 4/11, 8/11 and 10/11.
const BOUNCE = 'linear(0, 0.0625, 0.25, 0.5625, 1, 0.8125, 0.75, 0.8125, 1, 0.9375, 1, 1)'
const hop: DockMotion = {
  states: {
    selected: {
      item: {
        y: {
          value: [0, -30, 0, -14, 0],
          times: [0, 240 / 1040, 540 / 1040, 740 / 1040, 1],
          easing: [RISE, BOUNCE, RISE, BOUNCE],
          duration: 1040,
        },
      },
    },
  },
}

onMounted(() => {
  items = dock.value?.itemEls() ?? []
  const root = dock.value?.el
  root?.addEventListener('pointermove', onMove)
  root?.addEventListener('pointerleave', onLeave)
})
onBeforeUnmount(() => {
  const root = dock.value?.el
  root?.removeEventListener('pointermove', onMove)
  root?.removeEventListener('pointerleave', onLeave)
})
</script>

<style scoped>
.stage {
  display: flex;
  justify-content: center;
  padding-block: 2.5rem 0.5rem;
}
/* The springs own each icon's size, so a CSS transition would only smooth it a second time. */
.stage :deep(.ui-dock-item) {
  transition: none;
}
/* The bar is drawn behind the icons, widened by --grow as they swell. */
.stage :deep(.ui-dock) {
  position: relative;
  isolation: isolate;
  background: none;
  border-color: transparent;
  box-shadow: none;
}
.stage :deep(.ui-dock)::before {
  content: '';
  position: absolute;
  inset: -1px calc(var(--grow, 0px) / -2 - 1px);
  z-index: -1;
  border: 1px solid var(--ui-border);
  border-radius: inherit;
  background: var(--ui-surface);
  box-shadow: 0 8px 30px rgb(0 0 0 / 0.15);
}
</style>
