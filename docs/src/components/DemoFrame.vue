<template>
  <div class="demo-list">
    <!-- The showpieces first, side by side on a wide screen, so nobody has to scroll for them. -->
    <template v-if="highlights.length">
      <p class="demo-group-label">{{ t('component.highlights') }}</p>
      <div class="demo-highlights" :data-count="highlights.length">
        <DemoExampleBlock
          v-for="example in highlights"
          :key="example.id"
          :name="name"
          :example="example"
          :show-title="examples.length > 1"
        />
      </div>
      <p v-if="rest.length" class="demo-group-label">{{ t('component.moreExamples') }}</p>
    </template>
    <DemoExampleBlock
      v-for="example in rest"
      :key="example.id"
      :name="name"
      :example="example"
      :show-title="examples.length > 1"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import DemoExampleBlock from './DemoExampleBlock.vue'

export interface DemoExample {
  id: string
  title: string
  vdomComponent: Component | null
  vaporComponent: Component | null
  vdomCode: string
  vaporCode: string
  /** One of the page's showpieces, listed first. */
  highlight?: boolean
}

const props = defineProps<{
  name: string
  examples: DemoExample[]
}>()
const { t } = useI18n()
const highlights = computed(() => props.examples.filter((example) => example.highlight))
const rest = computed(() => props.examples.filter((example) => !example.highlight))
</script>

<style scoped>
.demo-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  container-type: inline-size;
}

.demo-group-label {
  margin: 0 0 -1rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.demo-highlights {
  display: grid;
  gap: 2rem;
}

/* Two to a row once there's room for both to breathe. */
@container (min-width: 52rem) {
  .demo-highlights:not([data-count='1']) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
  }
}
</style>
