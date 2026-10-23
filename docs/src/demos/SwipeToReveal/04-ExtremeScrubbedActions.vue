<template>
  <section class="demo">
    <h3>Extreme: actions that cartwheel in with your finger</h3>
    <p class="note">
      The panel's <code>progress</code> slot prop (0 → 1 as the edge is revealed) is all each button
      needs: it reads its own slice of that range and sets its rotation, scale and slide from it, so
      the buttons cartwheel in <em>with</em> your finger, one after another, and reverse when you
      drag back. On release the library owns the settle, and the buttons follow it.
      <code>:reveal-scale="false"</code> hands the panel over. <code>states.dragging</code> lifts
      the row while it's held.
    </p>
    <ul class="swipe-list">
      <li v-for="row in rows" :key="row.id" class="swipe-row">
        <SwipeToReveal v-model:open="openState[row.id]" :reveal-scale="false" :motion="lift">
          <template #trailing-actions="{ close, progress }">
            <div class="scrub-actions">
              <button
                v-for="(action, index) in actions"
                :key="action.label"
                type="button"
                class="scrub-action"
                :class="`scrub-action--${action.tone}`"
                :style="cartwheel(progress, index)"
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
import { reactive } from 'vue'
import { Avatar, SwipeToReveal } from 'vael-ui'
import type { SwipeToRevealMotion } from 'vael-ui'
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

const lift: SwipeToRevealMotion = {
  states: { dragging: { content: { scale: 0.985 } } },
}

// Each button's slice of the 0 → 1 range: later buttons start later and finish together.
const STAGGER = 0.25
function cartwheel(progress: number, index: number) {
  const start = index * (STAGGER / (actions.length - 1))
  const t = Math.min(1, Math.max(0, (progress - start) / (1 - STAGGER)))
  const eased = 1 - (1 - t) ** 3
  const gone = 1 - eased
  return {
    opacity: t,
    transform: `translateX(${gone * 120}%) rotate(${gone * -35}deg) scale(${0.2 + 0.8 * eased})`,
  }
}
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
