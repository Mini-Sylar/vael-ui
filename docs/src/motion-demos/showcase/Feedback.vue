<!-- A Feedback button that grows into a form; sending and the thanks swap in place as the panel resizes. -->
<template>
  <section class="demo">
    <h3>Feedback widget</h3>
    <Popover
      v-model:open="open"
      open-on-trigger-click
      side="top"
      align="start"
      :motion="{ morph: 'trigger', swap: 'sync', spring: { damping: 0.85, response: 0.32 } }"
      :ui="{ panel: 'feedback-panel' }"
    >
      <template #trigger>
        <Button variant="secondary">
          <template #leading><PhPaperPlaneTilt /></template>
          <span v-animate="label" class="label">Feedback</span>
        </Button>
      </template>
      <div :key="state" v-animate="view" class="view">
        <template v-if="state === 'form'">
          <div class="field">
            <!-- The button's label travels to the field's corner, and back as it closes. -->
            <span v-if="!message" v-animate="label" class="label hint" aria-hidden="true"
              >Feedback</span
            >
            <Textarea v-model="message" :rows="3" aria-label="Feedback" />
          </div>
          <div class="actions">
            <Button size="sm" variant="ghost" @click="open = false">Cancel</Button>
            <Button size="sm" :disabled="!message.trim()" @click="send">Send</Button>
          </div>
        </template>
        <p v-else-if="state === 'sending'" class="status"><Loader size="sm" /> Sending…</p>
        <p v-else class="status">
          <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true" class="tick">
            <path v-animate:tick="tick" d="M60 132l44 44 92-92" pathLength="1" />
          </svg>
          Thanks, we read every note.
        </p>
      </div>
    </Popover>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Button, Loader, Popover, Textarea, vAnimate } from 'vael-ui'
import { PhPaperPlaneTilt } from '@phosphor-icons/vue'

const open = shallowRef(false)
const state = shallowRef<'form' | 'sending' | 'sent'>('form')
const message = shallowRef('')
watch(open, (now) => now && ((state.value = 'form'), (message.value = '')))
function send() {
  state.value = 'sending'
  setTimeout(() => {
    state.value = 'sent'
    // A beat to read it, then it gets out of the way.
    setTimeout(() => (open.value = false), 1400)
  }, 900)
}
// One label in two places: the morph carries it between the button and the field.
const label = { layoutId: 'feedback-label' }
const view = {
  initial: { opacity: 0, blur: 2, y: 4 },
  exit: { opacity: 0, blur: 2 },
  duration: 200,
  easing: 'out',
}
const tick = { initial: { strokeDashoffset: 1 }, delay: 0.08, duration: 300, easing: 'out' }
</script>

<style scoped>
.demo {
  display: grid;
  place-items: end center;
  min-block-size: 18rem;
  padding-block-end: 1rem;
}
:global(.feedback-panel) {
  inline-size: 18rem;
}
.view {
  display: grid;
  gap: 0.5rem;
}
.field {
  position: relative;
}
.label {
  display: inline-block;
}
.hint {
  position: absolute;
  /* On the field's first line, where its text starts. */
  inset-block-start: 12px;
  inset-inline-start: 15px;
  z-index: 1;
  font-size: 14px;
  color: var(--ui-text-muted);
  pointer-events: none;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
}
.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}
.tick path {
  fill: none;
  stroke: var(--ui-success);
  stroke-width: 24;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
}
</style>
