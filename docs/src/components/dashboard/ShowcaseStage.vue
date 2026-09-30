<template>
  <div
    ref="stage"
    class="showcase-stage"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @pointerdown="onTouch"
  >
    <DashboardHero />
    <!-- The halo: light at the dashboard's edges that turns when you hover
         and nudges round with each autoplay click. -->
    <div class="halo" aria-hidden="true" :style="{ '--halo-spin': `${haloSpin}deg` }">
      <span class="halo-layer halo-aurora" />
      <span class="halo-layer halo-outer" />
      <span class="halo-layer halo-inner" />
      <span class="halo-layer halo-border" />
    </div>
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
import { useLiveCard, useTicker } from '../home/useLiveCard'
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

// The halo swings round on its own every few seconds while the dashboard is
// on screen and not hovered, and each scripted click nudges it further.
const haloSpin = shallowRef(0)
useTicker(
  () => active.value && !userHere.value,
  6500,
  () => (haloSpin.value += 120),
)

const { pressed, visible } = useAutoplayCursor({
  onClick: () => (haloSpin.value += 40),
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
  isolation: isolate;
  block-size: 100%;
}

.showcase-stage > :first-child {
  block-size: 100%;
}

/* Halo layers sit behind the dashboard, which covers their centers, so only
   light at its edges shows. Each is a large conic gradient turned by its own
   base angle plus --halo-spin; hover swings them to an alternate angle. */
.halo {
  /* Three hues from the theme color: itself, one 70° round the wheel and a
     lighter one 60° the other way, so the light mixes instead of sitting
     in a single flat hue. Info blue stands in until a color is picked. */
  --halo-a: var(--docs-accent, var(--ui-info));
  --halo-b: oklch(from var(--halo-a) l c calc(h + 70));
  --halo-c: oklch(from var(--halo-a) calc(l + 0.08) c calc(h - 60));
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.halo-layer {
  position: absolute;
  overflow: hidden;
  border-radius: calc(var(--ui-radius-surface) + 2px);
}

.halo-layer::before {
  content: '';
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 1600px;
  block-size: 1600px;
  transform: translate(-50%, -50%) rotate(calc(var(--turn) + var(--halo-spin, 0deg)));
  transition: transform 2.5s var(--ui-ease-out);
}

.showcase-stage:hover .halo-layer::before {
  transform: translate(-50%, -50%) rotate(calc(var(--turn-hover) + var(--halo-spin, 0deg)));
}

.halo-aurora {
  --turn: 60deg;
  --turn-hover: -120deg;
  inset: -1.5rem;
  border-radius: 2rem;
  filter: blur(30px);
  opacity: 0.45;
}

.halo-aurora::before {
  background: conic-gradient(
    color-mix(in oklch, var(--halo-a) 40%, transparent),
    color-mix(in oklch, var(--halo-b) 30%, transparent) 25%,
    color-mix(in oklch, var(--halo-c) 18%, transparent) 50%,
    color-mix(in oklch, var(--halo-b) 30%, transparent) 75%,
    color-mix(in oklch, var(--halo-a) 40%, transparent)
  );
}

.halo-outer {
  --turn: 82deg;
  --turn-hover: -98deg;
  inset: -6px;
  filter: blur(3px);
}

.halo-outer::before {
  background: conic-gradient(
    transparent,
    color-mix(in oklch, var(--halo-a) 40%, transparent),
    transparent 10%,
    transparent 50%,
    color-mix(in oklch, var(--halo-b) 36%, transparent),
    transparent 60%
  );
}

.halo-inner {
  --turn: 83deg;
  --turn-hover: -97deg;
  inset: -3px;
  filter: blur(2px);
}

.halo-inner::before {
  background: conic-gradient(
    transparent,
    color-mix(in oklch, var(--halo-c) 34%, transparent),
    transparent 8%,
    transparent 50%,
    color-mix(in oklch, var(--halo-a) 30%, transparent),
    transparent 58%
  );
}

.halo-border {
  --turn: 70deg;
  --turn-hover: -110deg;
  inset: -1px;
  border-radius: calc(var(--ui-radius-surface) + 1px);
  filter: blur(0.5px);
}

.halo-border::before {
  background: conic-gradient(
    var(--ui-border),
    var(--halo-a) 5%,
    var(--ui-border) 14%,
    var(--ui-border) 50%,
    var(--halo-b) 60%,
    var(--ui-border) 64%
  );
}

@media (prefers-reduced-motion: reduce) {
  .halo-layer::before {
    transition: none;
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
