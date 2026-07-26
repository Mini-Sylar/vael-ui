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
          :is="toasterComponent"
          :position="position"
          :max-visible="maxVisible"
          :gap="gap"
        />
        <div class="trigger-row">
          <Button size="sm" @click="toast('Saved changes')">Default</Button>
          <Button size="sm" variant="outline" @click="toast.success('Upload complete')"
            >Success</Button
          >
          <Button size="sm" variant="outline" @click="toast.error('Something went wrong')"
            >Error</Button
          >
          <Button size="sm" variant="outline" @click="toast.warning('Storage almost full')"
            >Warning</Button
          >
          <Button size="sm" variant="outline" @click="toast.info('New version available')"
            >Info</Button
          >
        </div>
      </div>

      <div class="playground-controls">
        <div class="control-row">
          <label for="ctl-position">position</label>
          <Select
            id="ctl-position"
            size="sm"
            class="control-input"
            :items="positionItems"
            v-model="position"
          />
        </div>
        <div class="control-row">
          <label for="ctl-max-visible">maxVisible</label>
          <InputNumber
            id="ctl-max-visible"
            size="sm"
            class="control-input"
            :min="1"
            :max="8"
            v-model="maxVisible"
          />
        </div>
        <div class="control-row">
          <label for="ctl-gap">gap</label>
          <InputNumber
            id="ctl-gap"
            size="sm"
            class="control-input"
            :min="0"
            :max="32"
            v-model="gap"
          />
        </div>
      </div>
    </div>

    <CodeBlock lang="vue" :code="code" />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, type Component } from 'vue'
import * as VaelUi from 'vael-ui'
import * as VaelUiVapor from 'vael-ui/vapor'
import { Button, InputNumber, Select, SelectButton, toast } from 'vael-ui'
import type { ToasterPosition } from 'vael-ui'
import CodeBlock from '../components/CodeBlock.vue'
import { defaultVariant } from '../preferences'

const vaelUi = VaelUi as unknown as Record<string, Component>
const vaelUiVapor = VaelUiVapor as unknown as Record<string, Component>
// The imperative toast() queue is a plain composable, not a compiled
// component — it isn't re-exported from 'vael-ui/vapor' (only PascalCase
// component names are), so it's always imported from the base package
// regardless of which Toaster host is currently rendered.
const toasterComponent = computed<Component>(() =>
  defaultVariant.value === 'vapor' ? vaelUiVapor.Toaster : vaelUi.Toaster,
)

const position = shallowRef<ToasterPosition>('bottom-right')
const maxVisible = shallowRef(4)
const gap = shallowRef(10)

const positionItems = [
  { label: 'top-left', value: 'top-left' },
  { label: 'top-center', value: 'top-center' },
  { label: 'top-right', value: 'top-right' },
  { label: 'bottom-left', value: 'bottom-left' },
  { label: 'bottom-center', value: 'bottom-center' },
  { label: 'bottom-right', value: 'bottom-right' },
]

const code = computed(() => {
  const pkg = defaultVariant.value === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  return `import { toast, Toaster } from '${pkg}'

<Toaster position="${position.value}" :max-visible="${maxVisible.value}" :gap="${gap.value}" />

// anywhere in your app
toast('Saved changes')
toast.success('Upload complete')`
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
  padding: 3rem;
  display: flex;
  align-items: center;
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

.trigger-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
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
