<template>
  <section class="demo">
    <h2>Bottom sheet</h2>
    <p class="note">
      A Vaul-style draggable sheet, ported from
      <a href="https://github.com/unovue/vaul-vue" target="_blank" rel="noopener">vaul-vue</a>'s own
      physics: a panel fixed at one viewport tall, repositioned entirely via
      <code>transform: translateY()</code>, never resized live (a per-frame
      <code>block-size</code> change forces layout reflow every pointermove; a transform is
      compositor-only). Release decisions are velocity-aware, not just distance-based: a real flick
      jumps straight to the nearest extreme regardless of how far you dragged, and a slow deliberate
      drag settles wherever's closest.
    </p>

    <h3>Default, <code>title</code> prop, drag-to-dismiss</h3>
    <Button @click="basicOpen = true">Choose a plan</Button>
    <BottomSheet v-model:open="basicOpen" title="Choose a plan" aria-label="Choose a plan">
      <div class="sheet-plan-list">
        <Button
          v-for="plan in plans"
          :key="plan.id"
          variant="outline"
          class="sheet-plan"
          @click="chosenPlan = plan.id"
        >
          <span>{{ plan.name }}</span>
          <span class="sheet-plan-price">{{ plan.price }}</span>
        </Button>
      </div>
      <p v-if="chosenPlanName" class="sheet-lede">Selected: {{ chosenPlanName }}</p>
      <p class="sheet-lede">Drag this row of extra text down to try the dismiss gesture:</p>
      <p v-for="i in 12" :key="i" class="sheet-filler">
        Scrollable filler line {{ i }}. Scroll to the top, then drag down to dismiss instead of
        scroll.
      </p>
    </BottomSheet>

    <h3>Sizing: <code>width</code> and <code>fullScreen</code></h3>
    <p class="note">
      Always flush to the bottom edge regardless of width (via Dialog's <code>flush</code> prop):
      capped widths stay centered. <code>fullScreen</code> collapses to a single takeover snap point
      with unrounded corners, since there's nowhere left to drag up to. Beyond the sm/md/lg scale,
      the <code>ui.panel</code> escape hatch (same one Dialog's blurred-backdrop demo uses) reaches
      the panel class directly for an arbitrary width.
    </p>
    <div class="row">
      <Button variant="outline" @click="widthOpen = 'full'">full</Button>
      <Button variant="outline" @click="widthOpen = 'sm'">sm</Button>
      <Button variant="outline" @click="widthOpen = 'md'">md</Button>
      <Button variant="outline" @click="widthOpen = 'lg'">lg</Button>
      <Button variant="outline" @click="fullScreenOpen = true">fullScreen</Button>
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
    <BottomSheet v-model:open="fullScreenOpen" full-screen title="Filters" aria-label="Filters">
      <p class="sheet-lede">A single snap point at 100% height. Drag the handle down to dismiss.</p>
    </BottomSheet>

    <h3>Custom <code>#header</code> slot</h3>
    <p class="note">
      Replaces the title and close row entirely: the default is opt-in, not forced.
    </p>
    <Button @click="customHeaderOpen = true">Share this page</Button>
    <BottomSheet v-model:open="customHeaderOpen" aria-label="Share">
      <template #header="{ close }">
        <div class="sheet-custom-header">
          <span class="sheet-custom-header-icon" aria-hidden="true">↗</span>
          <span class="sheet-title">Share this page</span>
          <Button size="sm" variant="ghost" @click="close()">Done</Button>
        </div>
      </template>
      <p class="sheet-lede">The trailing action here is "Done", not an ×, fully consumer-owned.</p>
    </BottomSheet>

    <h3>Nested / stacked sheets</h3>
    <p class="note">
      A sheet rendered inside another sheet's slot is detected automatically (provide/inject, same
      as Vaul's nested drawers): the parent recedes behind the child with Vaul's own 16px
      displacement, composed with its snap position, and comes back in sync with the child's real
      exit. Escape and focus stay scoped to the topmost one via Dialog's layer stack, with zero
      consumer wiring.
    </p>
    <Button @click="parentOpen = true">Open parent sheet</Button>
    <BottomSheet v-model:open="parentOpen" title="Parent sheet" aria-label="Parent sheet">
      <p class="sheet-lede">Open a second sheet on top of this one:</p>
      <Button @click="childOpen = true">Open child sheet</Button>
      <BottomSheet v-model:open="childOpen" title="Child sheet" aria-label="Child sheet">
        <p class="sheet-lede">
          The parent sheet behind this one is scaled and pushed back. Try Escape: it closes only
          this one.
        </p>
      </BottomSheet>
    </BottomSheet>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, BottomSheet } from 'vael-ui'

const basicOpen = shallowRef(false)
const fullScreenOpen = shallowRef(false)
const customHeaderOpen = shallowRef(false)
const widthOpen = shallowRef<'full' | 'sm' | 'md' | 'lg' | null>(null)
const parentOpen = shallowRef(false)
const childOpen = shallowRef(false)

const plans = [
  { id: 'individual', name: 'Individual', price: '$9.99/mo' },
  { id: 'family', name: 'Family', price: '$16.99/mo' },
  { id: 'business', name: 'Business', price: '$29.99/mo' },
]
const chosenPlan = shallowRef<string | null>(null)
const chosenPlanName = computed(() => plans.find((p) => p.id === chosenPlan.value)?.name)
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
  inline-size: 100%;
}
.sheet-plan-price {
  color: var(--ui-text-muted);
}
.sheet-lede {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
}
.sheet-filler {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
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
