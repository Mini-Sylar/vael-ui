<template>
  <section class="demo">
    <h2>Tour</h2>
    <p class="note">
      Spotlights one target element at a time and steps a positioned callout through a sequence —
      product walkthroughs, onboarding. Composes <code>Popover</code> for the callout (its
      <code>triggerEl</code> prop already supports an external, changing reference element), so
      Teleport, positioning, and the <code>forceMount</code>/<code>beforeClose</code>
      animation-agnostic contract all come from there. The spotlight cutout is a separate
      <code>clip-path</code>-based overlay — compositor-accelerated and natively click-through, no
      extra click-catcher element needed.
    </p>

    <h3>Default, with groups</h3>
    <p class="note">
      Steps sharing a <code>group</code> cluster into a "Section X of Y" progress line
      automatically. The target itself stays clickable mid-tour by default.
    </p>
    <div class="row">
      <Button @click="basicOpen = true">Start tour</Button>
    </div>
    <div class="tour-toolbar">
      <Button id="tour-new" variant="outline">New</Button>
      <Button id="tour-share" variant="outline">Share</Button>
      <Card id="tour-settings" title="Settings" description="Workspace preferences and members." />
    </div>
    <Tour v-model:open="basicOpen" :steps="basicSteps">
      <template #default="{ step, index, total, group, isFirst, isLast, next, prev, skip }">
        <div class="tour-callout">
          <p v-if="group" class="tour-callout-eyebrow">
            {{ group }} — step {{ index + 1 }} of {{ total }}
          </p>
          <h3 class="tour-callout-title">{{ step?.title }}</h3>
          <p class="tour-callout-description">{{ step?.description }}</p>
          <div class="tour-callout-actions">
            <Button v-if="!isFirst" variant="ghost" size="sm" @click="prev()">Back</Button>
            <Button variant="ghost" size="sm" @click="skip()">Skip</Button>
            <Button size="sm" @click="next()">{{ isLast ? 'Done' : 'Next' }}</Button>
          </div>
        </div>
      </template>
    </Tour>

    <h3><code>disableInteraction</code></h3>
    <p class="note">
      Per step, not tour-wide. The target goes inert like the rest of the page instead of staying
      clickable — a "look, don't touch" step.
    </p>
    <div class="row">
      <Button @click="lockedOpen = true">Start tour</Button>
    </div>
    <div class="tour-toolbar">
      <Button id="tour-locked-target" variant="outline">Don't click me mid-tour</Button>
    </div>
    <Tour v-model:open="lockedOpen" :steps="lockedSteps" />

    <h3><code>onBeforeEnter</code>: targets behind a drawer</h3>
    <p class="note">
      A step's target doesn't have to exist yet — <code>onBeforeEnter</code> runs (and is awaited)
      before Tour goes looking for it, so opening whatever the target lives behind (a drawer, an
      accordion panel, a route change) and awaiting <code>nextTick()</code> is enough to guarantee
      it's mounted in time.
    </p>
    <div class="row">
      <Button @click="drawerTourOpen = true">Start tour</Button>
    </div>
    <Drawer v-model:open="drawerOpen" side="right" title="Filters" aria-label="Filters">
      <Button id="tour-drawer-target" variant="outline">Apply saved filter</Button>
    </Drawer>
    <Tour v-model:open="drawerTourOpen" :steps="drawerSteps" />

    <h3>Stress test: every overlay primitive behind one step each</h3>
    <p class="note">
      Each step here lives behind a <em>different</em> overlay primitive — Dialog, Drawer, Popover,
      BottomSheet, and CommandPalette — each independently teleported to <code>body</code>, each
      opened and the previous one closed from that step's own <code>onBeforeEnter</code>. Confirms
      the same re-resolve logic holds no matter which primitive is doing the teleporting.
    </p>
    <div class="row">
      <Button ref="teleportPopoverTrigger" @click="teleportTourOpen = true">Start tour</Button>
    </div>
    <Dialog v-model:open="teleportDialogOpen" aria-label="Step 1 target">
      <Button id="tour-in-dialog" variant="outline">Target inside a Dialog</Button>
    </Dialog>
    <Drawer
      v-model:open="teleportDrawerOpen"
      side="right"
      title="Step 2 target"
      aria-label="Step 2 target"
    >
      <Button id="tour-in-drawer" variant="outline">Target inside a Drawer</Button>
    </Drawer>
    <Popover
      v-model:open="teleportPopoverOpen"
      :trigger-el="teleportPopoverTrigger"
      :close-on-outside="false"
    >
      <Button id="tour-in-popover" variant="outline">Target inside a Popover</Button>
    </Popover>
    <BottomSheet v-model:open="teleportSheetOpen" aria-label="Step 4 target">
      <Button id="tour-in-sheet" variant="outline">Target inside a BottomSheet</Button>
    </BottomSheet>
    <CommandPalette v-model:open="teleportPaletteOpen" :items="teleportPaletteItems">
      <template #item="{ item }">
        <span :id="item.id === 'target' ? 'tour-in-palette' : undefined">{{ item.label }}</span>
      </template>
    </CommandPalette>
    <Tour
      v-model:open="teleportTourOpen"
      :steps="teleportSteps"
      @finish="closeTeleportOverlays"
      @skip="closeTeleportOverlays"
    />
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import { BottomSheet, Button, Card, CommandPalette, Dialog, Drawer, Popover, Tour } from 'vael-ui'
import type { CommandPaletteItem, TourStep } from 'vael-ui'

const basicOpen = shallowRef(false)
const basicSteps: TourStep[] = [
  {
    target: '#tour-new',
    group: 'Basics',
    title: 'Create something new',
    description: 'Starts a blank document in the current workspace.',
  },
  {
    target: '#tour-share',
    group: 'Basics',
    title: 'Invite your team',
    description: 'Share this workspace with teammates by email or link.',
  },
  {
    target: '#tour-settings',
    group: 'Configuration',
    side: 'top',
    title: 'Tune your workspace',
    description: 'Rename it, manage members, or change the plan from here.',
  },
]

const lockedOpen = shallowRef(false)
const lockedSteps: TourStep[] = [
  {
    target: '#tour-locked-target',
    disableInteraction: true,
    title: 'Just a preview',
    description: 'This button is inert for the length of this step — clicking does nothing.',
  },
]

const drawerOpen = shallowRef(false)
const drawerTourOpen = shallowRef(false)
const drawerSteps: TourStep[] = [
  {
    target: '#tour-drawer-target',
    title: 'Reuse a saved filter',
    description: 'The drawer opens itself before Tour looks for this button.',
    onBeforeEnter: async () => {
      drawerOpen.value = true
      await nextTick()
    },
  },
]

const teleportTourOpen = shallowRef(false)
const teleportDialogOpen = shallowRef(false)
const teleportDrawerOpen = shallowRef(false)
const teleportPopoverOpen = shallowRef(false)
const teleportSheetOpen = shallowRef(false)
const teleportPaletteOpen = shallowRef(false)
const teleportPopoverTrigger = useTemplateRef('teleportPopoverTrigger')

const teleportPaletteItems: CommandPaletteItem[] = [
  { id: 'target', label: 'Target inside a CommandPalette' },
  { id: 'other', label: 'Just another item' },
]

function closeTeleportOverlays() {
  teleportDialogOpen.value = false
  teleportDrawerOpen.value = false
  teleportPopoverOpen.value = false
  teleportSheetOpen.value = false
  teleportPaletteOpen.value = false
}

const teleportSteps: TourStep[] = [
  {
    target: '#tour-in-dialog',
    title: 'Behind a Dialog',
    description: 'Opened by this step, closed by the next one.',
    onBeforeEnter: async () => {
      teleportDialogOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#tour-in-drawer',
    title: 'Behind a Drawer',
    description: 'The Dialog just closed; this one opened in its place.',
    onBeforeEnter: async () => {
      teleportDialogOpen.value = false
      teleportDrawerOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#tour-in-popover',
    title: 'Behind a Popover',
    description: 'The Drawer just closed; this one opened in its place.',
    onBeforeEnter: async () => {
      teleportDrawerOpen.value = false
      teleportPopoverOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#tour-in-sheet',
    title: 'Behind a BottomSheet',
    description: 'The Popover just closed; this one opened in its place.',
    onBeforeEnter: async () => {
      teleportPopoverOpen.value = false
      teleportSheetOpen.value = true
      await nextTick()
    },
  },
  {
    target: '#tour-in-palette',
    title: 'Behind a CommandPalette',
    description: 'Five different teleported components, same re-resolve logic each time.',
    onBeforeEnter: async () => {
      teleportSheetOpen.value = false
      teleportPaletteOpen.value = true
      await nextTick()
    },
  },
]
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-block-end: 1rem;
}
.tour-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-block-end: 1.5rem;
}
.tour-callout {
  display: grid;
  gap: 0.5rem;
  padding: 1.25rem;
  max-inline-size: 20rem;
}
.tour-callout-eyebrow {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.tour-callout-title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
}
.tour-callout-description {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}
.tour-callout-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-block-start: 0.5rem;
}
</style>
