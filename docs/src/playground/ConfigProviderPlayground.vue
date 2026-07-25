<template>
  <section class="playground">
    <div class="playground-preview">
      <ConfigProvider :theme="theme">
        <div class="preview-row">
          <Button>Save changes</Button>
          <Badge :count="3" />
          <Card title="Nested content">
            <p class="preview-text">Everything inside this ConfigProvider re-themes together.</p>
          </Card>
        </div>
      </ConfigProvider>
    </div>

    <div class="playground-controls">
      <div class="control-row">
        <label for="cp-color">primary</label>
        <span class="color-swatch">
          <input id="cp-color" :value="primary" type="color" @input="onColorInput" />
        </span>
      </div>
      <div class="control-row">
        <label for="cp-radius">radius</label>
        <Select
          id="cp-radius"
          size="sm"
          class="control-input"
          :items="radiusItems"
          :model-value="radius"
          @update:model-value="onRadiusChange"
        />
      </div>
    </div>

    <CodeBlock lang="vue" :code="code" />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Badge, Button, Card, ConfigProvider, Select } from 'vael-ui'
import CodeBlock from '../components/CodeBlock.vue'

const primary = shallowRef('#ea580c')
const radius = shallowRef('12px')

const radiusItems = [
  { label: 'Sharp (0px)', value: '0px' },
  { label: 'Soft (6px)', value: '6px' },
  { label: 'Rounded (12px)', value: '12px' },
  { label: 'Pill (999px)', value: '999px' },
]

function onColorInput(e: Event) {
  primary.value = (e.target as HTMLInputElement).value
}

function onRadiusChange(v: string | number | (string | number)[] | null) {
  if (typeof v === 'string') radius.value = v
}

const theme = computed(() => ({ primary: primary.value, radius: radius.value }))

const code = computed(
  () => `<ConfigProvider :theme="{ primary: '${primary.value}', radius: '${radius.value}' }">
  <YourApp />
</ConfigProvider>`,
)
</script>

<style scoped>
.playground {
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  overflow: hidden;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
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

.preview-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.preview-text {
  color: var(--ui-text-muted);
  font-size: 0.85rem;
  max-width: 16rem;
}

.playground-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--ui-border);
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
  width: 11rem;
}

.color-swatch {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid var(--ui-border);
  overflow: hidden;
  display: inline-flex;
  cursor: pointer;
}

.color-swatch input[type='color'] {
  width: 150%;
  height: 150%;
  border: none;
  padding: 0;
  cursor: pointer;
  transform: translate(-15%, -15%);
}

.playground :deep(.code-block) {
  border: none;
  border-radius: 0;
  border-top: 1px solid var(--ui-border);
}
</style>
