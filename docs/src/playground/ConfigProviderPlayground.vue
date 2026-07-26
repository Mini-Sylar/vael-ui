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
        <component :is="ConfigProviderComp" :theme="theme">
          <div class="preview-row">
            <component :is="ButtonComp">Save changes</component>
            <component :is="BadgeComp" :count="3" />
            <component :is="CardComp" title="Nested content">
              <p class="preview-text">Everything inside this ConfigProvider re-themes together.</p>
            </component>
          </div>
        </component>
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
    </div>

    <CodeBlock lang="vue" :code="code" />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, type Component } from 'vue'
import * as VaelUi from 'vael-ui'
import { Select, SelectButton } from 'vael-ui'
import CodeBlock from '../components/CodeBlock.vue'
import { defaultVariant } from '../preferences'
import { useVaporComponents } from '../composables/useVaporComponents'

const vaelUi = VaelUi as unknown as Record<string, Component>
const vaelUiVapor = useVaporComponents()
function pick(name: string): Component {
  return defaultVariant.value === 'vapor' ? vaelUiVapor.value[name] : vaelUi[name]
}
const ConfigProviderComp = computed(() => pick('ConfigProvider'))
const ButtonComp = computed(() => pick('Button'))
const BadgeComp = computed(() => pick('Badge'))
const CardComp = computed(() => pick('Card'))

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

@media (max-width: 700px) {
  .playground-body {
    grid-template-columns: 1fr;
  }
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
