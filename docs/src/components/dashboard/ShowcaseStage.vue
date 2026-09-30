<template>
  <div
    ref="stage"
    class="showcase-stage"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @pointerdown="onTouch"
  >
    <DashboardHero />
    <span class="stage-glow" aria-hidden="true" />
    <!-- In <body> so it sits above every layer, including teleported panels. -->
    <Teleport v-if="mounted" to="body">
      <div
        ref="cursor"
        class="auto-cursor"
        :data-visible="visible || undefined"
        :data-pressed="pressed || undefined"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            d="M4.5 3.2 19.3 11c.8.4.7 1.5-.1 1.8l-6 1.9-2.7 5.7c-.4.8-1.5.7-1.8-.1L4 4.3c-.2-.7.4-1.3 1-1.1Z"
            fill="#111"
            stroke="#fff"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import DashboardHero from './DashboardHero.vue'
import { useLiveCard } from '../home/useLiveCard'
import { useAutoplayCursor } from './useAutoplayCursor'

const stage = useTemplateRef<HTMLElement>('stage')
const cursor = useTemplateRef<HTMLElement>('cursor')
const { active } = useLiveCard(stage)

// Autoplay hands over the moment you reach for the dashboard, waits while
// you type anywhere, and never runs while something outside the stage has
// focus (opening the palette would move it).
const userHere = shallowRef(false)
const typingPause = shallowRef(false)
const focusElsewhere = shallowRef(false)
let resumeTimer: ReturnType<typeof setTimeout> | undefined
let typingTimer: ReturnType<typeof setTimeout> | undefined

function onPointerEnter(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  clearTimeout(resumeTimer)
  userHere.value = true
}
function onPointerLeave() {
  clearTimeout(resumeTimer)
  resumeTimer = setTimeout(() => (userHere.value = false), 4000)
}
// Touch has no hover, so a tap is what hands over; it resumes after the same
// idle wait.
function onTouch(event: PointerEvent) {
  if (!event.isTrusted || event.pointerType === 'mouse') return
  userHere.value = true
  onPointerLeave()
}
function onKeydown(event: KeyboardEvent) {
  if (!event.isTrusted) return
  typingPause.value = true
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => (typingPause.value = false), 8000)
}
function onFocusChange() {
  const focused = document.activeElement
  focusElsewhere.value = !!focused && focused !== document.body && !stage.value?.contains(focused)
}
const mounted = shallowRef(false)
onMounted(() => {
  mounted.value = true
  window.addEventListener('keydown', onKeydown, true)
  document.addEventListener('focusin', onFocusChange)
  document.addEventListener('focusout', onFocusChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('focusin', onFocusChange)
  document.removeEventListener('focusout', onFocusChange)
  clearTimeout(resumeTimer)
  clearTimeout(typingTimer)
})

const enabled = computed(
  () => active.value && !userHere.value && !typingPause.value && !focusElsewhere.value,
)

const q = (selector: string) => () => stage.value?.querySelector(selector)
const byText = (selector: string, text: string) => () =>
  [...(stage.value?.querySelectorAll(selector) ?? [])].find((el) =>
    el.textContent?.trim().startsWith(text),
  )

// The Combobox's option list is teleported to <body>, outside the stage.
const optionByText = (text: () => string) => () =>
  [...document.querySelectorAll('[role="option"]')].find((el) => el.textContent?.trim() === text())

// Each loop filters by the next segment, so a repeat viewer sees the table
// change rather than an already-filtered one.
const SEGMENTS = ['Enterprise', 'Growth', 'Starter']
let loop = -1

// Back to a known state: palette closed, sidebar expanded, Overview showing.
function reset() {
  loop++
  const root = stage.value
  if (!root) return
  root
    .querySelector('.ui-command-palette-input')
    ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  const collapse = root.querySelector<HTMLElement>('.dash-collapse-btn')
  if (collapse?.getAttribute('aria-expanded') === 'false') collapse.click()
  const overview = byText('.ui-menu-list-item', 'Overview')()
  if (overview && overview.getAttribute('aria-current') !== 'page')
    (overview as HTMLElement).click()
}

const { pressed, visible } = useAutoplayCursor({
  stage,
  cursor,
  enabled: () => enabled.value,
  reset,
  steps: [
    { rest: 700 },
    { to: q('#dash-search-trigger'), click: true, rest: 450 },
    { to: q('.ui-command-palette-input'), type: 'cust', rest: 450 },
    { to: q('.ui-command-palette-item[data-active]'), click: true, rest: 1000 },
    { to: byText('.ui-datatable-sort-button', 'Customer'), click: true, rest: 900 },
    { to: q('input[placeholder^="Filter by segment"]'), click: true, rest: 600 },
    { to: optionByText(() => SEGMENTS[loop % SEGMENTS.length]!), click: true, rest: 1600 },
    { to: q('.dash-collapse-btn'), click: true, rest: 1000 },
    { to: q('.dash-collapse-btn'), click: true, rest: 700 },
    { to: byText('.ui-menu-list-item', 'Overview'), click: true, rest: 2600 },
  ],
})
</script>

<style scoped>
.showcase-stage {
  position: relative;
  block-size: 100%;
}

.showcase-stage > :first-child {
  block-size: 100%;
}

/* A slow light travelling around the dashboard's edge, in the theme color. */
@property --glow-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

.stage-glow {
  position: absolute;
  inset: -1px;
  z-index: 1;
  padding: 1px;
  border-radius: calc(var(--ui-radius-surface) + 1px);
  background: conic-gradient(
    from var(--glow-angle),
    transparent 0 62%,
    color-mix(in oklch, var(--docs-accent, var(--ui-text)) 70%, transparent) 80%,
    transparent 94%
  );
  /* Only the 1px ring shows: the content box is masked out. */
  mask:
    linear-gradient(#000 0 0) content-box exclude,
    linear-gradient(#000 0 0);
  opacity: 0.55;
  pointer-events: none;
  animation: glow-orbit 9s linear infinite;
}

@keyframes glow-orbit {
  to {
    --glow-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage-glow {
    animation: none;
  }
}

.auto-cursor {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 2147483647;
  pointer-events: none;
  opacity: 0;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.25));
  transition: opacity 300ms var(--ui-ease-out);
  will-change: transform;
}

.auto-cursor[data-visible] {
  opacity: 1;
}

.auto-cursor svg {
  display: block;
  transform-origin: 4px 3px;
  transition: scale 110ms var(--ui-ease-out);
}

.auto-cursor[data-pressed] svg {
  scale: 0.9;
}
</style>
