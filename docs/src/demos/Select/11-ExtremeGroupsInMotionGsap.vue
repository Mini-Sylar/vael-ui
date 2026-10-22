<template>
  <section class="demo">
    <h3>Extreme: groups in motion (GSAP)</h3>
    <p class="note">
      Every group is a real element (<code>ui.group</code>), so is its label
      (<code>ui.groupLabel</code>) and each option (<code>ui.option</code>), and a
      <code>motion</code> object hands GSAP the panel. That's all it needs. On open, each label
      wipes in behind its accent bar and its options rise in after it. While you search, the options
      and labels that stay glide to their new places, because a search keeps each one on its own
      element: a small FLIP, measured inside the list so it stays right while the panel resizes.
      Each count pops when it changes. Closing gives the panel a quick fade. With reduced motion, it
      all switches off.
    </p>
    <div class="row">
      <Field label="Tool">
        <Select
          ref="select"
          v-model="tool"
          v-model:open="open"
          v-model:query="query"
          :items="toolGroups"
          filter
          :motion="groupsInMotion"
          placeholder="Pick a tool"
          :ui="{
            panel: { style: { minInlineSize: '18rem' } },
            group: 'motion-group',
            groupLabel: 'motion-label',
            option: 'motion-option',
          }"
        >
          <template #group-label="{ group, items: shown }">
            <span class="accent" :style="{ background: group.accent }" aria-hidden="true" />
            <span class="name">{{ group.label }}</span>
            <span :key="shown.length" class="count">{{ shown.length }}</span>
          </template>
          <template #item="{ item, selected, group }">
            <component
              :is="group?.icon"
              class="tool-icon"
              :style="{ color: group?.accent }"
              aria-hidden="true"
            />
            <span class="tool-name">{{ item.label }}</span>
            <PhCheck v-if="selected" weight="bold" aria-hidden="true" />
          </template>
        </Select>
      </Field>
      <output class="panel-text">{{ tool ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { Field, Select } from 'vael-ui'
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

const select = useTemplateRef<{ panelEl: HTMLElement | null }>('select')
const tool = shallowRef<string | null>(null)
const open = shallowRef(false)
const query = shallowRef('')

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const panel = () => select.value?.panelEl ?? null
const all = (selector: string) => [...(panel()?.querySelectorAll<HTMLElement>(selector) ?? [])]

const groupsInMotion: SelectMotion = {
  enter({ panel: el }) {
    // fromTo sets each start at once, so nothing shows at rest before its turn.
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
    timeline.fromTo(el, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.22 })
    el.querySelectorAll('.motion-group').forEach((group, i) => {
      const at = 0.06 + i * 0.07
      timeline.fromTo(
        group.querySelector('.motion-label'),
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: 0.3 },
        at,
      )
      timeline.from(
        group.querySelector('.accent'),
        { scaleY: 0, transformOrigin: 'top', duration: 0.3 },
        at,
      )
      timeline.fromTo(
        group.querySelectorAll('.motion-option'),
        { opacity: 0, y: 8, filter: 'blur(2px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.26, stagger: 0.03 },
        at + 0.05,
      )
    })
    return timeline
  },
  leave: ({ panel: el }) =>
    gsap.to(el, { opacity: 0, scale: 0.97, duration: 0.15, ease: 'power2.out' }),
}

// Search: FLIP measured inside the list, not on the page, because the panel itself moves as it
// shrinks or grows and page positions would glide from the wrong place.
const moving = '.motion-option, .motion-label'
function positions(): Map<HTMLElement, number> {
  const list = panel()?.querySelector<HTMLElement>('[role="listbox"]')
  const at = new Map<HTMLElement, number>()
  if (!list) return at
  // From the list's visible edge, so a search that resets its scroll still glides from what you saw.
  const top = list.getBoundingClientRect().top
  for (const el of all(moving)) at.set(el, el.getBoundingClientRect().top - top)
  return at
}
let before = new Map<HTMLElement, number>()
watch(
  query,
  () => {
    if (open.value && !reducedMotion()) before = positions()
  },
  { flush: 'pre' },
)
watch(
  query,
  () => {
    if (!before.size) return
    // Measure where things land, not where a running glide has them.
    gsap.killTweensOf(all(moving))
    gsap.set(all(moving), { y: 0 })
    for (const [el, now] of positions()) {
      const was = before.get(el)
      if (was === undefined) {
        gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.22, overwrite: true })
      } else if (Math.abs(was - now) > 0.5) {
        // `was` includes any glide still running, so a fast typist's next key carries on from there.
        gsap.fromTo(
          el,
          { y: was - now },
          { y: 0, duration: 0.3, ease: 'power3.out', overwrite: true },
        )
      }
    }
    before = new Map()
  },
  { flush: 'post' },
)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.accent {
  flex: none;
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
  animation: count-pop 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tool-icon {
  flex: none;
}
.tool-name {
  flex: 1;
  min-inline-size: 0;
}
@keyframes count-pop {
  from {
    transform: scale(1.5);
    color: var(--ui-text);
  }
}
@media (prefers-reduced-motion: reduce) {
  .count {
    animation: none;
  }
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
