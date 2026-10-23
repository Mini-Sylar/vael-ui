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
          :items="toolGroups"
          filter
          :motion="{ initial: { panel: { opacity: 0, scale: 0.96 } } }"
          placeholder="Pick a tool"
          :ui="{
            panel: { style: { minInlineSize: '18rem' } },
            group: 'motion-group',
            groupLabel: 'motion-label',
            option: 'motion-option',
          }"
        >
          <template #group-label="{ group, items: shown }">
            <span v-animate:label="label" class="label-body">
              <span
                v-animate:accent="{ initial: { scale: '1 0' }, stagger: 0.07 }"
                class="accent"
                :style="{ background: group.accent }"
                aria-hidden="true"
              />
              <span class="name">{{ group.label }}</span>
              <span v-animate="{ initial: { scale: 1.5 }, replay: shown.length }" class="count">{{
                shown.length
              }}</span>
            </span>
          </template>
          <template #item="{ item, selected, group }">
            <span v-animate:option="option" class="option-body">
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
import { Field, Select, vAnimate } from 'vael-ui'
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

// Labels wipe in one after another; `layout` glides the ones that stay when a search moves them.
const label = {
  initial: { clipPath: 'inset(0 100% 0 0)' },
  stagger: 0.07,
  layout: true,
}
// Options rise in once their label has started, and glide the same way.
const option = {
  initial: { opacity: 0, y: 8, blur: 2 },
  stagger: 0.03,
  delay: 0.12,
  layout: true,
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
