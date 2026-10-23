<template>
  <section class="demo">
    <h3>Extreme: a spring fisheye (GSAP)</h3>
    <p class="note">
      <code>:magnify="false"</code> turns the built-in magnification off, and
      <code>itemEls()</code> hands you the item buttons. Here a spring per icon, stepped on GSAP's
      ticker, sizes each one by its distance to the pointer and pushes its neighbors aside, so the
      dock grows around the cursor. Clicking an app launches it with a double bounce.
    </p>
    <div class="stage">
      <Dock
        ref="dock"
        aria-label="Applications"
        :items="appItems"
        :magnify="false"
        @select="launch"
      />
    </div>
    <p class="demo-status">
      Last launched: <strong>{{ launched ?? 'none yet' }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { gsap } from 'gsap'
import { Dock } from 'vael-ui'
import type { DockItemData } from 'vael-ui'
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
// A spring per icon, stepped on GSAP's ticker. A new pointer position only moves its target, so the
// icon keeps its speed: restarting an elastic tween on every pointer event made it judder.
const STIFFNESS = 420
const DAMPING = 28
interface Spring {
  scale: number
  x: number
  vScale: number
  vX: number
  toScale: number
  toX: number
}
let items: HTMLElement[] = []
let springs: Spring[] = []
let ticking = false

function setup() {
  items = dock.value?.itemEls() ?? []
  springs = items.map(() => ({ scale: 1, x: 0, vScale: 0, vX: 0, toScale: 1, toX: 0 }))
}

function step(_time: number, deltaMs: number) {
  const dt = Math.min(deltaMs, 32) / 1000
  let moving = false
  let grow = 0
  springs.forEach((s, i) => {
    s.vScale += (STIFFNESS * (s.toScale - s.scale) - DAMPING * s.vScale) * dt
    s.scale += s.vScale * dt
    s.vX += (STIFFNESS * (s.toX - s.x) - DAMPING * s.vX) * dt
    s.x += s.vX * dt
    if (Math.abs(s.toScale - s.scale) + Math.abs(s.toX - s.x) / 100 > 1e-4) moving = true
    else Object.assign(s, { scale: s.toScale, x: s.toX, vScale: 0, vX: 0 })
    gsap.set(items[i]!, { scale: s.scale, x: s.x })
    grow += (s.scale - 1) * items[i]!.offsetWidth
  })
  // The bar widens with the icons, so the outer ones never hang off its ends.
  dock.value?.el?.style.setProperty('--grow', `${grow}px`)
  if (!moving) {
    gsap.ticker.remove(step)
    ticking = false
  }
}
function aim(scales: number[], shifts: number[]) {
  springs.forEach((s, i) => Object.assign(s, { toScale: scales[i], toX: shifts[i] }))
  if (!ticking) gsap.ticker.add(step)
  ticking = true
}

// Where each icon sits when nothing is magnified, across the dock (positioned, so it's their offsetParent).
function rest() {
  return items.map((el) => el.offsetLeft + el.offsetWidth / 2)
}

function onMove(event: PointerEvent) {
  const root = dock.value?.el
  if (!root || reduce() || event.pointerType !== 'mouse') return
  const pointer = event.clientX - root.getBoundingClientRect().left
  const centers = rest()
  const scales = centers.map(
    (c) => 1 + (PEAK - 1) * Math.exp(-((pointer - c) ** 2) / (2 * REACH ** 2)),
  )
  // Growing icons push their neighbors out of the way, so the dock widens around the pointer.
  const grown = items.map((el, i) => (scales[i]! - 1) * el.offsetWidth)
  const total = grown.reduce((sum, g) => sum + g, 0)
  // Left to right as they sit: right to left, the first icon is at the far end.
  const order = centers.map((_, i) => i).sort((a, b) => centers[a]! - centers[b]!)
  const shifts: number[] = []
  let before = 0
  for (const i of order) {
    shifts[i] = before + grown[i]! / 2 - total / 2
    before += grown[i]!
  }
  aim(scales, shifts)
}

function onLeave() {
  aim(
    items.map(() => 1),
    items.map(() => 0),
  )
}

// Launching: two hops, the second lower, like an app starting up.
function launch(item: DockItemData) {
  launched.value = item.label
  const el = items[appItems.findIndex((app) => app.value === item.value)]
  if (!el || reduce()) return
  gsap
    .timeline({ defaults: { overwrite: 'auto' } })
    .to(el, { y: -30, duration: 0.24, ease: 'power2.out' })
    .to(el, { y: 0, duration: 0.3, ease: 'bounce.out' })
    .to(el, { y: -14, duration: 0.2, ease: 'power2.out' })
    .to(el, { y: 0, duration: 0.3, ease: 'bounce.out' })
}

onMounted(() => {
  setup()
  const root = dock.value?.el
  root?.addEventListener('pointermove', onMove)
  root?.addEventListener('pointerleave', onLeave)
})
onBeforeUnmount(() => {
  const root = dock.value?.el
  root?.removeEventListener('pointermove', onMove)
  root?.removeEventListener('pointerleave', onLeave)
  gsap.ticker.remove(step)
  gsap.killTweensOf(items)
})
</script>

<style scoped>
.stage {
  display: flex;
  justify-content: center;
  padding-block: 2.5rem 0.5rem;
}
/* GSAP owns each icon's transform here, so the CSS transition would only smooth it a second time. */
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
