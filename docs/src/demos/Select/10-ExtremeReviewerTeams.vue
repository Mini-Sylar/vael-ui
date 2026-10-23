<template>
  <section class="demo">
    <h3>Extreme: reviewers by team, with picks per team in the label</h3>
    <p class="note">
      Each team brings its own <code>color</code> and <code>channel</code>.
      <code>#group-label</code> turns them into a coloured header that counts how many of the team
      you've picked, read from your own <code>v-model</code>. <code>#item</code> also gets the
      option's <code>group</code>, so each person's avatar takes their team's colour. The label is
      also the group's name for screen readers, so they hear the team, its channel and "1 of 3
      picked". A <code>v-animate</code> with <code>replay</code> nudges each tally as you pick.
    </p>
    <div class="row">
      <Field label="Reviewers">
        <Select
          v-model="reviewers"
          :items="teams"
          multiple
          filter
          placeholder="Add reviewers"
          :ui="{
            panel: { style: { minInlineSize: '20rem' } },
            group: 'team-group',
            groupLabel: 'team-label',
          }"
        >
          <template #group-label="{ group }">
            <span class="team-dot" :style="{ background: group.color }" aria-hidden="true" />
            <span class="team-name">{{ group.label }}</span>
            <span class="team-channel">{{ group.channel }}</span>
            <span
              v-animate="{ initial: { scale: 1.15 }, replay: pickedIn(group.items) }"
              class="team-picked"
              :data-any="pickedIn(group.items) > 0 || undefined"
            >
              {{ pickedIn(group.items) }} of {{ group.items.length }} picked
            </span>
          </template>
          <template #item="{ item, selected, group }">
            <span class="person-avatar" :style="{ background: group?.color }" aria-hidden="true">{{
              initials(item.label)
            }}</span>
            <span class="person-name">
              {{ item.label }}
              <small>{{ item.role }}</small>
            </span>
            <PhCheck
              v-if="selected"
              v-animate="tick"
              class="person-check"
              weight="bold"
              aria-hidden="true"
            />
          </template>
        </Select>
      </Field>
      <output class="panel-text">{{ reviewers.length }} reviewer(s)</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Select, vAnimate } from 'vael-ui'
import { PhCheck } from '@phosphor-icons/vue'

const teams = [
  {
    label: 'Design',
    color: 'oklch(0.55 0.2 330)',
    channel: '#design-crit',
    items: [
      { label: 'Alex Morgan', value: 'alex', role: 'Lead' },
      { label: 'Sam Rivera', value: 'sam', role: 'Product' },
      { label: 'Jamie Lee', value: 'jamie', role: 'Intern' },
    ],
  },
  {
    label: 'Engineering',
    color: 'oklch(0.52 0.18 255)',
    channel: '#eng-review',
    items: [
      { label: 'Jordan Kim', value: 'jordan', role: 'Staff' },
      { label: 'Taylor Brooks', value: 'taylor', role: 'Frontend' },
      { label: 'Casey Patel', value: 'casey', role: 'Platform' },
      { label: 'Riley Chen', value: 'riley', role: 'Mobile' },
    ],
  },
  {
    label: 'Security',
    color: 'oklch(0.56 0.15 45)',
    channel: '#sec-signoff',
    items: [
      { label: 'Morgan Diaz', value: 'morgan', role: 'AppSec' },
      { label: 'Drew Collins', value: 'drew', role: 'Compliance', disabled: true },
    ],
  },
]

// The tick springs in when someone is picked; each team's tally nudges as it changes.
const tick = {
  initial: { opacity: 0, scale: 0.9, x: -4 },
  spring: { damping: 0.6, response: 0.35 },
}

const reviewers = shallowRef<string[]>(['alex', 'jordan'])

const pickedIn = (items: readonly { value: string }[]) =>
  items.filter((p) => reviewers.value.includes(p.value)).length
const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => [...part][0])
    .slice(0, 2)
    .join('')
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.team-dot {
  flex: none;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 50%;
}
.team-name {
  color: var(--ui-text);
}
.team-channel {
  font-weight: 400;
}
.team-picked {
  margin-inline-start: auto;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.team-picked[data-any] {
  color: var(--ui-text);
  font-weight: 600;
}
.person-avatar {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  border-radius: 50%;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
}
.person-name {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-name small {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.person-check {
  flex: none;
}
</style>

<!-- The panel is teleported, so vael-ui's own parts are styled from here, outside the scoped styles. -->
<style>
.team-group + .team-group {
  border-block-start: 1px solid var(--ui-border);
  padding-block-start: 0.25rem;
}
.team-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
</style>
