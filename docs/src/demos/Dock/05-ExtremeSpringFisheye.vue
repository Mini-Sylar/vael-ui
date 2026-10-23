<template>
  <section class="demo">
    <h3>Extreme: a spring fisheye</h3>
    <p class="note">
      <code>:magnify="false"</code> turns the built-in magnification off, and
      <code>itemEls()</code> hands you the item buttons. Two <code>useSpringValue</code>s, one for
      the pointer and one for how strongly the dock reacts, drive every icon's size and push its
      neighbors aside, so the dock swells and overshoots around the cursor. Clicking an app launches
      it with a double hop, and <code>motion</code> staggers the icons in.
    </p>
    <div class="stage">
      <Dock
        ref="dock"
        aria-label="Applications"
        :items="appItems"
        :magnify="false"
        :motion="intro"
        @select="launch"
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

// The icons rise in one after another when the dock mounts.
const intro: DockMotion = { stagger: 0.04, initial: { item: { opacity: 0, y: 14 } } }

const PEAK = 1.8
const REACH = 62
// A spring follows the pointer and another fades the effect in and out, so a quick sweep overshoots.
const {
  value: pointerX,
  set: setPointer,
  jump: jumpPointer,
} = useSpringValue(0, { damping: 0.55, response: 0.28 })
const { value: strength, set: setStrength } = useSpringValue(0, { damping: 0.7, response: 0.3 })
let items: HTMLElement[] = []

// Where each icon sits when nothing is magnified, across the dock (positioned, so it's their offsetParent).
const rest = () => items.map((el) => el.offsetLeft + el.offsetWidth / 2)

// `scale` and `translate` are separate properties, so the intro and the launch hop keep `transform`.
watchEffect(() => {
  const x = pointerX.value
  const k = Math.max(0, strength.value)
  if (!items.length) return
  const scales = rest().map(
    (c) => 1 + (PEAK - 1) * k * Math.exp(-((x - c) ** 2) / (2 * REACH ** 2)),
  )
  // Growing icons push their neighbors out of the way, so the dock widens around the pointer.
  const grown = items.map((el, i) => (scales[i]! - 1) * el.offsetWidth)
  const total = grown.reduce((sum, g) => sum + g, 0)
  let before = 0
  items.forEach((el, i) => {
    el.style.scale = String(scales[i])
    el.style.translate = `${before + grown[i]! / 2 - total / 2}px 0`
    before += grown[i]!
  })
  // The bar widens with the icons, so the outer ones never hang off its ends.
  dock.value?.el?.style.setProperty('--grow', `${total}px`)
})

function onMove(event: PointerEvent) {
  const root = dock.value?.el
  if (!root || reduce() || event.pointerType !== 'mouse') return
  const x = event.clientX - root.getBoundingClientRect().left
  // Coming in, the icons start at the pointer rather than sweeping over from wherever it left.
  if (strength.value < 0.01) jumpPointer(x)
  setPointer(x)
  setStrength(1)
}
const onLeave = () => setStrength(0)

// Launching: two hops, the second lower, like an app starting up.
function launch(item: DockItemData) {
  launched.value = item.label
  const el = items[appItems.findIndex((app) => app.value === item.value)]
  if (!el || reduce()) return
  const up = 'cubic-bezier(0.23, 1, 0.32, 1)'
  const down = 'cubic-bezier(0.55, 0, 1, 0.45)'
  el.animate(
    [
      { transform: 'translateY(0)', easing: up },
      { transform: 'translateY(-30px)', offset: 0.2, easing: down },
      { transform: 'translateY(0)', offset: 0.45, easing: up },
      { transform: 'translateY(-14px)', offset: 0.62, easing: down },
      { transform: 'translateY(0)' },
    ],
    { duration: 800 },
  )
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
