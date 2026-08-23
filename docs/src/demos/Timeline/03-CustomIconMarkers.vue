<template>
  <section class="demo">
    <h3>Custom icon markers via <code>#marker</code></h3>
    <p class="note">
      The default dot is just what renders when <code>#marker</code> is left empty — swap in
      anything, including per-item icons.
    </p>
    <Timeline :items="checks" :completed="(check) => check.passed">
      <template #marker="{ completed }">
        <PhCheckCircle v-if="completed" weight="fill" class="marker-icon marker-icon--done" />
        <PhCircleDashed v-else class="marker-icon marker-icon--pending" />
      </template>
      <template #item="{ item }">
        <p class="step-title">{{ item.name }}</p>
      </template>
    </Timeline>
  </section>
</template>

<script setup lang="ts">
import { Timeline } from 'vael-ui'
import { PhCheckCircle, PhCircleDashed } from '@phosphor-icons/vue'

interface Check {
  name: string
  passed: boolean
}

const checks: Check[] = [
  { name: 'Lint', passed: true },
  { name: 'Typecheck', passed: true },
  { name: 'Unit tests', passed: false },
  { name: 'Deploy preview', passed: false },
]
</script>

<style scoped>
.step-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
}
.marker-icon {
  inline-size: 1.25rem;
  block-size: 1.25rem;
}
.marker-icon--done {
  color: var(--ui-success);
}
.marker-icon--pending {
  color: var(--ui-text-muted);
}
</style>
