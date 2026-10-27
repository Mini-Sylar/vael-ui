<template>
  <section class="demo">
    <h3>Extreme: groups in motion</h3>
    <p class="note">
      <code>ui.group</code>, <code>ui.groupLabel</code> and <code>ui.option</code> give each group,
      label and option a class, and <code>targets</code> in <code>motion</code> reach them with
      <code>select</code>. On open, each label wipes in behind its accent bar and its options rise
      in after it. While you search, <code>v-animate</code> with <code>layout</code> glides the
      labels and options that stay, and <code>appear: 'later'</code> brings back the ones that
      return (not the ones there as it opens). Each count pops when it changes with
      <code>replay</code>. Closing fades the panel, its content with it. Reduced motion keeps the
      fades and drops the movement.
    </p>
    <div class="row">
      <Field label="Tool">
        <Select
          v-model="tool"
          :items="toolGroups"
          filter
          :motion="panelMotion"
          placeholder="Pick a tool"
          :ui="{
            panel: { style: { minInlineSize: '18rem' } },
            group: 'motion-group',
            groupLabel: 'motion-label',
            option: 'motion-option',
          }"
        >
          <template #group-label="{ group, items: shown }">
            <span v-animate="rows" class="label-body">
              <span class="accent" :style="{ background: group.accent }" aria-hidden="true" />
              <span class="name">{{ group.label }}</span>
              <span v-animate="{ ...count, replay: shown.length }" class="count">{{
                shown.length
              }}</span>
            </span>
          </template>
          <template #item="{ item, selected, group }">
            <span v-animate="rows" class="option-body">
              <component
                :is="group?.icon"
                class="tool-icon"
                :style="{ color: group?.accent }"
                aria-hidden="true"
              />
              <span class="tool-name">{{ item.label }}</span>
              <PhCheck v-if="selected" weight="bold" aria-hidden="true" />
            </span>
          </template>
        </Select>
      </Field>
      <output class="panel-text">{{ tool ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Select } from 'vael-ui'
import { vAnimate } from 'vael-ui/motion'
import type { SelectMotion } from 'vael-ui'
import { PhChatsCircle, PhCheck, PhCode, PhFileText, PhPaintBrush } from '@phosphor-icons/vue'

const toolGroups = [
  {
    label: 'Design',
    accent: 'oklch(0.6 0.2 330)',
    icon: PhPaintBrush,
    items: [
      { label: 'Sketchpad', value: 'sketchpad' },
      { label: 'Prototype kit', value: 'prototype' },
      { label: 'Icon library', value: 'icons' },
    ],
  },
  {
    label: 'Code',
    accent: 'oklch(0.58 0.17 255)',
    icon: PhCode,
    items: [
      { label: 'Repository host', value: 'repo' },
      { label: 'Build runner', value: 'build' },
      { label: 'Issue tracker', value: 'issues' },
      { label: 'Code review', value: 'review' },
    ],
  },
  {
    label: 'Chat',
    accent: 'oklch(0.62 0.15 160)',
    icon: PhChatsCircle,
    items: [
      { label: 'Team chat', value: 'chat' },
      { label: 'Video calls', value: 'calls' },
    ],
  },
  {
    label: 'Docs',
    accent: 'oklch(0.66 0.15 60)',
    icon: PhFileText,
    items: [
      { label: 'Team wiki', value: 'wiki' },
      { label: 'Meeting notes', value: 'notes' },
      { label: 'Release notes', value: 'releases' },
    ],
  },
]

const tool = shallowRef<string | null>(null)

// GSAP's power3.out (a quartic), sampled.
const POWER3_OUT = `linear(${Array.from({ length: 21 }, (_, i) => 1 - (1 - i / 20) ** 4).join(', ')})`
// Labels wipe in 70ms apart, each accent growing with it.
const wave = { stagger: 0.07, delay: 0.06, duration: 300, easing: POWER3_OUT }
// Options stagger 30ms within their group, each group starting with its label.
const starts = toolGroups.flatMap((group, g) => group.items.map((_, i) => g * 0.07 + i * 0.03))
// Opening, on the parts `ui` marks: the panel scales in, labels wipe, options rise after them.
// Closing fades the panel on vael-ui's exit token (150ms).
const panelMotion: SelectMotion = {
  initial: { panel: { opacity: 0, scale: 0.96 } },
  exit: { panel: { opacity: 0, scale: 0.97 } },
  duration: 220,
  easing: POWER3_OUT,
  targets: {
    label: { ...wave, select: '.motion-label', initial: { clipPath: 'inset(0 100% 0 0)' } },
    accent: { ...wave, select: '.accent', initial: { scale: '1 0' } },
    option: {
      ...wave,
      select: '.motion-option',
      initial: { opacity: 0, y: 8, blur: 2 },
      stagger: (i) => starts[i]!,
      delay: 0.11,
      duration: 260,
    },
  },
}
// Searching: rows that stay glide; one that comes back rises in on GSAP's default power1.out.
const rise = { duration: 220, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
const rows = {
  layout: true,
  appear: 'later' as const,
  duration: 300,
  easing: POWER3_OUT,
  initial: { opacity: { value: 0, ...rise }, y: { value: 6, ...rise } },
}
// The count pops with the original's overshoot and colour flash.
const count = {
  initial: { scale: 1.5, color: 'var(--ui-text)' },
  duration: 260,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
}
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.label-body,
.option-body {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.5rem;
  min-inline-size: 0;
}
.accent {
  flex: none;
  transform-origin: top;
  inline-size: 3px;
  block-size: 0.875rem;
  border-radius: 2px;
}
.name {
  color: var(--ui-text);
}
.count {
  display: inline-block;
  margin-inline-start: auto;
  font-variant-numeric: tabular-nums;
}
.tool-icon {
  flex: none;
}
.tool-name {
  flex: 1;
  min-inline-size: 0;
}
</style>

<!-- The panel is teleported, so vael-ui's own parts are styled from here, outside the scoped styles. -->
<style>
.motion-group + .motion-group {
  margin-block-start: 0.375rem;
}
</style>
