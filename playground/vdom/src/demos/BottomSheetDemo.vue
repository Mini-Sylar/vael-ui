<template>
  <section class="demo">
    <h2>Bottom sheet</h2>
    <p class="note">
      A Vaul-style draggable sheet, ported from
      <a href="https://github.com/unovue/vaul-vue" target="_blank" rel="noopener">vaul-vue</a>'s own
      physics — a panel fixed at one viewport tall, repositioned entirely via
      <code>transform: translateY()</code>, never resized live (a per-frame <code>block-size</code>
      change forces layout reflow every pointermove; a transform is compositor-only). Release
      decisions are velocity-aware, not just distance-based: a real flick jumps straight to the
      nearest extreme regardless of how far you dragged, a slow deliberate drag settles wherever's
      closest. Composed from two pieces, not one monolithic component:
      <code>useSheetDrag</code> is headless drag/snap/dismiss physics with no knowledge of Dialog,
      Teleport, or focus; <code>&lt;BottomSheet&gt;</code> composes
      <code>&lt;Dialog position="bottom" force-mount&gt;</code> around it, the same way
      <code>&lt;Menu&gt;</code> composes <code>usePopover</code> — Teleport, the overlay, the focus
      trap, scroll lock, Escape-to-close, and layer stacking all come free, with nothing
      reimplemented. The drag-past-threshold dismiss hands off to Dialog's own
      <code>close()</code>/<code>beforeClose(done)</code>, the exact same exit path Escape and the
      overlay already use.
    </p>

    <h3>Default — <code>title</code> prop, two snap points</h3>
    <Button @click="basicOpen = true">Open bottom sheet</Button>
    <BottomSheet v-model:open="basicOpen" title="Choose a plan" aria-label="Choose a plan">
      <div class="sheet-plan-list">
        <button v-for="plan in plans" :key="plan.id" type="button" class="sheet-plan">
          <span>{{ plan.name }}</span>
          <span class="sheet-plan-price">{{ plan.price }}</span>
        </button>
      </div>
      <p class="sheet-lede">Drag this row of extra text down to try the dismiss gesture:</p>
      <p v-for="i in 12" :key="i" class="sheet-filler">
        Scrollable filler line {{ i }} — scroll to the top, then drag down to dismiss instead of
        scroll.
      </p>
    </BottomSheet>

    <h3>
      <code>width</code> — <code>full</code> (default) / <code>sm</code> / <code>md</code> /
      <code>lg</code>
    </h3>
    <p class="note">
      Always flush to the bottom edge regardless of width (via Dialog's new <code>flush</code>
      prop) — capped widths stay centered.
    </p>
    <div class="row">
      <Button variant="outline" @click="widthOpen = 'full'">full</Button>
      <Button variant="outline" @click="widthOpen = 'sm'">sm</Button>
      <Button variant="outline" @click="widthOpen = 'md'">md</Button>
      <Button variant="outline" @click="widthOpen = 'lg'">lg</Button>
    </div>
    <BottomSheet
      :open="widthOpen !== null"
      :width="widthOpen ?? 'full'"
      title="Notifications"
      aria-label="Notifications"
      @update:open="(v) => !v && (widthOpen = null)"
    >
      <p class="sheet-lede">width="{{ widthOpen }}"</p>
    </BottomSheet>

    <h3><code>fullScreen</code> — one takeover snap point, corners unrounded</h3>
    <Button @click="fullScreenOpen = true">Open full-screen sheet</Button>
    <BottomSheet v-model:open="fullScreenOpen" full-screen title="Filters" aria-label="Filters">
      <p class="sheet-lede">
        A single snap point at 100% height — drag the handle down to dismiss, there's nowhere to
        drag up to.
      </p>
    </BottomSheet>

    <h3>Custom <code>#header</code> slot</h3>
    <p class="note">Replaces the title + close row entirely — the default is opt-in, not forced.</p>
    <Button @click="customHeaderOpen = true">Open with custom header</Button>
    <BottomSheet v-model:open="customHeaderOpen" aria-label="Share">
      <template #header="{ close }">
        <div class="sheet-custom-header">
          <span class="sheet-custom-header-icon" aria-hidden="true">↗</span>
          <span class="sheet-title">Share this page</span>
          <Button size="sm" variant="ghost" @click="close()">Done</Button>
        </div>
      </template>
      <p class="sheet-lede">The trailing action here is "Done", not an × — fully consumer-owned.</p>
    </BottomSheet>

    <h3>Arbitrary custom width — <code>ui.panel</code></h3>
    <p class="note">
      Beyond the sm/md/lg scale: the <code>ui</code> prop reaches the same panel class Dialog's own
      <code>ui.panel</code> targets, so any width is fair game, not just the preset three.
    </p>
    <Button @click="customWidthOpen = true">Open 26rem-wide sheet</Button>
    <BottomSheet
      v-model:open="customWidthOpen"
      title="Custom width"
      aria-label="Custom width"
      :ui="{ panel: 'sheet-custom-width' }"
    >
      <p class="sheet-lede">
        inline-size: 26rem, set via ui.panel — not one of the sm/md/lg steps.
      </p>
    </BottomSheet>

    <h3>Nested / stacked sheets</h3>
    <p class="note">
      A sheet rendered inside another sheet's slot is detected automatically (provide/inject, same
      as Vaul's nested drawers) — the parent recedes behind the child with Vaul's own 16px
      displacement, composed with its snap position, and comes back in sync with the child's real
      exit. Escape and focus stay scoped to the topmost one via Dialog's layer stack. Zero consumer
      wiring.
    </p>
    <Button @click="parentOpen = true">Open parent sheet</Button>
    <BottomSheet v-model:open="parentOpen" title="Parent sheet" aria-label="Parent sheet">
      <p class="sheet-lede">Open a second sheet on top of this one:</p>
      <Button @click="childOpen = true">Open child sheet</Button>
      <BottomSheet v-model:open="childOpen" title="Child sheet" aria-label="Child sheet">
        <p class="sheet-lede">
          The parent sheet behind this one is scaled/pushed back — try Escape, it closes only this
          one.
        </p>
      </BottomSheet>
    </BottomSheet>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, BottomSheet } from 'vael-ui'

const basicOpen = shallowRef(false)
const fullScreenOpen = shallowRef(false)
const customHeaderOpen = shallowRef(false)
const customWidthOpen = shallowRef(false)
const widthOpen = shallowRef<'full' | 'sm' | 'md' | 'lg' | null>(null)
const parentOpen = shallowRef(false)
const childOpen = shallowRef(false)

const plans = [
  { id: 'individual', name: 'Individual', price: '$9.99/mo' },
  { id: 'family', name: 'Family', price: '$16.99/mo' },
  { id: 'business', name: 'Business', price: '$29.99/mo' },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.sheet-title {
  font-size: 0.9375rem;
  font-weight: 600;
}
.sheet-plan-list {
  display: grid;
  gap: 0.5rem;
  margin-block-end: 1rem;
}
.sheet-plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: transparent;
  color: var(--ui-text);
  font: inherit;
  cursor: pointer;
}
.sheet-plan-price {
  color: var(--page-text-faint);
}
.sheet-lede {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--page-text-faint);
}
.sheet-filler {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--page-text-faint);
}
.sheet-custom-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  inline-size: 100%;
}
.sheet-custom-header-icon {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 50%;
  background: var(--ui-muted);
}
.sheet-custom-header .sheet-title {
  flex: 1;
}
</style>

<!-- Unscoped on purpose, same reason as FamilyDrawerDemo.vue's own overlay/
  panel classes: Dialog Teleports its panel to <body>, where no scoped
  ancestor exists, so ui.panel lands as a plain class name on a
  library-rendered element that this component's own scoped styles can
  never reach. -->
<style>
.sheet-custom-width {
  inline-size: 26rem;
  max-inline-size: 90vw;
  margin-inline: auto;
}
</style>
