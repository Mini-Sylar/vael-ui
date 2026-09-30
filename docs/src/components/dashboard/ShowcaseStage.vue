<template>
  <div
    ref="stage"
    class="showcase-stage"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @pointerdown="onTouch"
  >
    <DashboardHero ref="hero" v-model:variant="variant" />
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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import DashboardHero from './DashboardHero.vue'
import { resetRepo } from './repoData'
import type { DashVariant } from './dashboardNavigate'
import { useLiveCard, useTicker } from '../home/useLiveCard'
import { useAutoplayCursor } from './useAutoplayCursor'
import type { AutoplayStep } from './useAutoplayCursor'

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
  // The dashboard's own menus are teleported out of the stage but still count as inside it.
  focusElsewhere.value =
    !!focused &&
    focused !== document.body &&
    !stage.value?.contains(focused) &&
    !focused.closest('[data-dash-overlay]')
}
const mounted = shallowRef(false)
// Two dashboards share the stage: a code repo and a store. Every visit starts
// on the repo, the one closest to what vael-ui is for (?dashboard=store opens
// the store instead); each autoplay run ends by switching to the other one from
// the sidebar's workspace menu.
const variant = shallowRef<DashVariant>('repo')
const hero = useTemplateRef<{ resetPage: () => void }>('hero')
onMounted(() => {
  if (new URLSearchParams(location.search).get('dashboard') === 'store') variant.value = 'store'
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
// Sidebar nav by position: collapsed, the items are icons with no text to match.
const nav = (index: number) => () =>
  stage.value?.querySelectorAll('#dash-nav .dash-nav-list .ui-menu-list-item')[index]

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

// Back to a known state: palette closed, Overview showing, repo data fresh.
function reset() {
  loop++
  resetRepo()
  hero.value?.resetPage()
  const root = stage.value
  if (!root) return
  root
    .querySelector('.ui-command-palette-input')
    ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  const overview = nav(0)()
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

// The workspace menu is teleported to <body>, outside the stage.
const menuItemByText = (text: string) => () =>
  [...document.querySelectorAll('.ui-menu-panel [role="menuitem"]')].find((el) =>
    el.textContent?.trim().startsWith(text),
  )
const SWITCH_TO = (name: string): AutoplayStep[] => [
  { to: q('#dash-workspace-trigger'), click: true, rest: 600 },
  { to: menuItemByText(name), click: true, rest: 1400 },
]

// Exact text match on a file-tree label; the click bubbles to its row.
const treeLabel = (text: string) => () =>
  [...(stage.value?.querySelectorAll('.files-label') ?? [])].find(
    (el) => el.textContent?.trim() === text,
  )

// The store: search, sort and filter customers, collapse the sidebar.
const STORE_STEPS: AutoplayStep[] = [
  { rest: 700 },
  { to: q('#dash-search-trigger'), click: true, rest: 450 },
  { to: q('.ui-command-palette-input'), type: 'cust', rest: 450 },
  { to: q('.ui-command-palette-item[data-active]'), click: true, rest: 1000 },
  { to: byText('.ui-datatable-sort-button', 'Customer'), click: true, rest: 900 },
  { to: q('input[placeholder^="Filter by segment"]'), click: true, rest: 600 },
  { to: optionByText(() => SEGMENTS[loop % SEGMENTS.length]!), click: true, rest: 1600 },
  { to: q('.dash-collapse-btn'), click: true, rest: 1000 },
  { to: q('.dash-collapse-btn'), click: true, rest: 700 },
  { to: nav(0), click: true, rest: 2200 },
  ...SWITCH_TO('vael-ui / main'),
]

// Overlays that may render outside the stage (a phone's BottomSheet, the
// context menu) are looked up in the whole document.
const anywhere = (selector: string) => () => document.querySelector(selector)

// A pull request is reviewed and merged, the release ships, and a file gets
// opened in the editor.
const REPO_STEPS: AutoplayStep[] = [
  { rest: 700 },
  { to: q('#dash-search-trigger'), click: true, rest: 450 },
  { to: q('.ui-command-palette-input'), type: 'pull', rest: 450 },
  { to: q('.ui-command-palette-item[data-active]'), click: true, rest: 900 },
  { to: q('.prs-list [data-accordion-trigger]'), click: true, rest: 800 },
  { to: q('.prs-review'), click: true, rest: 900 },
  { to: anywhere('.review-panel textarea'), click: true, type: 'Thanks, merging!', rest: 500 },
  { to: anywhere('.review-panel .review-merge'), click: true, rest: 1400 },
  { to: byText('.prs-tabs [role="tab"]', 'Merged'), click: true, rest: 900 },
  { to: nav(0), click: true, rest: 1100 },
  { to: q('.repo-ship .ui-button'), click: true, rest: 800 },
  {
    to: anywhere('.repo-ship-dialog [role="slider"]'),
    keys: ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight'],
    rest: 400,
  },
  { to: anywhere('.repo-ship-dialog [role="switch"]'), click: true, rest: 500 },
  { to: anywhere('.repo-ship-dialog .repo-ship-confirm'), click: true, rest: 1400 },
  { to: q('[data-day="24"]'), click: true, rest: 1300 },
  { to: nav(2), click: true, rest: 700 },
  { to: treeLabel('src'), click: true, rest: 300 },
  { to: treeLabel('components'), click: true, rest: 300 },
  { to: treeLabel('Button'), click: true, rest: 300 },
  { to: treeLabel('Button.vue'), click: true, rest: 1000 },
  { to: treeLabel('Button.css'), contextmenu: true, rest: 700 },
  { to: menuItemByText('Copy path'), click: true, rest: 1000 },
  { to: byText('.ide-doc-bar .ui-select-button-option', 'Blame'), click: true, rest: 1400 },
  { to: nav(0), click: true, rest: 1800 },
  ...SWITCH_TO('Acme store'),
]

const { pressed, visible } = useAutoplayCursor({
  onClick: () => (haloSpin.value += 40),
  stage,
  cursor,
  enabled: () => enabled.value,
  reset,
  get steps() {
    return variant.value === 'repo' ? REPO_STEPS : STORE_STEPS
  },
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

/* Light mode: a soft white glow instead of a dark drop shadow, so the
   dashboard sits in light against the dither rather than in grey haze. */
.showcase-stage > :deep(.dash-shell) {
  box-shadow:
    0 0 0 1px var(--ui-border),
    0 6px 20px rgb(0 0 0 / 0.05),
    0 0 24px 6px var(--ui-surface);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .showcase-stage > :deep(.dash-shell) {
    box-shadow: var(--ui-panel-shadow);
  }
}

:root[data-theme='dark'] .showcase-stage > :deep(.dash-shell) {
  box-shadow: var(--ui-panel-shadow);
}

/* Halo layers sit behind the dashboard, which covers their centers, so only
   light at its edges shows. Each is a large conic gradient turned by its own
   base angle plus --halo-spin; hover swings them to an alternate angle. */
.halo {
  /* Three hues from the theme color: itself, one 70° round the wheel and a
     lighter one 60° the other way, so the light mixes instead of sitting
     in a single flat hue. Info blue stands in until a color is picked. */
  /* Desaturated: the halo frames the dashboard, it shouldn't compete with it. */
  --halo-hue: oklch(from var(--docs-accent, var(--ui-info)) l calc(c * 0.6) h);
  --halo-hue-b: oklch(from var(--halo-hue) l c calc(h + 70));
  --halo-hue-c: oklch(from var(--halo-hue) calc(l + 0.08) c calc(h - 60));
  /* Light mode: the halo is white light, clearing the dither around the
     dashboard. Dark mode brings in the subtle mixed hues. Fades go to a
     clear version of the same color, never to `transparent` (transparent
     black), which some engines blend through grey. */
  --halo-a: white;
  --halo-b: white;
  --halo-c: white;
  --halo-rim: white;
  --halo-clear: rgb(255 255 255 / 0);
  --halo-aurora-opacity: 0.9;
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .halo {
    --halo-a: var(--halo-hue);
    --halo-b: var(--halo-hue-b);
    --halo-c: var(--halo-hue-c);
    --halo-rim: var(--ui-border);
    --halo-clear: rgb(0 0 0 / 0);
    --halo-aurora-opacity: 0.2;
  }
}

:root[data-theme='dark'] .halo {
  --halo-a: var(--halo-hue);
  --halo-b: var(--halo-hue-b);
  --halo-c: var(--halo-hue-c);
  --halo-rim: var(--ui-border);
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
  opacity: var(--halo-aurora-opacity);
}

.halo-aurora::before {
  background: conic-gradient(
    color-mix(in oklch, var(--halo-a) 40%, var(--halo-clear)),
    color-mix(in oklch, var(--halo-b) 30%, var(--halo-clear)) 25%,
    color-mix(in oklch, var(--halo-c) 18%, var(--halo-clear)) 50%,
    color-mix(in oklch, var(--halo-b) 30%, var(--halo-clear)) 75%,
    color-mix(in oklch, var(--halo-a) 40%, var(--halo-clear))
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
    var(--halo-clear),
    color-mix(in oklch, var(--halo-a) 20%, var(--halo-clear)),
    var(--halo-clear) 10%,
    var(--halo-clear) 50%,
    color-mix(in oklch, var(--halo-b) 18%, var(--halo-clear)),
    var(--halo-clear) 60%
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
    var(--halo-clear),
    color-mix(in oklch, var(--halo-c) 16%, var(--halo-clear)),
    var(--halo-clear) 8%,
    var(--halo-clear) 50%,
    color-mix(in oklch, var(--halo-a) 14%, var(--halo-clear)),
    var(--halo-clear) 58%
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
    var(--halo-rim),
    color-mix(in oklch, var(--halo-a) 45%, var(--halo-rim)) 5%,
    var(--halo-rim) 14%,
    var(--halo-rim) 50%,
    color-mix(in oklch, var(--halo-b) 45%, var(--halo-rim)) 60%,
    var(--halo-rim) 64%
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
