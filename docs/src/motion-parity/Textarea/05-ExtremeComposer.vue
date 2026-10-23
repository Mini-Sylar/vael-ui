<template>
  <section class="demo">
    <h3>Extreme: a message composer that grows, counts, and sends</h3>
    <p class="note">
      Everything lives in Textarea's own slots: an avatar in <code>#start</code>, an attach button
      in <code>#bottom-start</code>, and the budget ring with Send in <code>#bottom-end</code>.
      <code>auto-grow</code> keeps the box the size of the message. <code>v-animate</code>'s
      <code>animate</code> eases the ring per keystroke, warming near the limit, and
      <code>states.invalid</code> shakes the box when you go over. The draft is drawn through
      <code>#display</code> under a <code>layoutId</code> the new bubble's text shares, so Send
      carries the text itself out of the box into the thread, while the bubble lands behind it with
      a little give and the ones above slide with <code>layout</code>. Cmd or Ctrl with Enter sends.
    </p>
    <div class="thread">
      <div class="bubbles">
        <div v-for="message in sent" :key="message.id" v-animate="{ layout: true }" class="bubble">
          <span v-animate="landing" class="bubble-fill" aria-hidden="true" />
          <span
            v-animate="{ ...travel, layoutId: `message-${message.id}`, layout: 'position' }"
            class="bubble-text"
          >
            <span v-animate="ink">{{ message.text }}</span>
          </span>
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
        <template #display="{ value, placeholder }">
          <span v-if="value" v-animate="draftLook" class="draft">{{ value }}</span>
          <span v-else class="placeholder">{{ placeholder }}</span>
        </template>
        <template #start>
          <span class="avatar" aria-hidden="true">AM</span>
        </template>
        <template #bottom-start>
          <Button size="sm" variant="ghost">Attach</Button>
        </template>
        <template #bottom-end>
          <svg class="budget" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="12" r="10" class="budget-track" />
            <circle v-animate="{ animate: ringLook }" cx="12" cy="12" r="10" class="budget-fill" />
          </svg>
          <span class="demo-status count">{{ draft.length }}/{{ LIMIT }}</span>
          <Button size="sm" :disabled="!draft.trim() || over" @click="send">Send</Button>
        </template>
      </Textarea>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { Button, Textarea, vAnimate } from 'vael-ui'
import type { TextareaMotion } from 'vael-ui'

const LIMIT = 140
const CIRCUMFERENCE = 2 * Math.PI * 10
const draft = shallowRef('')
const sent = shallowRef<{ id: number; text: string }[]>([])
const composer = useTemplateRef<InstanceType<typeof Textarea>>('composer')
const over = computed(() => draft.value.length > LIMIT)

// The ring eases to each keystroke instead of stepping (300ms, GSAP's power2.out), and its colour
// follows the budget the same way.
const ringEase = { duration: 300, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' }
const ringLook = computed(() => {
  const used = Math.min(1, draft.value.length / LIMIT)
  const stroke =
    used > 0.9 ? 'var(--ui-danger)' : used > 0.7 ? 'var(--ui-warning)' : 'var(--ui-primary)'
  return {
    strokeDashoffset: { value: CIRCUMFERENCE * (1 - used), ...ringEase },
    stroke: { value: stroke, ...ringEase },
  }
})

// Going over the limit gives the box a quick shake.
const shake: TextareaMotion = {
  states: { invalid: { root: { x: [0, -6, 6, -3, 0] } } },
}
// The draft and the bubble's text share a layoutId: Send moves the text from the box to the thread.
let nextId = 0
const pending = shallowRef(nextId)
const draftLook = computed(() => ({ layoutId: `message-${pending.value}` }))
// GSAP's power3.inOut and back.out(1.4), sampled.
const POWER3_IN_OUT =
  'linear(0, 0.0001, 0.0008, 0.004, 0.0128, 0.0313, 0.0648, 0.12, 0.2048, 0.3281, 0.5, 0.672, 0.7952, 0.88, 0.9352, 0.9688, 0.9872, 0.996, 0.9992, 1, 1)'
const BACK_OUT =
  'linear(0, 0.206, 0.384, 0.538, 0.667, 0.775, 0.863, 0.932, 0.986, 1.024, 1.05, 1.065, 1.07, 1.069, 1.061, 1.05, 1.037, 1.023, 1.012, 1.003, 1)'
const travel = { duration: 450, easing: POWER3_IN_OUT }
// The bubble grows in behind the text as it lands; the text turns to the bubble's ink on the way.
const landing = {
  initial: { opacity: 0, scale: 0.92 },
  delay: 0.3,
  duration: 450,
  easing: BACK_OUT,
}
const ink = { initial: { color: 'var(--ui-text)' }, delay: 0.3, duration: 450 }

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    send()
  }
}

function send() {
  const text = draft.value.trim()
  if (!text || over.value) return
  sent.value = [...sent.value, { id: pending.value, text }]
  pending.value = ++nextId
  draft.value = ''
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
  position: relative;
  max-inline-size: 85%;
  padding: 0.5rem 0.75rem;
  color: var(--ui-primary-contrast);
  white-space: pre-wrap;
}
/* The bubble's colour, its own layer so the text can arrive ahead of it. */
.bubble-fill {
  position: absolute;
  inset: 0;
  border-radius: 1rem 1rem 0.25rem 1rem;
  background: var(--ui-primary);
  transform-origin: 100% 100%;
}
/* Above the composer it leaves from, as the original's ghost is. */
.bubble-text {
  position: relative;
  z-index: 1;
  display: block;
}
/* Its line box, not just its glyphs: the text leaves at its own proportions. */
.draft {
  display: inline-block;
}
.placeholder {
  color: var(--ui-text-muted);
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
  stroke-dashoffset: 62.83;
}
</style>
