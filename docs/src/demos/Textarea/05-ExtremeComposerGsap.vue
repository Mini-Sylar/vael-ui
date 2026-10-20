<template>
  <section class="demo">
    <h3>Extreme: a message composer that grows, counts, and sends (GSAP)</h3>
    <p class="note">
      Everything lives in Textarea's own slots: an avatar in <code>#start</code>, an attach button
      in <code>#bottom-start</code>, and the budget ring with Send in <code>#bottom-end</code>.
      <code>auto-grow</code> keeps the box the size of the message. GSAP eases the ring per
      keystroke, warming near the limit, and Send lifts the text out of the box (through the exposed
      <code>textareaEl</code>) into a bubble that lands with a little give. Cmd or Ctrl with Enter
      sends.
    </p>
    <div class="thread">
      <TransitionGroup name="bubble" tag="div" class="bubbles">
        <div v-for="message in sent" :key="message.id" class="bubble">{{ message.text }}</div>
      </TransitionGroup>
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
        <template #start>
          <span class="avatar" aria-hidden="true">AM</span>
        </template>
        <template #bottom-start>
          <Button size="sm" variant="ghost">Attach</Button>
        </template>
        <template #bottom-end>
          <svg class="budget" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="12" r="10" class="budget-track" />
            <circle ref="ring" cx="12" cy="12" r="10" class="budget-fill" />
          </svg>
          <span class="demo-status count">{{ draft.length }}/{{ LIMIT }}</span>
          <Button size="sm" :disabled="!draft.trim() || over" @click="send">Send</Button>
        </template>
      </Textarea>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Button, Textarea } from 'vael-ui'

const LIMIT = 140
const CIRCUMFERENCE = 2 * Math.PI * 10
const draft = shallowRef('')
const sent = shallowRef<{ id: number; text: string }[]>([])
const composer = useTemplateRef<InstanceType<typeof Textarea>>('composer')
const ring = useTemplateRef<SVGCircleElement>('ring')
const over = computed(() => draft.value.length > LIMIT)

// The ring eases to each keystroke instead of stepping, and its colour follows the budget.
watch(draft, (text) => {
  if (!ring.value) return
  const used = Math.min(1, text.length / LIMIT)
  gsap.to(ring.value, {
    strokeDashoffset: CIRCUMFERENCE * (1 - used),
    stroke:
      used > 0.9 ? 'var(--ui-danger)' : used > 0.7 ? 'var(--ui-warning)' : 'var(--ui-primary)',
    duration: 0.3,
    ease: 'power2.out',
  })
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    send()
  }
}

async function send() {
  const text = draft.value.trim()
  const textarea = composer.value?.textareaEl
  if (!text || over.value || !textarea) return
  // A copy of the text lifts out of the box toward where the bubble will land.
  const from = textarea.getBoundingClientRect()
  const ghost = document.createElement('div')
  ghost.className = 'ghost'
  ghost.textContent = text
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    padding: getComputedStyle(textarea).padding,
    font: getComputedStyle(textarea).font,
    pointerEvents: 'none',
    zIndex: '10',
  })
  document.body.append(ghost)
  draft.value = ''
  sent.value = [...sent.value, { id: Date.now(), text }]
  await nextTick()
  const bubble = document.querySelector<HTMLElement>('.bubble:last-child')
  const to = bubble?.getBoundingClientRect() ?? from
  gsap.to(ghost, {
    left: to.left,
    top: to.top,
    width: to.width,
    opacity: 0.2,
    duration: 0.45,
    ease: 'power3.inOut',
    onComplete: () => ghost.remove(),
  })
  if (bubble)
    gsap.from(bubble, {
      scale: 0.92,
      opacity: 0,
      duration: 0.45,
      delay: 0.3,
      ease: 'back.out(1.4)',
    })
  textarea.focus()
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
.bubble-move {
  transition: transform var(--ui-duration-enter) var(--ui-ease-in-out);
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
