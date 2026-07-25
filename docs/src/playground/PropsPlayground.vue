<template>
  <section class="playground">
    <div class="playground-preview">
      <p v-if="needsContext" class="playground-error">{{ needsContext }}</p>
      <PlaygroundErrorBoundary v-else :reset-key="resetKey">
        <component :is="activeComponent" v-bind="boundProps" @update:model-value="onModelUpdate">
          <template v-if="hasTriggerSlot" #trigger>
            <Button>Trigger</Button>
          </template>
          {{ name }}
        </component>
      </PlaygroundErrorBoundary>
    </div>

    <div v-if="controls.length > 0" class="playground-controls">
      <div v-for="control in controls" :key="control.name" class="control-row">
        <label :for="`ctl-${control.name}`">{{ control.name }}</label>

        <Switch
          v-if="control.kind === 'boolean'"
          :id="`ctl-${control.name}`"
          :model-value="values[control.name] as boolean"
          @update:model-value="(v) => (values[control.name] = v)"
        />
        <Select
          v-else-if="control.kind === 'select'"
          :id="`ctl-${control.name}`"
          size="sm"
          class="control-input"
          :items="control.options.map((o) => ({ label: o, value: o }))"
          :model-value="values[control.name] as string"
          @update:model-value="(v) => (values[control.name] = v)"
        />
        <InputNumber
          v-else-if="control.kind === 'number'"
          :id="`ctl-${control.name}`"
          size="sm"
          class="control-input"
          :model-value="values[control.name] as number"
          @update:model-value="(v) => (values[control.name] = v)"
        />
        <Input
          v-else
          :id="`ctl-${control.name}`"
          size="sm"
          class="control-input"
          :model-value="values[control.name] as string"
          @update:model-value="(v) => (values[control.name] = v)"
        />
      </div>
    </div>
    <p v-else class="no-controls">
      This component has no simple props to try live. See the examples below.
    </p>

    <CodeBlock lang="vue" :code="code" />
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef, watchEffect, type Component } from 'vue'
import * as VaelUi from 'vael-ui'
import * as VaelUiVapor from 'vael-ui/vapor'
import { Button, Input, InputNumber, Select, Switch } from 'vael-ui'
import CodeBlock from '../components/CodeBlock.vue'
import PlaygroundErrorBoundary from './PlaygroundErrorBoundary.vue'
import { inferControl, defaultControlValue, type PlaygroundControl } from './inferControl'
import componentMeta from '../generated/component-meta.json'
import type { ComponentMetaEntry } from '../types'
import { defaultVariant } from '../preferences'

const props = defineProps<{ name: string }>()

const meta = computed(() => (componentMeta as Record<string, ComponentMetaEntry>)[props.name])

const vaelUiVapor = VaelUiVapor as unknown as Record<string, Component | undefined>
const vaelUi = VaelUi as unknown as Record<string, Component | undefined>

const activeComponent = computed<Component | null>(() => {
  const vaporExport = vaelUiVapor[props.name]
  if (defaultVariant.value === 'vapor' && vaporExport) return vaporExport
  return vaelUi[props.name] ?? null
})

// These read parent state via provide/inject (or need slot-composed
// children with real data) and throw immediately when mounted standalone.
// No combination of props fixes that, so there's nothing useful a generic
// playground can render. Examples below show them in their real context.
const NEEDS_CONTEXT: Record<string, string> = {
  Radio: 'Radio only renders meaningfully inside a RadioGroup. See the examples below.',
  AccordionItem: 'AccordionItem only renders inside an Accordion. See the examples below.',
  Column: 'Column only renders inside a DataTable’s tree. See the examples below.',
  DataTable:
    'DataTable needs real data and <Column> children to show anything useful. See the examples below.',
}
const needsContext = computed(() => NEEDS_CONTEXT[props.name] ?? null)

interface NamedControl {
  name: string
  kind: PlaygroundControl['kind']
  options: string[]
}

const controls = computed<NamedControl[]>(() => {
  if (!meta.value) return []
  const list: NamedControl[] = []
  for (const prop of meta.value.props) {
    if (prop.name === 'modelValue') continue
    const control = inferControl(prop.schema)
    if (!control) continue
    list.push({
      name: prop.name,
      kind: control.kind,
      options: control.kind === 'select' ? control.options : [],
    })
  }
  return list
})

const hasItemsProp = computed(() => Boolean(meta.value?.props.some((p) => p.name === 'items')))
const hasTriggerSlot = computed(() => Boolean(meta.value?.slots.some((s) => s.name === 'trigger')))

const SEED_ITEMS = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
]

// A handful of string props crash when seeded with '' (the normal "string"
// control default) because the component passes them straight into a
// browser API that rejects an empty value. Calendar's `locale` hits
// `new Intl.DateTimeFormat('')`, which throws. Named exceptions beat a
// generic fallback here since the failure mode is API-specific, not a
// pattern that generalizes.
const STRING_DEFAULT_OVERRIDES: Record<string, string> = {
  locale: 'en-US',
}

// Required numeric props with no declared default (Resizable's `size`)
// otherwise seed to 0, which looks broken rather than just plain.
const NUMBER_DEFAULT_OVERRIDES: Record<string, number> = {
  size: 150,
}

const values = reactive<Record<string, unknown>>({})

watchEffect(() => {
  for (const key of Object.keys(values)) delete values[key]

  const modelValueProp = meta.value?.props.find((p) => p.name === 'modelValue')
  if (modelValueProp) {
    const control = inferControl(modelValueProp.schema)
    values.modelValue = control ? defaultControlValue(control, modelValueProp.default) : null
  }

  for (const control of controls.value) {
    const propMeta = meta.value?.props.find((p) => p.name === control.name)
    if (control.kind === 'string' && STRING_DEFAULT_OVERRIDES[control.name] !== undefined) {
      values[control.name] = STRING_DEFAULT_OVERRIDES[control.name]
    } else if (
      control.kind === 'number' &&
      propMeta?.default === undefined &&
      NUMBER_DEFAULT_OVERRIDES[control.name] !== undefined
    ) {
      values[control.name] = NUMBER_DEFAULT_OVERRIDES[control.name]
    } else {
      values[control.name] = defaultControlValue(control, propMeta?.default)
    }
  }
})

const boundProps = computed(() => ({
  ...values,
  ...(hasItemsProp.value ? { items: SEED_ITEMS } : {}),
}))

function onModelUpdate(v: unknown) {
  values.modelValue = v
}

const resetKey = computed(() => `${props.name}:${defaultVariant.value}`)

const code = computed(() => {
  if (!meta.value) return ''
  const attrs = controls.value
    .map((c) => {
      const v = values[c.name]
      if (c.kind === 'boolean') return v ? c.name : `:${c.name}="false"`
      if (c.kind === 'number') return `:${c.name}="${v}"`
      return `${c.name}="${v}"`
    })
    .join(' ')
  const itemsAttr = hasItemsProp.value ? ' :items="items"' : ''
  const openTag = [props.name, attrs, itemsAttr].filter(Boolean).join(' ').replace(/ +/g, ' ')
  const pkg = defaultVariant.value === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  return `import { ${props.name} } from '${pkg}'\n\n<${openTag}>${props.name}</${props.name}>`
})
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
  /* Same reasoning as DemoFrame's .demo-preview: show the component's real
     default look, not the docs chrome's own Geist Variable branding. */
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
  width: 9rem;
}

.no-controls {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--ui-border);
  color: var(--ui-text-muted);
  font-size: 0.85rem;
}

.playground-error {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
  text-align: center;
  max-width: 24rem;
}

.playground :deep(.code-block) {
  border: none;
  border-radius: 0;
  border-top: 1px solid var(--ui-border);
}
</style>
