<template>
  <section class="demo">
    <h2>Gooey popover</h2>
    <p class="note">
      Built on <code>&lt;Popover&gt;</code> itself: <code>force-mount</code> keeps the panel alive,
      <code>beforeClose(done)</code> runs the exit ooze for every dismissal path (Escape, outside
      click, the Done button), <code>teleportTo</code> drops the panel into a local element so it
      shares the trigger's stacking context, and the exposed <code>panelEl</code> is clipped
      per-frame by a spring-driven <code>clip-path</code> morph — safe to own imperatively because
      the panel carries no Vue-managed inline styles. floating-ui still positions for real: the goo
      geometry re-measures from wherever the panel actually is, on every reposition (scroll, flip,
      shift), via the exposed reactive <code>positionerStyle</code>. A click mid-exit
      <code>cancelClose()</code>s the pending close and springs back open. This demo is also a
      stress test that promoted three library additions: <code>isClosing</code>/
      <code>cancelClose</code>, idempotent close requests, and the exposed positioning refs. The
      filter (blur → alpha-sharpen → <code>feComposite atop</code>) only ever sees the blob shapes —
      the text is never blurred.
    </p>
    <div class="gooey-stage">
      <div ref="rootRef" class="gooey-root">
        <svg class="gooey-defs" aria-hidden="true" focusable="false">
          <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </svg>

        <div aria-hidden="true" class="gooey-body" :style="layerStyle">
          <div class="gooey-pill" :style="pillStyle" />
          <div ref="blobRef" class="gooey-blob" />
        </div>

        <Button
          ref="triggerRef"
          pill
          variant="primary"
          class="gooey-trigger"
          aria-haspopup="dialog"
          :aria-expanded="open"
          @click="toggle"
        >
          Gooey
        </Button>

        <Popover
          v-if="gooTarget"
          ref="popoverRef"
          v-model:open="open"
          force-mount
          role="dialog"
          :trigger-el="triggerRef"
          :before-close="beforeClose"
          :teleport-to="gooTarget"
          :scroll-fade="false"
          side="left"
          align="start"
          :side-offset="14"
          class="gooey-panel"
        >
          <template #default="{ close }">
            <p class="panel-text">Oozes out of the trigger — one liquid surface, text and all.</p>
            <Button size="sm" variant="secondary" @click="close()">Done</Button>
          </template>
        </Popover>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import { animate } from 'motion-v'
import { Button, Popover } from 'vael-ui'

const GOO_SPRING = { type: 'spring', visualDuration: 0.32, bounce: 0.28 } as const
const MORPH_RADIUS = 16

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface GooGeo {
  layer: Rect
  trigger: Rect
  panel: Rect
  triggerInPanel: { x: number; y: number }
}

const rootRef = useTemplateRef('rootRef')
const triggerRef = useTemplateRef('triggerRef')
const blobRef = useTemplateRef('blobRef')
const popoverRef = useTemplateRef('popoverRef')

const open = shallowRef(false)
const geo = shallowRef<GooGeo | null>(null)

const gooTarget = shallowRef<HTMLElement | null>(null)
let gooTargetEl: HTMLElement | null = null

onMounted(() => {
  gooTargetEl = document.createElement('div')
  rootRef.value?.appendChild(gooTargetEl)
  gooTarget.value = gooTargetEl
})

// Rects measured after floating-ui has placed the panel, all relative to the
// root — the blob morphs toward wherever the panel really is, flips included.
function measure(): GooGeo | null {
  const rootEl = rootRef.value
  const triggerEl = triggerRef.value?.el
  const panelEl = popoverRef.value?.panelEl
  if (!rootEl || !triggerEl || !panelEl) return null
  const r = rootEl.getBoundingClientRect()
  const t = triggerEl.getBoundingClientRect()
  const p = panelEl.getBoundingClientRect()
  const lx = Math.min(t.left, p.left) - r.left
  const ly = Math.min(t.top, p.top) - r.top
  return {
    layer: {
      x: lx,
      y: ly,
      w: Math.max(t.right, p.right) - r.left - lx,
      h: Math.max(t.bottom, p.bottom) - r.top - ly,
    },
    trigger: { x: t.left - r.left - lx, y: t.top - r.top - ly, w: t.width, h: t.height },
    panel: { x: p.left - r.left - lx, y: p.top - r.top - ly, w: p.width, h: p.height },
    triggerInPanel: { x: t.left - p.left, y: t.top - p.top },
  }
}

const layerStyle = computed(() => {
  const g = geo.value
  if (!g) return { width: '0px', height: '0px' }
  return {
    left: `${g.layer.x}px`,
    top: `${g.layer.y}px`,
    width: `${g.layer.w}px`,
    height: `${g.layer.h}px`,
  }
})

const pillStyle = computed(() => {
  const g = geo.value
  if (!g) return {}
  return {
    left: `${g.trigger.x}px`,
    top: `${g.trigger.y}px`,
    width: `${g.trigger.w}px`,
    height: `${g.trigger.h}px`,
    borderRadius: `${Math.min(g.trigger.h / 2, MORPH_RADIUS)}px`,
  }
})

let progress = 0

function inset(rect: Rect, boxW: number, boxH: number, r: number): string {
  return `inset(${rect.y}px ${boxW - (rect.x + rect.w)}px ${boxH - (rect.y + rect.h)}px ${rect.x}px round ${r}px)`
}

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) }
}

// One progress value drives two clips over the same rect pair — the blob in
// layer coordinates, the panel content in its own — so surface and text ooze
// as a single shape.
function render() {
  const g = geo.value
  const panelEl = popoverRef.value?.panelEl
  if (!g) return
  const triggerRadius = Math.min(g.trigger.h / 2, MORPH_RADIUS)
  const radius = lerp(triggerRadius, MORPH_RADIUS, progress)
  if (blobRef.value) {
    blobRef.value.style.clipPath = inset(
      lerpRect(g.trigger, g.panel, progress),
      g.layer.w,
      g.layer.h,
      radius,
    )
  }
  if (panelEl) {
    const from: Rect = { ...g.triggerInPanel, w: g.trigger.w, h: g.trigger.h }
    const to: Rect = { x: 0, y: 0, w: g.panel.w, h: g.panel.h }
    panelEl.style.clipPath = inset(lerpRect(from, to, progress), g.panel.w, g.panel.h, radius)
  }
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let springControls: ReturnType<typeof animate> | undefined

const nextFrame = () => new Promise(requestAnimationFrame)

watch(open, async (isOpen) => {
  if (!isOpen) return
  springControls?.stop()
  await nextTick()
  // The positioner stays visibility:hidden until floating-ui's first
  // computePosition resolves — that flip is the "panel has landed" signal.
  const positioner = popoverRef.value?.positionerEl
  for (let i = 0; i < 10 && positioner && positioner.style.visibility === 'hidden'; i++) {
    await nextFrame()
  }
  geo.value = measure()
  if (reducedMotion()) {
    progress = 1
    render()
    return
  }
  render()
  springTo(1)
})

// floating-ui keeps moving the panel while open — scroll tracking, flip and
// shift near viewport edges — so the goo geometry re-measures on every
// reposition, not just once at open. positionerStyle is exposed reactively
// for exactly this.
watch(
  () => popoverRef.value?.positionerStyle,
  (style) => {
    if (!open.value || !style || style.visibility === 'hidden') return
    geo.value = measure()
    render()
  },
  { flush: 'post' },
)

// onSettle only fires if this spring is still the active one — a stopped,
// superseded spring must never call a stale done() and close a popover that
// was reversed back open.
function springTo(target: number, onSettle?: () => void) {
  springControls?.stop()
  const spring = animate(progress, target, {
    ...GOO_SPRING,
    onUpdate: (v: number) => {
      progress = v
      render()
    },
  })
  springControls = spring
  if (onSettle) {
    spring.finished.then(() => {
      if (springControls === spring) onSettle()
    })
  }
}

// The trigger toggles through close(), never a raw model write — a direct
// `open = false` bypasses beforeClose, instantly hiding the panel while the
// blob is still painted fully open. A click mid-exit cancels the pending
// close (the model never flipped) and springs back to open.
function toggle() {
  const popover = popoverRef.value
  if (!open.value) {
    open.value = true
    return
  }
  if (popover?.isClosing) {
    popover.cancelClose()
    springTo(1)
    return
  }
  popover?.close()
}

function beforeClose(done: () => void) {
  if (reducedMotion() || !geo.value) {
    springControls?.stop()
    progress = 0
    render()
    return done()
  }
  springTo(0, done)
}

onUnmounted(() => {
  gooTargetEl?.remove()
  springControls?.stop()
})
</script>

<style scoped>
.gooey-defs {
  position: absolute;
  width: 0;
  height: 0;
}

.gooey-stage {
  padding-block: 0.5rem 12rem;
}

.gooey-root {
  position: relative;
  display: inline-flex;
  isolation: isolate;
}

.gooey-trigger {
  position: relative;
  z-index: 0;
  box-shadow: none;
}

/* Goo body: static trigger pill + morphing blob, behind the real trigger.
   Only these shapes live under the filter — the Popover panel is never
   filtered, so text is never blurred. */
.gooey-body {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: -1;
  pointer-events: none;
  filter: url('#gooey-filter');
}

.gooey-pill,
.gooey-blob {
  position: absolute;
  background: var(--ui-primary);
}

.gooey-blob {
  inset: 0;
}

/* The blob behind is the visible surface; the library panel goes transparent
   and only carries the clipped content. The CSS clip hides it until the first
   per-frame inline clip takes over. :deep() because the panel is
   library-rendered — teleported into gooey-root's local target, so the
   scoped ancestor still anchors it. */
.gooey-root :deep(.gooey-panel) {
  background: none;
  box-shadow: none;
  color: var(--ui-primary-contrast);
  inline-size: max-content;
  max-inline-size: min(92vw, 15rem);
  clip-path: inset(0 100% 100% 0);
}

.gooey-root :deep(.gooey-panel .panel-text) {
  color: inherit;
  margin-block-start: 0;
}

@media (prefers-reduced-motion: reduce) {
  .gooey-body {
    filter: none;
  }
}
</style>
