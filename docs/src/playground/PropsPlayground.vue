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
        <p v-if="needsContext" class="playground-error">{{ needsContext }}</p>
        <PlaygroundErrorBoundary v-else :reset-key="resetKey">
          <template v-if="isOpenModel">
            <Button variant="outline" @click="openModelValue = !openModelValue">
              {{ openModelValue ? `Close ${name}` : `Open ${name}` }}
            </Button>
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              v-model:open="openModelValue"
            >
              <p class="playground-placeholder-copy">{{ OPEN_MODEL_PLACEHOLDER[name] }}</p>
            </component>
          </template>
          <template v-else-if="isContextArea">
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              v-model:open="openModelValue"
            >
              <div class="context-area-target">Right-click here</div>
            </component>
          </template>
          <template v-else-if="isRadioWrap">
            <RadioGroup v-model="radioGroupValue">
              <component
                :is="activeComponent"
                :key="resetKey"
                v-bind="boundProps"
                value="playground-option"
              />
            </RadioGroup>
          </template>
          <template v-else>
            <!-- No slot content at all here on purpose — some components use
                 their default slot to override a computed fallback display
                 (Avatar's initials, Badge's count, Chip/Checkbox/Switch's own
                 label), so even an empty conditional slot would suppress it. -->
            <component
              v-if="suppressDefaultSlot"
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              @update:model-value="onModelUpdate"
            />
            <component
              v-else
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              @update:model-value="onModelUpdate"
            >
              <template v-if="hasTriggerSlot" #trigger>
                <Button>Trigger</Button>
              </template>
              <PhStar v-if="showIconPreview" :size="16" weight="fill" />
              <template v-else>{{ name }}</template>
            </component>
          </template>
        </PlaygroundErrorBoundary>
      </div>

      <div v-if="controls.length > 0 || hasItemsProp" class="playground-controls">
        <div v-if="hasItemsProp" class="control-row">
          <label for="ctl-data-preset">Data</label>
          <Select
            id="ctl-data-preset"
            size="sm"
            class="control-input"
            :items="presetItems"
            v-model="dataPreset"
          />
        </div>

        <div v-for="control in controls" :key="control.name" class="control-row">
          <label :for="`ctl-${control.name}`">
            {{ control.name }}
            <RouterLink
              v-if="CONTROL_HELP[control.name]"
              to="/docs/guides/animation-integration"
              v-tooltip="CONTROL_HELP[control.name]"
              class="control-hint"
              >?</RouterLink
            >
          </label>

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
    </div>

    <CodeBlock lang="vue" :code="code" />
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef, watch, watchEffect, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { PhStar } from '@phosphor-icons/vue'
import * as VaelUi from 'vael-ui'
import * as VaelUiVapor from 'vael-ui/vapor'
import { Button, Input, InputNumber, RadioGroup, Select, SelectButton, Switch } from 'vael-ui'
import type { TreeNode } from 'vael-ui'
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
// children with real data) and throw immediately when mounted standalone,
// even wrapped. No combination of props fixes that, so there's nothing
// useful a generic playground can render. Examples below show them in
// their real context. Radio used to be here too — it only needs a single
// sibling to become clickable, so it gets a real (if minimal) RadioGroup
// wrapper below instead of a message.
const NEEDS_CONTEXT: Record<string, string> = {
  AccordionItem: 'AccordionItem only renders inside an Accordion. See the examples below.',
  Column: 'Column only renders inside a DataTable’s tree. See the examples below.',
  DataTable:
    'DataTable needs real data and <Column> children to show anything useful. See the examples below.',
}
const needsContext = computed(() => NEEDS_CONTEXT[props.name] ?? null)

const OPEN_MODEL_COMPONENTS = ['Dialog', 'BottomSheet']
const CONTEXT_AREA_COMPONENTS = ['ContextMenu']
const OPEN_MODEL_PLACEHOLDER: Record<string, string> = {
  Dialog: 'This is the dialog body. Put any content here.',
  BottomSheet: 'This is the sheet body. Put any content here.',
}
const isOpenModel = computed(() => OPEN_MODEL_COMPONENTS.includes(props.name))
const isContextArea = computed(() => CONTEXT_AREA_COMPONENTS.includes(props.name))
const isRadioWrap = computed(() => props.name === 'Radio')
const showIconPreview = computed(() => props.name === 'Button' && values.icon === true)

// These render `<slot>{{ someComputedFallback }}</slot>` internally (Avatar's
// initials, Badge's count, Chip/Checkbox/Switch's own label) — passing any
// default-slot content at all, even the generic component-name text, would
// silently override that fallback and show the wrong thing.
const NO_DEFAULT_SLOT = ['Avatar', 'Badge', 'Chip', 'Checkbox', 'Switch']
const suppressDefaultSlot = computed(() => NO_DEFAULT_SLOT.includes(props.name))

const openModelValue = shallowRef(false)
const radioGroupValue = shallowRef<string | number | null>(null)

const CONTROL_HELP: Record<string, string> = {
  motionCss:
    'Turn off the built-in CSS transition to animate this yourself with GSAP, motion-v, or plain CSS.',
  forceMount:
    'Keeps this in the DOM while closed, so an external animation library controls the exit instead of Vue removing it.',
}

interface NamedControl {
  name: string
  kind: PlaygroundControl['kind']
  options: string[]
}

// A few components need an override stronger than type-inference alone can
// give: a free-form CSS-length string that reads better as presets
// (Loader's size), or a seed value picked for a good first impression
// rather than the generic empty/zero default (Avatar's name, Pagination's
// total). Scoped per component — a blanket override by prop name alone
// would collide with unrelated props sharing the same name elsewhere
// (`name` is a form field attribute on Input/Select/RadioGroup, not a
// display name).
const COMPONENT_OVERRIDES: Record<
  string,
  {
    string?: Record<string, string>
    number?: Record<string, number>
    select?: Record<string, string[]>
  }
> = {
  Avatar: { string: { name: 'Ada Lovelace' } },
  Loader: { select: { size: ['1rem', '1.5rem', '2rem'] } },
  Pagination: { number: { total: 132 } },
  Badge: { number: { count: 5 } },
  Chip: { string: { label: 'Chip label' } },
  Checkbox: { string: { label: 'Checkbox label' } },
  Switch: { string: { label: 'Switch label' } },
}

const controls = computed<NamedControl[]>(() => {
  if (!meta.value) return []
  const overrides = COMPONENT_OVERRIDES[props.name]
  // `open`/`maximized` are named v-models this file drives directly
  // (the dedicated trigger button, the right-click area) — a generic
  // boolean control for them would look like it does something and not.
  const skipOpenModel = isOpenModel.value || isContextArea.value
  const list: NamedControl[] = []
  for (const prop of meta.value.props) {
    if (prop.name === 'modelValue') continue
    if (skipOpenModel && (prop.name === 'open' || prop.name === 'maximized')) continue
    const selectOverride = overrides?.select?.[prop.name]
    if (selectOverride) {
      list.push({ name: prop.name, kind: 'select', options: selectOverride })
      continue
    }
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
const isTreeShaped = computed(() => props.name === 'Tree' || props.name === 'TreeSelect')

const FLAT_PRESETS: Record<
  string,
  { label: string; value: string | number; disabled?: boolean }[]
> = {
  Fruits: [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
    { label: 'Date', value: 'date' },
    { label: 'Elderberry', value: 'elderberry' },
  ],
  Countries: [
    { label: 'Canada', value: 'ca' },
    { label: 'Germany', value: 'de' },
    { label: 'Japan', value: 'jp' },
    { label: 'Kenya', value: 'ke' },
    { label: 'Peru', value: 'pe' },
  ],
  'With a disabled option': [
    { label: 'Available', value: 'available' },
    { label: 'Sold out', value: 'sold-out', disabled: true },
    { label: 'Backordered', value: 'backordered' },
  ],
  'Long list (60)': Array.from({ length: 60 }, (_, i) => ({
    label: `Item ${i + 1}`,
    value: i + 1,
  })),
}

const TREE_PRESETS: Record<string, TreeNode[]> = {
  'Project files': [
    {
      label: 'src',
      value: 'src',
      children: [
        {
          label: 'components',
          value: 'src/components',
          children: [
            { label: 'Button.vue', value: 'src/components/Button.vue' },
            { label: 'Input.vue', value: 'src/components/Input.vue' },
          ],
        },
        { label: 'index.ts', value: 'src/index.ts' },
      ],
    },
    { label: 'package.json', value: 'package.json' },
    { label: 'README.md', value: 'README.md' },
  ],
}

const presetItems = computed(() =>
  Object.keys(isTreeShaped.value ? TREE_PRESETS : FLAT_PRESETS).map((key) => ({
    label: key,
    value: key,
  })),
)
const dataPreset = shallowRef(presetItems.value[0]?.value ?? '')

// A handful of string props crash when seeded with '' (the normal "string"
// control default) because the component passes them straight into a
// browser API that rejects an empty value. Calendar's `locale` hits
// `new Intl.DateTimeFormat('')`, which throws. Named exceptions beat a
// generic fallback here since the failure mode is API-specific, not a
// pattern that generalizes.
const STRING_DEFAULT_OVERRIDES: Record<string, string> = {
  locale: 'en-US',
}

// Required numeric props with no declared default (Resizable's `size`), or
// optional ones that default to `undefined` on purpose (Progress's `value`,
// which reads as indeterminate whenever it's not set), otherwise seed to 0,
// which looks broken or perpetually indeterminate rather than just plain.
const NUMBER_DEFAULT_OVERRIDES: Record<string, number> = {
  size: 150,
  value: 60,
}

const values = reactive<Record<string, unknown>>({})

watch(
  () => props.name,
  () => {
    openModelValue.value = false
    radioGroupValue.value = null
    dataPreset.value = presetItems.value[0]?.value ?? ''
  },
  { immediate: true },
)

watchEffect(() => {
  for (const key of Object.keys(values)) delete values[key]

  const overrides = COMPONENT_OVERRIDES[props.name]
  const modelValueProp = meta.value?.props.find((p) => p.name === 'modelValue')
  if (modelValueProp) {
    const control = inferControl(modelValueProp.schema)
    values.modelValue = control ? defaultControlValue(control, modelValueProp.default) : null
  }

  for (const control of controls.value) {
    const propMeta = meta.value?.props.find((p) => p.name === control.name)
    if (control.kind === 'string' && overrides?.string?.[control.name] !== undefined) {
      values[control.name] = overrides.string[control.name]
    } else if (control.kind === 'number' && overrides?.number?.[control.name] !== undefined) {
      values[control.name] = overrides.number[control.name]
    } else if (control.kind === 'string' && STRING_DEFAULT_OVERRIDES[control.name] !== undefined) {
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
  ...(hasItemsProp.value
    ? {
        items: isTreeShaped.value ? TREE_PRESETS[dataPreset.value] : FLAT_PRESETS[dataPreset.value],
      }
    : {}),
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
  gap: 1rem;
  flex-wrap: wrap;
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

.playground-placeholder-copy {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
}

.context-area-target {
  display: grid;
  place-items: center;
  inline-size: 12rem;
  block-size: 6rem;
  border: 1px dashed var(--ui-border-strong);
  border-radius: var(--docs-radius);
  color: var(--ui-text-muted);
  font-size: 0.85rem;
  user-select: none;
}

.playground-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-left: 1px solid var(--ui-border);
  background: var(--ui-muted);
  overflow-y: auto;
  max-height: 28rem;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.control-row label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ui-text-muted);
}

.control-hint {
  display: inline-grid;
  place-items: center;
  inline-size: 0.9rem;
  block-size: 0.9rem;
  border-radius: 50%;
  border: 1px solid var(--ui-border-strong);
  color: var(--ui-text-muted);
  font-size: 0.6rem;
  text-transform: none;
  letter-spacing: normal;
  text-decoration: none;
  cursor: help;
}

.control-input {
  width: 100%;
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

@media (max-width: 700px) {
  .playground-body {
    grid-template-columns: 1fr;
  }

  .playground-controls {
    flex-direction: row;
    flex-wrap: wrap;
    border-left: none;
    border-top: 1px solid var(--ui-border);
    max-height: none;
  }

  .control-input {
    width: 9rem;
  }
}
</style>
