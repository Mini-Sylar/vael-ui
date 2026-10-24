<template>
  <section class="demo">
    <h3>Extreme: groups in motion</h3>
    <p class="note">
      Every group is a real element (<code>ui.group</code>), so is its label
      (<code>ui.groupLabel</code>) and each option (<code>ui.option</code>). The panel's own look is
      one line of <code>motion</code>; inside it, <code>v-animate</code> does the rest. On open,
      each label wipes in behind its accent bar and its options rise in after it. While you search,
      the options and labels that stay glide to their new places with <code>layout</code>, and each
      count pops when it changes with <code>replay</code>. Reduced motion keeps the fades and drops
      the movement.
    </p>
    <div class="row">
      <Field label="Tool">
        <Select
          v-model="tool"
          v-model:open="open"
          v-model:query="query"
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
            <span v-animate:label="searched ? arrive : label" class="label-body">
              <span
                v-animate:accent="searched ? undefined : accent"
                class="accent"
                :style="{ background: group.accent }"
                aria-hidden="true"
              />
              <span class="name">{{ group.label }}</span>
              <span v-animate="{ ...count, replay: shown.length }" class="count">{{
                shown.length
              }}</span>
            </span>
          </template>
          <template #item="{ item, selected, group }">
            <span v-animate:option="searched ? arrive : option" class="option-body">
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
import { shallowRef, watch } from 'vue'
import { Field, Select, vAnimate } from 'vael-ui'
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
const open = shallowRef(false)
const query = shallowRef('')
// Once you search, rows that come back just rise in; the opening's wipe and stagger are done.
const searched = shallowRef(false)
watch(query, () => (searched.value = open.value))
watch(open, () => (searched.value = false))

// GSAP's power3.out (a quartic), the original's curve throughout, sampled: the usual cubic-bezier
// stand-in is off by up to 4% of the move.
const POWER3_OUT = `linear(${Array.from({ length: 21 }, (_, i) => 1 - (1 - i / 20) ** 4).join(', ')})`
// Closing: 150ms on power2.out.
const close = { duration: 150, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' }
// The panel scales in; closing is a quick fade.
const panelMotion: SelectMotion = {
  initial: { panel: { opacity: 0, scale: 0.96 } },
  exit: { panel: { opacity: { value: 0, ...close }, scale: { value: 0.97, ...close } } },
  duration: 220,
  easing: POWER3_OUT,
}
// Labels wipe in one after another; `layout` glides the ones that stay when a search moves them.
const label = {
  initial: { clipPath: 'inset(0 100% 0 0)' },
  stagger: 0.07,
  delay: 0.06,
  duration: 300,
  easing: POWER3_OUT,
  layout: true,
  exit: false as const,
}
// Each accent bar grows down with its label.
const accent = {
  initial: { scale: '1 0' },
  stagger: 0.07,
  delay: 0.06,
  duration: 300,
  easing: POWER3_OUT,
}
// Options stagger within their group, each group starting with its label, as the original does.
const sizes = toolGroups.map((group) => group.items.length)
function optionAt(index: number, count: number) {
  if (count !== sizes.reduce((sum, size) => sum + size)) return index * 0.03
  let group = 0
  while (index >= sizes[group]!) index -= sizes[group++]!
  return group * 0.07 + index * 0.03
}
// Options rise in once their label has started, and glide the same way.
const option = {
  initial: { opacity: 0, y: 8, blur: 2 },
  stagger: optionAt,
  delay: 0.11,
  duration: 260,
  easing: POWER3_OUT,
  layout: true,
  exit: false as const,
}
// While searching, rows that stay glide 0.3s on power3.out; one that comes back rises in on GSAP's
// default power1.out, and one filtered out goes at once.
const rise = { duration: 220, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
const arrive = {
  initial: { opacity: { value: 0, ...rise }, y: { value: 6, ...rise } },
  duration: 300,
  easing: POWER3_OUT,
  layout: true,
  exit: false as const,
}
// The count pops with the original's overshoot.
const count = {
  initial: { scale: 1.5 },
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
.motion-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.motion-group + .motion-group {
  margin-block-start: 0.375rem;
}
</style>
