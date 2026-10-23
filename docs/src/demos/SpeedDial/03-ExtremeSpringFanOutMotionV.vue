<template>
  <section class="demo">
    <h3>Extreme: actions spring out of the trigger (motion-v)</h3>
    <p class="note">
      <code>enter</code> and <code>leave</code> hooks in <code>motion</code> animate the actions
      with motion-v's <code>animate()</code>. They spring out of the trigger one after another and
      return in reverse order. The exposed <code>iconEl</code> turns on the same spring.
    </p>
    <div class="speed-dial-stage">
      <SpeedDial
        ref="dial"
        v-model:open="open"
        aria-label="Quick actions"
        direction="quarter-circle"
        :items="items"
        :motion="actions"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { animate } from 'motion-v'
import type { ValueAnimationTransition } from 'motion-v'
import { SpeedDial } from 'vael-ui'
import type { SpeedDialItem, SpeedDialMotion } from 'vael-ui'
import { PhChatCircleDots, PhFilePlus, PhImage, PhLink } from '@phosphor-icons/vue'

const items: SpeedDialItem[] = [
  { label: 'New document', value: 'doc', icon: PhFilePlus },
  { label: 'Upload image', value: 'image', icon: PhImage },
  { label: 'Copy link', value: 'link', icon: PhLink },
  { label: 'Start chat', value: 'chat', icon: PhChatCircleDots },
]

const dial = useTemplateRef('dial')
const open = shallowRef(false)
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// p runs 0 (tucked into the trigger) to 1 (at rest). Keyed by label, because reopening mid-close
// gives Vue a fresh element for the same action, and it has to pick up the old one's progress.
interface Flight {
  p: number
  dx: number
  dy: number
  stop: () => void
}
const flights = new Map<string, Flight>()

const center = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

// The action sits where SpeedDial's CSS `translate` puts it on the arc. `transform` applies on top
// of that, so the offset back to the trigger goes there and the arc position stays untouched.
function paint(el: HTMLElement, { p, dx, dy }: Flight) {
  const k = 1 - p
  el.style.transform = `translate(${dx * k}px, ${dy * k}px) scale(${0.6 + 0.4 * p})`
  el.style.opacity = String(Math.min(1, Math.max(0, p)))
}

function release(el: HTMLElement) {
  el.style.removeProperty('transform')
  el.style.removeProperty('opacity')
}

function fly(
  node: HTMLElement,
  to: 0 | 1,
  options: (index: number, count: number, p: number) => ValueAnimationTransition<number>,
) {
  const label = node.getAttribute('aria-label') ?? ''
  const prev = flights.get(label)
  prev?.stop()
  flights.delete(label)
  const root = dial.value?.el
  if (!root) return

  // Measure the rest spot without any of our offset applied.
  release(node)
  const from = center(root)
  const rest = center(node)
  const flight: Flight = {
    p: prev?.p ?? 1 - to,
    dx: from.x - rest.x,
    dy: from.y - rest.y,
    stop: () => {},
  }
  paint(node, flight)

  const index = Number(node.style.getPropertyValue('--ui-speed-dial-action-index')) || 0
  const controls = animate(flight.p, to, {
    ...options(index, items.length, flight.p),
    onUpdate: (p: number) => {
      flight.p = p
      paint(node, flight)
    },
    onComplete: () => {
      flights.delete(label)
      release(node)
    },
  })
  flight.stop = () => controls.stop()
  flights.set(label, flight)
  // Returned, so the SpeedDial waits for it.
  return controls
}

const SPRING_OUT = { type: 'spring', visualDuration: 0.13, bounce: 0.2 } as const
const TWEEN_IN = { duration: 0.13, ease: 'easeOut' } as const

// SpeedDial's CSS sets the 45deg angle on the state flip; an inline rotate springs over to it
// and is removed once settled.
let turn = 0
let stopTurn = () => {}
watch(open, (isOpen) => {
  stopTurn()
  const icon = dial.value?.iconEl
  const to = isOpen ? 1 : 0
  if (!icon || reduce()) {
    turn = to
    icon?.style.removeProperty('transform')
    return
  }
  icon.style.transform = `rotate(${45 * turn}deg)`
  const controls = animate(turn, to, {
    ...(isOpen ? SPRING_OUT : TWEEN_IN),
    onUpdate: (t: number) => {
      turn = t
      icon.style.transform = `rotate(${45 * t}deg)`
    },
    onComplete: () => icon.style.removeProperty('transform'),
  })
  stopTurn = () => controls.stop()
})
onBeforeUnmount(() => stopTurn())

const actions: SpeedDialMotion = {
  // An action caught halfway out waits less for its turn, so a reopen never stalls mid-air.
  enter: ({ action }) =>
    fly(action, 1, (index, _count, p) => ({ ...SPRING_OUT, delay: index * 0.04 * (1 - p) })),
  // Last out goes back first. A plain tween, because a spring's settling tail would keep the
  // actions in the DOM well after they look gone.
  leave: ({ action }) =>
    fly(action, 0, (index, count) => ({ ...TWEEN_IN, delay: (count - 1 - index) * 0.01 })),
}
</script>

<style scoped>
.speed-dial-stage {
  display: flex;
  justify-content: center;
  padding: 8rem 1rem 1.5rem 8rem;
}
</style>
