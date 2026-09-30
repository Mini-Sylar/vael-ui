<template>
  <div ref="stage" class="showcase-stage" @pointermove="onPointerMove" @pointerleave="resetTilt">
    <DashboardHero class="stage-dashboard" />

    <!-- Live vael-ui components floating over the dashboard's edges. -->
    <div class="float float--settings" style="--depth: 1.4">
      <p class="float-title">Notifications</p>
      <label class="float-row">
        <span>Email alerts</span>
        <Switch v-model="emailAlerts" size="sm" />
      </label>
      <label class="float-row">
        <span>Weekly digest</span>
        <Switch v-model="weeklyDigest" size="sm" />
      </label>
    </div>

    <div class="float float--menu" style="--depth: 1.8">
      <p class="float-title">Status</p>
      <MenuList :items="statusItems" :active="status" @select="onStatusSelect" />
    </div>

    <div class="float float--toast" style="--depth: 2.2">
      <Message variant="success" title="Export ready">orders-2026.csv, 128 rows</Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { MenuList, Message, Switch } from 'vael-ui'
import type { MenuListItemData } from 'vael-ui'
import DashboardHero from './DashboardHero.vue'

const emailAlerts = shallowRef(true)
const weeklyDigest = shallowRef(false)
const status = shallowRef<string | number>('paid')
const statusItems: MenuListItemData[] = [
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Refunded', value: 'refunded' },
]
function onStatusSelect(item: MenuListItemData) {
  if (item.value !== undefined) status.value = item.value
}

// The floats drift a few pixels against the pointer, each by its own
// --depth, so the stage reads as layered. rAF-throttled; off under reduced
// motion (the CSS ignores --px/--py there).
const stage = useTemplateRef<HTMLElement>('stage')
let frame = 0
function onPointerMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    const el = stage.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--px', ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3))
    el.style.setProperty('--py', ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3))
  })
}
function resetTilt() {
  stage.value?.style.setProperty('--px', '0')
  stage.value?.style.setProperty('--py', '0')
}
</script>

<style scoped>
.showcase-stage {
  --px: 0;
  --py: 0;
  position: relative;
  block-size: 100%;
  /* Room for the floats to overhang the dashboard. */
  padding: 1.75rem 1.5rem 2.5rem 2.5rem;
}

.stage-dashboard {
  block-size: 100%;
}

.float {
  position: absolute;
  z-index: 2;
  padding: 0.75rem;
  border-radius: 12px;
  background: color-mix(in oklch, var(--ui-surface) 88%, transparent);
  backdrop-filter: blur(10px) saturate(1.4);
  box-shadow:
    0 0 0 1px var(--ui-border),
    0 2px 4px color-mix(in oklch, black 5%, transparent),
    0 16px 32px -12px color-mix(in oklch, black 28%, transparent);
  font-size: 0.8125rem;
  transform: translate(
    calc(var(--px) * var(--depth) * -10px),
    calc(var(--py) * var(--depth) * -10px)
  );
  transition: transform 400ms var(--ui-ease-out);
}

.float-title {
  margin: 0 0 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

.float-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-block: 0.25rem;
  cursor: pointer;
}

.float--settings {
  inset-block-start: 40%;
  inset-inline-start: 0;
  inline-size: 12.5rem;
}

.float--menu {
  inset-block-start: 38%;
  inset-inline-end: -0.5rem;
  inline-size: 10.5rem;
}

.float--menu :deep(.ui-menu-list) {
  padding: 0;
}

.float--toast {
  inset-block-end: 0;
  inset-inline-start: 1rem;
  inline-size: 17rem;
  padding: 0;
  background: none;
  backdrop-filter: none;
  box-shadow: none;
}

.float--toast :deep(.ui-message) {
  box-shadow:
    0 0 0 1px var(--ui-border),
    0 16px 32px -12px color-mix(in oklch, black 28%, transparent);
}

/* The floats land once, after the dashboard, lightest layer first. */
@media (prefers-reduced-motion: no-preference) {
  .float {
    animation: float-in 600ms var(--ui-ease-out) both;
  }

  .float--settings {
    animation-delay: 380ms;
  }

  .float--menu {
    animation-delay: 480ms;
  }

  .float--toast {
    animation-delay: 580ms;
  }
}

@media (prefers-reduced-motion: reduce) {
  .float {
    transform: none;
  }
}

@keyframes float-in {
  from {
    opacity: 0;
    translate: 0 10px;
    scale: 0.97;
  }
}

@media (max-width: 900px) {
  .showcase-stage {
    padding: 0;
  }

  .float {
    display: none;
  }
}
</style>
