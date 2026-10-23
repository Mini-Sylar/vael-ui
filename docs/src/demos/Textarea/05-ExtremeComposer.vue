<template>
  <section class="demo">
    <h3>Extreme: a message composer that grows, counts, and sends</h3>
    <p class="note">
      Everything lives in Textarea's own slots: an avatar in <code>#start</code>, an attach button
      in <code>#bottom-start</code>, and the budget ring with Send in <code>#bottom-end</code>.
      <code>auto-grow</code> keeps the box the size of the message.
      <code>useSpringValue</code> eases the ring per keystroke, <code>states.invalid</code> shakes
      the box when you go over, and each sent bubble lands through <code>v-animate</code> with a
      little give while the ones above slide up with <code>layout</code>. Cmd or Ctrl with Enter
      sends.
    </p>
    <div class="thread">
      <div class="bubbles">
        <div v-for="message in sent" :key="message.id" v-animate="landing" class="bubble">
          {{ message.text }}
        </div>
      </div>
      <Textarea
        ref="composer"
        v-model="draft"
        auto-grow
        :rows="1"
        :max-rows="6"
        placeholder="Write a message"
        aria-label="Message"
        :invalid="over"
        :motion="shake"
        class="composer"
        @keydown="onKeydown"
      >
        <template #start>
          <span class="avatar" aria-hidden="true">AM</span>
        </template>
        <template #bottom-start>
          <Button size="sm" variant="ghost">Attach</Button>
        </template>
        <template #bottom-end>
          <svg class="budget" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="12" r="10" class="budget-track" />
            <circle
              cx="12"
              cy="12"
              r="10"
              class="budget-fill"
              :data-level="level"
              :style="{ strokeDashoffset: CIRCUMFERENCE * (1 - used) }"
            />
          </svg>
          <span class="demo-status count">{{ draft.length }}/{{ LIMIT }}</span>
          <Button size="sm" :disabled="!draft.trim() || over" @click="send">Send</Button>
        </template>
      </Textarea>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { Button, Textarea, useSpringValue, vAnimate } from 'vael-ui'
import type { TextareaMotion } from 'vael-ui'

const LIMIT = 140
const CIRCUMFERENCE = 2 * Math.PI * 10
const draft = shallowRef('')
const sent = shallowRef<{ id: number; text: string }[]>([])
const composer = useTemplateRef<InstanceType<typeof Textarea>>('composer')
const over = computed(() => draft.value.length > LIMIT)

// The ring follows a spring instead of stepping, and its colour follows the budget (in CSS).
const ring = useSpringValue(0, { damping: 1, response: 0.3 })
watch(draft, (text) => ring.set(Math.min(1, text.length / LIMIT)))
const used = ring.value
const level = computed(() => (used.value > 0.9 ? 'high' : used.value > 0.7 ? 'mid' : 'low'))

// Going over the limit gives the box a quick shake.
const shake: TextareaMotion = {
  states: { invalid: { root: { x: [0, -6, 6, -3, 0] } } },
}
// A sent message rises into place with a little give; the ones above slide up to make room.
const landing = {
  initial: { opacity: 0, y: 16, scale: 0.92 },
  spring: { damping: 0.7, response: 0.4 },
  layout: true,
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    send()
  }
}

function send() {
  const text = draft.value.trim()
  if (!text || over.value) return
  draft.value = ''
  sent.value = [...sent.value, { id: Date.now(), text }]
  composer.value?.textareaEl?.focus()
}
</script>

<style scoped>
.thread {
  display: grid;
  gap: 0.75rem;
  max-inline-size: 28rem;
}
.bubbles {
  display: grid;
  gap: 0.5rem;
  justify-items: end;
}
.bubble {
  max-inline-size: 85%;
  padding: 0.5rem 0.75rem;
  border-radius: 1rem 1rem 0.25rem 1rem;
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  white-space: pre-wrap;
  transform-origin: 100% 100%;
}
.composer {
  inline-size: 100%;
}
.avatar {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 9999px;
  background: var(--ui-muted);
  font-size: 0.6875rem;
  font-weight: 600;
}
.budget {
  display: block;
  transform: rotate(-90deg);
}
.count {
  font-variant-numeric: tabular-nums;
}
.budget-track {
  fill: none;
  stroke: var(--ui-border);
  stroke-width: 2.5;
}
.budget-fill {
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 62.83;
  transition: stroke var(--ui-duration-enter) var(--ui-ease-out);
}
.budget-fill[data-level='mid'] {
  stroke: var(--ui-warning);
}
.budget-fill[data-level='high'] {
  stroke: var(--ui-danger);
}
</style>
