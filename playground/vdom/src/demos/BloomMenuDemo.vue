<template>
  <section class="demo">
    <h2>Bloom menu</h2>
    <p class="note">
      Built on <code>&lt;Popover&gt;</code> and <code>&lt;Button&gt;</code> only. The trigger stays
      mounted the whole time; the force-mounted panel overlaps it exactly (a negative
      <code>sideOffset</code> of the trigger's own height puts the panel's top edge on the
      trigger's), and the exposed <code>panelEl</code> is clipped per-frame from the measured
      trigger rect to the full panel — the pill morphs into the menu, folder-open style. The
      positioner's <code>data-state="closing"</code> attribute hides the content in pure CSS the
      instant a close starts, and <code>isClosing</code>/<code>cancelClose</code> reverse an exit
      mid-flight. The surface has no CSS border: a border paints on the unclipped box, so a
      clip-path morph slices it off around the rounded corners and leaves stray fragments mid-morph
      — the hairline is a <code>drop-shadow</code>, which traces the clipped silhouette instead.
    </p>
    <div class="bloom-stage">
      <div ref="anchorRef" class="bloom-anchor">
        <Button ref="triggerRef" aria-haspopup="dialog" :aria-expanded="open" @click="toggle">
          <template #leading>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
              <path
                d="M8 2v12M2 8h12"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
              />
            </svg>
          </template>
          Create
        </Button>

        <Popover
          v-if="teleportTarget"
          ref="popoverRef"
          v-model:open="open"
          force-mount
          role="dialog"
          aria-label="Create"
          :trigger-el="triggerRef"
          :before-close="beforeClose"
          :teleport-to="teleportTarget"
          :scroll-fade="false"
          side="bottom"
          align="center"
          :side-offset="overlapOffset"
          class="bloom-panel"
          @click="onPanelClick"
        >
          <div v-if="open" class="bloom-content">
            <div class="bloom-header">
              <span>Create</span>
              <Button size="sm" icon variant="ghost" aria-label="Close" @click.stop="close">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </Button>
            </div>
            <div class="bloom-grid">
              <Button
                v-for="(item, i) in items"
                :key="item.label"
                variant="ghost"
                class="bloom-item"
                :style="{ '--bloom-delay': `${itemDelay(i)}ms` }"
                @click.stop="close()"
              >
                <svg viewBox="0 0 16 16" width="18" height="18" fill="none" aria-hidden="true">
                  <path
                    :d="item.d"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>{{ item.label }}</span>
              </Button>
            </div>
          </div>
        </Popover>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { animate } from 'motion-v'
import { Button, Popover } from 'vael-ui'

interface SpringConfig {
  type: 'spring'
  visualDuration: number
  bounce: number
}
// Bouncy "folder-open" overshoot for opening; closing is near critically
// damped — a spring's finished promise resolves at physical rest, well past
// where it looks done, so bounce directly delays real dismissal.
const MORPH_SPRING_OPEN: SpringConfig = { type: 'spring', visualDuration: 0.42, bounce: 0.45 }
const MORPH_SPRING_CLOSE: SpringConfig = { type: 'spring', visualDuration: 0.22, bounce: 0.05 }
const PANEL_RADIUS = 16

const items = [
  { label: 'Doc', d: 'M4 2h6l2 2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z M9 2v3h3' },
  { label: 'Board', d: 'M2 3h12v10H2z M6 3v10 M10 3v10' },
  { label: 'Table', d: 'M2 3h12v10H2z M2 8h12 M7 3v10' },
  { label: 'Folder', d: 'M2 4h4l1.5 2H14v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z' },
  {
    label: 'Reminder',
    d: 'M4 12.5h8 M5 12.5V7a3 3 0 0 1 6 0v5.5 M6.75 13.75a1.25 1.25 0 0 0 2.5 0',
  },
  {
    label: 'Link',
    d: 'M6.5 9.5l3-3 M4.8 8 3.5 9.3a2.1 2.1 0 0 0 3 3L7.8 11 M11.2 8l1.3-1.3a2.1 2.1 0 0 0-3-3L8.2 5',
  },
]

// Radial stagger: delay grows with distance from the 3x2 grid's center, on
// top of the content layer's own 100ms fade-in delay, so the corners land
// together and the open reads center-out.
function itemDelay(i: number): number {
  const col = i % 3
  const row = Math.floor(i / 3)
  const distance = Math.hypot(col - 1, row - 0.5)
  return 100 + Math.round(distance * 60)
}

const anchorRef = useTemplateRef('anchorRef')
const triggerRef = useTemplateRef('triggerRef')
const popoverRef = useTemplateRef('popoverRef')

const open = shallowRef(false)
const overlapOffset = shallowRef(0)

const teleportTarget = shallowRef<HTMLElement | null>(null)
let teleportTargetEl: HTMLElement | null = null

onMounted(() => {
  teleportTargetEl = document.createElement('div')
  anchorRef.value?.appendChild(teleportTargetEl)
  teleportTarget.value = teleportTargetEl
  // Panel top edge lands on the trigger's top edge: bottom placement puts the
  // panel at trigger-bottom + offset, so backing up by the trigger's height
  // makes the pill sit inside the panel's top area — the morph's start rect.
  const trigger = triggerRef.value?.el
  if (trigger) overlapOffset.value = -trigger.offsetHeight
})

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

let progress = 0
let geo: { from: Rect; fromRadius: number; panel: { w: number; h: number } } | null = null

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Rects measured after floating-ui has placed the panel — the morph starts
// from wherever the trigger really is in panel coordinates, flips included.
function measure() {
  const triggerEl = triggerRef.value?.el
  const panelEl = popoverRef.value?.panelEl
  if (!triggerEl || !panelEl) return
  const t = triggerEl.getBoundingClientRect()
  const p = panelEl.getBoundingClientRect()
  geo = {
    from: { x: t.left - p.left, y: t.top - p.top, w: t.width, h: t.height },
    // The trigger's real rendered radius, not an assumed pill — starting the
    // morph from anything else pops the corners on the first frame.
    fromRadius: Number.parseFloat(getComputedStyle(triggerEl).borderTopLeftRadius) || 0,
    panel: { w: p.width, h: p.height },
  }
}

function render() {
  const panelEl = popoverRef.value?.panelEl
  if (!panelEl || !geo) return
  const { from, fromRadius, panel } = geo
  // The clip clamps at full-open: past 1 the rect would leave the box and its
  // rounded corners stop rendering (square-corner flash). Spring overshoot
  // shows as a whole-panel scale bulge instead, corners intact.
  const t = Math.min(Math.max(progress, 0), 1)
  const over = Math.max(progress - 1, 0)
  const x = lerp(from.x, 0, t)
  const y = lerp(from.y, 0, t)
  const w = lerp(from.w, panel.w, t)
  const h = lerp(from.h, panel.h, t)
  const r = lerp(fromRadius, PANEL_RADIUS, t)
  panelEl.style.clipPath = `inset(${y}px ${panel.w - (x + w)}px ${panel.h - (y + h)}px ${x}px round ${r}px)`
  panelEl.style.transform = over > 0 ? `scale(${1 + over})` : ''
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let springControls: ReturnType<typeof animate> | undefined

// onSettle only fires if this spring is still the active one — a stopped,
// superseded spring must never call a stale done() after a reversal.
function springTo(target: number, spring: SpringConfig, onSettle?: () => void) {
  springControls?.stop()
  const controls = animate(progress, target, {
    ...spring,
    onUpdate: (v: number) => {
      progress = v
      render()
    },
  })
  springControls = controls
  if (onSettle) {
    controls.finished.then(() => {
      if (springControls === controls) onSettle()
    })
  }
}

const nextFrame = () => new Promise(requestAnimationFrame)

async function openMenu() {
  open.value = true
  await nextTick()
  // The positioner stays visibility:hidden until floating-ui's first
  // computePosition resolves — that flip is the "panel has landed" signal.
  const positioner = popoverRef.value?.positionerEl
  for (let i = 0; i < 10 && positioner && positioner.style.visibility === 'hidden'; i++) {
    await nextFrame()
  }
  measure()
  if (reducedMotion()) {
    progress = 1
    render()
    return
  }
  render()
  springTo(1, MORPH_SPRING_OPEN)
}

function toggle() {
  const popover = popoverRef.value
  if (popover?.isClosing) {
    popover.cancelClose()
    springTo(1, MORPH_SPRING_OPEN)
    return
  }
  if (open.value) popover?.close()
  else openMenu()
}

// The panel fully covers the trigger while open, so a click mid-close lands
// here, not on the trigger — same reversal path.
function onPanelClick() {
  const popover = popoverRef.value
  if (popover?.isClosing) {
    popover.cancelClose()
    springTo(1, MORPH_SPRING_OPEN)
  }
}

function close() {
  popoverRef.value?.close()
}

function beforeClose(done: () => void) {
  if (reducedMotion() || !geo) {
    springControls?.stop()
    progress = 0
    render()
    return done()
  }
  springTo(0, MORPH_SPRING_CLOSE, done)
}

onUnmounted(() => {
  teleportTargetEl?.remove()
  springControls?.stop()
})
</script>

<style scoped>
.bloom-stage {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-block-size: 15rem;
  padding-block: 0.5rem;
}

.bloom-anchor {
  position: relative;
  display: inline-flex;
}

/* The open panel fully covers the trigger, but its focus outline draws 4px
   OUTSIDE the element box and pokes out above the panel's top edge. */
.bloom-anchor .ui-button[aria-expanded='true'] {
  outline: none;
}

/* The morph surface is the library's own panel, on the trigger's own primary
   surface — the pill and the menu are one continuous color, so the morph
   reads as the button itself growing, not a swap to a different surface.
   No CSS border: a border paints on the unclipped rectangular box, so the
   clip-path morph slices it off around the rounded corners at rest and
   strands fragments of it mid-morph. The hairline ring + depth both come
   from drop-shadow, which traces the clipped silhouette every frame. */
.bloom-anchor :deep(.bloom-panel) {
  box-shadow: none;
  border-radius: 0;
  inline-size: 16.5rem;
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
  filter: drop-shadow(0 0 1px var(--ui-border)) drop-shadow(0 10px 24px rgb(0 0 0 / 0.14));
  /* Hidden until the first per-frame inline clip takes over. */
  clip-path: inset(0 100% 100% 0);
}

.bloom-anchor :deep(.bloom-panel .ui-popover-body) {
  padding: 0;
}

/* Ghost buttons inside the panel sit on the primary surface, not the page —
   their text and hover wash both come from the contrast token. */
.bloom-anchor :deep(.bloom-panel .ui-button--ghost) {
  color: var(--ui-primary-contrast);
}
@media (hover: hover) and (pointer: fine) {
  .bloom-anchor :deep(.bloom-panel .ui-button--ghost:hover) {
    background: color-mix(in srgb, var(--ui-primary-contrast) 12%, transparent);
  }
}

/* Content arrives a beat after the surface starts growing (the box itself is
   the entrance affordance), and vanishes the instant a close starts — the
   library's data-state hook drives it in pure CSS. pointer-events off while
   closing so a mid-close click falls through to the panel's reversal
   handler instead of a hidden item. */
.bloom-anchor :deep(.bloom-content) {
  animation: bloom-content-in 200ms ease-out 100ms both;
}
.bloom-anchor :deep(.ui-popover-positioner[data-state='closing'] .bloom-content) {
  animation: none;
  opacity: 0;
  pointer-events: none;
}

@keyframes bloom-content-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.bloom-anchor :deep(.bloom-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.75rem 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: color-mix(in srgb, var(--ui-primary-contrast) 70%, transparent);
}

.bloom-anchor :deep(.bloom-grid) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;
  padding: 0 0.5rem 0.5rem;
}

/* Ghost variant already gives real hover/press/focus feedback on the root —
   only geometry needs overriding here. */
.bloom-anchor :deep(.bloom-item.ui-button) {
  block-size: auto;
  padding: 0.75rem 0.375rem;
  border-radius: 12px;
}
.bloom-anchor :deep(.bloom-item .ui-button-content) {
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--ui-primary-contrast) 80%, transparent);
  opacity: 0;
  scale: 0.25;
  filter: blur(4px);
  animation: bloom-item-in 300ms var(--ui-ease-out) forwards;
  animation-delay: var(--bloom-delay, 0ms);
}
.bloom-anchor :deep(.bloom-item:hover .ui-button-content) {
  color: var(--ui-primary-contrast);
}

@keyframes bloom-item-in {
  to {
    opacity: 1;
    scale: 1;
    filter: blur(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bloom-anchor :deep(.bloom-content) {
    animation: bloom-fade 150ms ease forwards;
  }
  .bloom-anchor :deep(.bloom-item .ui-button-content) {
    animation: bloom-fade 150ms ease forwards;
    animation-delay: 0ms;
    scale: 1;
    filter: none;
  }

  @keyframes bloom-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}
</style>
