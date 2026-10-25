<template>
  <section class="demo">
    <h3>Extreme: a message composer that grows, counts, and sends</h3>
    <p class="note">
      Everything lives in Textarea's own slots: an avatar in <code>#start</code>, an attach button
      in <code>#bottom-start</code>, and the budget ring with Send in <code>#bottom-end</code>.
      <code>auto-grow</code> keeps the box the size of the message. <code>v-animate</code>'s
      <code>animate</code> eases the ring per keystroke, warming near the limit. The draft is drawn
      through <code>#display</code> under a <code>layoutId</code> the new bubble's text shares, so
      Send moves the text itself out of the box into the thread, while the bubble settles behind it
      with a little give. Cmd or Ctrl with Enter sends.
    </p>
    <div class="thread">
      <div class="bubbles">
        <div v-for="(text, i) in sent" :key="i" v-animate="bubble" class="bubble">
          <span v-animate="landing" class="bubble-fill" aria-hidden="true" />
          <span
            v-animate="{
              layoutId: `message-${i}`,
              layout: 'position',
              duration: 450,
              easing: 'in-out',
            }"
            class="bubble-text"
            >{{ text }}</span
          >
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
        class="composer"
        @keydown="onKeydown"
      >
        <template #display="{ value, placeholder }">
          <span v-if="value" v-animate="{ layoutId: `message-${sent.length}` }" class="draft">{{
            value
          }}</span>
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
            <circle v-animate="ring" cx="12" cy="12" r="10" class="budget-fill" />
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

const LIMIT = 140
const CIRCUMFERENCE = 2 * Math.PI * 10
const draft = shallowRef('')
const sent = shallowRef<string[]>([])
const composer = useTemplateRef<InstanceType<typeof Textarea>>('composer')
const over = computed(() => draft.value.length > LIMIT)

// The ring eases to each keystroke (GSAP's power2.out), its colour warming near the limit.
const ring = computed(() => {
  const used = Math.min(1, draft.value.length / LIMIT)
  return {
    animate: {
      strokeDashoffset: CIRCUMFERENCE * (1 - used),
      stroke:
        used > 0.9 ? 'var(--ui-danger)' : used > 0.7 ? 'var(--ui-warning)' : 'var(--ui-primary)',
    },
    duration: 300,
    easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  }
})
// Slides if the thread moves; its text turns from the composer's ink to its own as it lands.
const bubble = {
  layout: true,
  initial: { color: { value: 'var(--ui-text)', delay: 0.3, duration: 450 } },
}
// The fill grows in behind the arriving text, with GSAP's back.out(1.4) give.
const landing = {
  initial: { opacity: 0, scale: 0.92 },
  delay: 0.3,
  spring: { damping: 0.64, response: 0.36 },
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
  sent.value = [...sent.value, text]
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
