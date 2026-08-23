<template>
  <section class="demo">
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
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Card, Tour } from 'vael-ui'
import type { TourStep } from 'vael-ui'

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
