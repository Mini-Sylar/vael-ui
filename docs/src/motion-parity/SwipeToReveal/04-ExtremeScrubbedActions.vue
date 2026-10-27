<template>
  <section class="demo">
    <h3>Extreme: actions that cartwheel in with your finger</h3>
    <p class="note">
      Each button's cartwheel is a set of keyframes in <code>v-animate</code>'s
      <code>animate</code>, its own slice of the range marked with <code>times</code>, and
      <code>progress</code> holds them at the panel's <code>progress</code> (0 → 1 as the edge is
      revealed on screen). So the buttons cartwheel in <em>with</em> your finger, one after another,
      and rewind as the row slides back. Once you let go, a <code>spring</code> beside
      <code>progress</code> has them follow it a beat behind, so they lag the row slightly.
      <code>:reveal-scale="false"</code> stops the panel growing in from its edge, so only the
      buttons move.
    </p>
    <ul class="swipe-list">
      <li v-for="row in rows" :key="row.id" class="swipe-row">
        <SwipeToReveal
          :ref="(el) => (swipes[row.id] = el as SwipeInstance | null)"
          v-model:open="openState[row.id]"
          :reveal-scale="false"
        >
          <template #trailing-actions="{ close }">
            <div class="scrub-actions">
              <button
                v-for="(action, index) in actions"
                :key="action.label"
                type="button"
                class="scrub-action"
                :class="`scrub-action--${action.tone}`"
                v-animate="{
                  animate: cartwheel[index],
                  progress: swipes[row.id]?.trailingProgress ?? 0,
                  spring: swipes[row.id]?.isDragging ? undefined : CHASE,
                }"
                @click="close"
              >
                <component :is="action.icon" :size="18" weight="bold" />
                <span>{{ action.label }}</span>
              </button>
            </div>
          </template>

          <div class="swipe-content">
            <Avatar :name="row.from" size="sm" />
            <div class="swipe-body">
              <strong>{{ row.from }}</strong>
              <p class="swipe-preview">{{ row.preview }}</p>
            </div>
          </div>
        </SwipeToReveal>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowReactive } from 'vue'
import { Avatar, SwipeToReveal } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import { PhArchiveBox, PhPushPin, PhTrash } from '@phosphor-icons/vue'

const rows = [
  { id: 'a', from: 'Priya Nair', preview: 'Swipe slowly — the buttons track the gesture.' },
  { id: 'b', from: 'Marcus Lee', preview: 'Let go early and they rewind themselves.' },
]
const actions = [
  { label: 'Archive', tone: 'muted', icon: PhArchiveBox },
  { label: 'Pin', tone: 'accent', icon: PhPushPin },
  { label: 'Delete', tone: 'danger', icon: PhTrash },
] as const

const openState = reactive<Record<string, boolean>>({})

type SwipeInstance = InstanceType<typeof SwipeToReveal>
const swipes = shallowReactive<Record<string, SwipeInstance | null>>({})

// 1:1 while dragging, then a chase fitted to GSAP's 0.2s power3.out retween after you let go.
const CHASE = { damping: 1, response: 0.1 }

// GSAP's timeline, held at that progress: 1 s per button, 0.14 s apart, back.out(2.2).
const STAGGER = 0.14
const TOTAL = 1 + STAGGER * (actions.length - 1)
// back.out(2.2) is a cubic, so this curve is exact.
const BACK_OUT = 'cubic-bezier(0.333, 1.733, 0.667, 1)'
// Each button's slice of the timeline: still before it, eased across it, held after it.
const cartwheel = actions.map((_, index) => {
  const times = [0, (index * STAGGER) / TOTAL, (index * STAGGER + 1) / TOTAL, 1]
  const across = <T>(from: T, to: T) => ({ value: [from, from, to, to], times, easing: BACK_OUT })
  return {
    x: across('120%', '0%'),
    rotate: across(-35, 0),
    scale: across(0.2, 1),
    opacity: across(0, 1),
  }
})
</script>

<style scoped>
.swipe-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-inline-size: 28rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  overflow: hidden;
}
.swipe-row + .swipe-row {
  border-block-start: 1px solid var(--ui-border);
}
.swipe-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--ui-surface);
}
.swipe-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-inline-size: 0;
  flex: 1;
}
.swipe-preview {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scrub-actions {
  display: flex;
  block-size: 100%;
}
.scrub-action {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  inline-size: 5rem;
  border: 0;
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}
.scrub-action--muted {
  background: var(--ui-text-muted);
}
.scrub-action--accent {
  background: var(--ui-info);
}
.scrub-action--danger {
  background: var(--ui-danger);
}
</style>
