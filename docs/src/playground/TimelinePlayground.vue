<template>
  <section class="playground">
    <div class="playground-toolbar">
      <SelectButton
        v-model="defaultVariant"
        size="sm"
        :allow-empty="false"
        :items="[
          { label: 'Vue DOM', value: 'vdom' },
          { label: 'Vapor', value: 'vapor' },
        ]"
      />
    </div>

    <div class="playground-body">
      <div class="playground-preview">
        <component
          :is="timelineComponent"
          :items="steps"
          :orientation="orientation"
          :motion-css="motionCss"
          :current="current"
        >
          <template v-if="showOpposite" #opposite="{ item }">{{ item.date }}</template>
          <template #item="{ item }">
            <p class="step-title">{{ item.label }}</p>
          </template>
        </component>
        <div class="trigger-row">
          <Button size="sm" variant="outline" :disabled="current === 0" @click="current--"
            >Back</Button
          >
          <Button size="sm" :disabled="current >= steps.length - 1" @click="current++"
            >Advance</Button
          >
        </div>
      </div>

      <div class="playground-controls">
        <div class="control-row">
          <label for="ctl-orientation">orientation</label>
          <Select
            id="ctl-orientation"
            size="sm"
            class="control-input"
            :items="orientationItems"
            v-model="orientation"
          />
        </div>
        <div class="control-row control-row--inline">
          <label for="ctl-opposite">show dates (#opposite)</label>
          <Switch id="ctl-opposite" v-model="showOpposite" />
        </div>
        <div class="control-row control-row--inline">
          <label for="ctl-motion">motionCss</label>
          <Switch id="ctl-motion" v-model="motionCss" />
        </div>
      </div>
    </div>

    <CodeBlock lang="vue" :code="code" />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, type Component } from 'vue'
import * as VaelUi from 'vael-ui'
import { Button, Select, SelectButton, Switch } from 'vael-ui'
import CodeBlock from '../components/CodeBlock.vue'
import { defaultVariant } from '../preferences'
import { useVaporComponents } from '../composables/useVaporComponents'

const vaelUi = VaelUi as unknown as Record<string, Component>
const vaelUiVapor = useVaporComponents()
const timelineComponent = computed<Component>(() =>
  defaultVariant.value === 'vapor' ? vaelUiVapor.value.Timeline : vaelUi.Timeline,
)

interface Step {
  label: string
  date: string
}
const steps: Step[] = [
  { label: 'Design', date: 'Mon' },
  { label: 'Build', date: 'Tue' },
  { label: 'Review', date: 'Wed' },
  { label: 'Ship', date: 'Thu' },
]

const current = shallowRef(1)

const orientation = shallowRef<'vertical' | 'horizontal'>('vertical')
const orientationItems = [
  { label: 'vertical', value: 'vertical' },
  { label: 'horizontal', value: 'horizontal' },
]
const showOpposite = shallowRef(true)
const motionCss = shallowRef(true)

const code = computed(() => {
  const pkg = defaultVariant.value === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  const oppositeSlot = showOpposite.value
    ? `\n  <template #opposite="{ item }">{{ item.date }}</template>`
    : ''
  return `import { Timeline } from '${pkg}'

<Timeline
  :items="steps"
  orientation="${orientation.value}"
  :motion-css="${motionCss.value}"
  :current="current"
>${oppositeSlot}
  <template #item="{ item }">{{ item.label }}</template>
</Timeline>`
})
</script>

<style scoped>
.playground {
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  overflow: hidden;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
}

.playground-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-muted);
}

.playground-body {
  display: grid;
  grid-template-columns: 1fr 15rem;
}

.playground-preview {
  position: relative;
  padding: 2.5rem 2.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: flex-start;
  justify-content: center;
  min-height: 9rem;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
}

.playground-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: radial-gradient(circle, var(--ui-border) 1px, transparent 1px);
  background-size: 20px 20px;
  mask-image: radial-gradient(ellipse at center, black 55%, transparent 100%);
}

.step-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
}

.trigger-row {
  display: flex;
  gap: 0.5rem;
}

.playground-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-left: 1px solid var(--ui-border);
  background: var(--ui-muted);
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.control-row--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.control-row label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ui-text-muted);
}

.control-input {
  width: 100%;
}

.playground :deep(.code-block) {
  border: none;
  border-radius: 0;
  border-top: 1px solid var(--ui-border);
}

@media (max-width: 700px) {
  .playground-body {
    grid-template-columns: 1fr;
  }
}
</style>
