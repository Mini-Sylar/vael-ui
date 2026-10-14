<template>
  <section class="demo">
    <h3>Extreme: a spring fisheye (GSAP)</h3>
    <p class="note">
      <code>:magnify="false"</code> turns the built-in magnification off, and
      <code>itemEls()</code> hands you the item buttons. Here GSAP's <code>quickTo</code> springs
      each icon's scale from its distance to the pointer, pushes its neighbors aside so the dock
      grows around the cursor, and clicking an app launches it with a double bounce.
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
let items: HTMLElement[] = []
let toScaleX: ((value: number) => void)[] = []
let toScaleY: ((value: number) => void)[] = []
let toShift: ((value: number) => void)[] = []

function setup() {
  items = dock.value?.itemEls() ?? []
  // A soft spring: quick to react, with a little overshoot as it settles.
  const spring = { duration: 0.45, ease: 'elastic.out(1, 0.6)' }
  toScaleX = items.map((el) => gsap.quickTo(el, 'scaleX', spring))
  toScaleY = items.map((el) => gsap.quickTo(el, 'scaleY', spring))
  toShift = items.map((el) =>
    gsap.quickTo(el, 'x', { duration: 0.45, ease: 'elastic.out(1, 0.75)' }),
  )
}

// Where each icon sits when nothing is magnified, across the dock.
function rest(root: HTMLElement) {
  return items.map((el) => el.offsetLeft - root.offsetLeft + el.offsetWidth / 2)
}

function onMove(event: PointerEvent) {
  const root = dock.value?.el
  if (!root || reduce() || event.pointerType !== 'mouse') return
  const pointer = event.clientX - root.getBoundingClientRect().left
  const centers = rest(root)
  const scales = centers.map(
    (c) => 1 + (PEAK - 1) * Math.exp(-((pointer - c) ** 2) / (2 * REACH ** 2)),
  )
  // Growing icons push their neighbors out of the way, so the dock widens around the pointer.
  const grown = items.map((el, i) => (scales[i]! - 1) * el.offsetWidth)
  const total = grown.reduce((sum, g) => sum + g, 0)
  let before = 0
  items.forEach((_, i) => {
    toScaleX[i]!(scales[i]!)
    toScaleY[i]!(scales[i]!)
    toShift[i]!(before + grown[i]! / 2 - total / 2)
    before += grown[i]!
  })
}

function onLeave() {
  items.forEach((_, i) => {
    toScaleX[i]!(1)
    toScaleY[i]!(1)
    toShift[i]!(0)
  })
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
</style>
