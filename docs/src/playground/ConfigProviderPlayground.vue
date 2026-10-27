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
        <component :is="ConfigProviderComp" :theme="theme" :size="size" :motion="motion">
          <div class="preview-row">
            <component :is="InputComp" placeholder="Search" class="preview-input" />
            <component :is="SwitchComp" v-model="switchOn" aria-label="Notifications" />
            <component :is="ButtonComp">Save changes</component>
            <component :is="BadgeComp" :count="3" />
            <component :is="CardComp" title="Nested content">
              <p class="preview-text">Everything inside this ConfigProvider uses its theme.</p>
            </component>
          </div>
        </component>
      </div>

      <div class="playground-controls">
        <div class="control-row">
          <label for="cp-color">primary</label>
          <ColorPicker id="cp-color" v-model="primary" size="sm" label="primary" />
        </div>
        <div class="control-row">
          <label id="cp-radius-label" for="cp-radius">radius</label>
          <Select
            id="cp-radius"
            aria-labelledby="cp-radius-label"
            size="sm"
            class="control-input"
            :items="radiusItems"
            :model-value="radius"
            @update:model-value="onRadiusChange"
          />
        </div>
        <div class="control-row">
          <label id="cp-font-size-label" for="cp-font-size">fontSize</label>
          <Select
            id="cp-font-size"
            aria-labelledby="cp-font-size-label"
            size="sm"
            class="control-input"
            :items="fontSizeItems"
            :model-value="fontSize"
            @update:model-value="onFontSizeChange"
          />
        </div>
        <div class="control-row">
          <label id="cp-size-label" for="cp-size">size</label>
          <Select
            id="cp-size"
            aria-labelledby="cp-size-label"
            size="sm"
            class="control-input"
            :items="sizeItems"
            :model-value="size"
            @update:model-value="onSizeChange"
          />
        </div>
        <div class="control-row">
          <label for="cp-motion">motion</label>
          <Switch id="cp-motion" v-model="motion" size="sm" aria-label="motion" />
        </div>
      </div>
    </div>

    <CodeBlock lang="vue" :code="code" />
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, type Component } from 'vue'
import * as VaelUi from 'vael-ui'
import { ColorPicker, Select, SelectButton, Switch } from 'vael-ui'
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
const InputComp = computed(() => pick('Input'))
const SwitchComp = computed(() => pick('Switch'))

const primary = shallowRef('#ea580c')
const radius = shallowRef('12px')
const fontSize = shallowRef('14px')
const size = shallowRef<'sm' | 'md' | 'lg'>('md')
const motion = shallowRef(true)
const switchOn = shallowRef(true)
const sizeItems = [
  { label: 'sm', value: 'sm' },
  { label: 'md', value: 'md' },
  { label: 'lg', value: 'lg' },
]

function onSizeChange(v: string | number | (string | number)[] | null) {
  if (v === 'sm' || v === 'md' || v === 'lg') size.value = v
}

const radiusItems = [
  { label: 'Sharp (0px)', value: '0px' },
  { label: 'Soft (6px)', value: '6px' },
  { label: 'Rounded (12px)', value: '12px' },
  { label: 'Pill (999px)', value: '999px' },
]
const fontSizeItems = [
  { label: 'Small (12px)', value: '12px' },
  { label: 'Default (14px)', value: '14px' },
  { label: 'Comfortable (16px)', value: '16px' },
  { label: 'Large (18px)', value: '18px' },
]

function onRadiusChange(v: string | number | (string | number)[] | null) {
  if (typeof v === 'string') radius.value = v
}

function onFontSizeChange(v: string | number | (string | number)[] | null) {
  if (typeof v === 'string') fontSize.value = v
}

const theme = computed(() => ({
  primary: primary.value,
  radius: radius.value,
  fontSize: fontSize.value,
}))

const code = computed(() => {
  const attrs = [
    `:theme="{ primary: '${primary.value}', radius: '${radius.value}', fontSize: '${fontSize.value}' }"`,
    size.value !== 'md' ? `size="${size.value}"` : '',
    motion.value ? '' : ':motion="false"',
  ].filter(Boolean)
  return `<ConfigProvider\n  ${attrs.join('\n  ')}\n>\n  <YourApp />\n</ConfigProvider>`
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

.preview-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.preview-input {
  max-inline-size: 10rem;
}

.preview-text {
  color: var(--ui-text-muted);
  font-size: calc(var(--ui-font-size) * 0.85);
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

.playground :deep(.code-block) {
  border: none;
  border-radius: 0;
  border-top: 1px solid var(--ui-border);
}
</style>
