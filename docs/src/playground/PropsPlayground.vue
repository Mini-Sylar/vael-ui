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
            <component :is="radioGroupComponent" v-model="radioGroupValue">
              <component
                :is="activeComponent"
                :key="resetKey"
                v-bind="boundProps"
                value="playground-option"
              />
            </component>
          </template>
          <template v-else-if="isRadioGroup">
            <component :is="activeComponent" :key="resetKey" v-bind="boundProps">
              <component :is="radioComponent" value="standard" label="Standard shipping" />
              <component :is="radioComponent" value="express" label="Express shipping" />
              <component
                :is="radioComponent"
                value="overnight"
                label="Overnight shipping"
                disabled
              />
            </component>
          </template>
          <template v-else-if="isField">
            <component :is="activeComponent" :key="resetKey" v-bind="boundProps">
              <component :is="inputComponent" placeholder="you@example.com" />
            </component>
          </template>
          <template v-else-if="isDataTable">
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              :data="DATATABLE_PLACEHOLDER_ROWS"
              row-key="id"
            >
              <template #columns="{ columnData }">
                <component :is="columnComponent" :data="columnData" field="name" label="Name" />
                <component :is="columnComponent" :data="columnData" field="role" label="Role" />
                <component :is="columnComponent" :data="columnData" field="status" label="Status" />
              </template>
              <template #expansion="{ row }">
                <p class="datatable-expansion-row">
                  <strong>{{ row.email }}</strong> · {{ row.team }}
                </p>
              </template>
            </component>
          </template>
          <template v-else-if="isButtonGroup">
            <component :is="activeComponent" :key="resetKey" v-bind="boundProps">
              <Button variant="outline">Archive</Button>
              <Button variant="outline">Report</Button>
              <Button variant="outline">Snooze</Button>
            </component>
          </template>
          <template v-else-if="isToolbar">
            <div
              class="toolbar-preview-resizable"
              :class="{ 'toolbar-preview-resizable--vertical': values.orientation === 'vertical' }"
            >
              <component
                :is="activeComponent"
                :key="resetKey"
                v-bind="boundProps"
                class="toolbar-preview-overflow"
              >
                <Button variant="ghost" size="sm">Bold</Button>
                <Button variant="ghost" size="sm">Italic</Button>
                <Button variant="ghost" size="sm" data-toolbar-overflow>Cut</Button>
                <Button variant="ghost" size="sm" data-toolbar-overflow>Copy</Button>
                <Button variant="ghost" size="sm" data-toolbar-overflow>Paste</Button>
              </component>
            </div>
          </template>
          <template v-else-if="isSeparator">
            <div
              class="separator-preview-row"
              :class="{ 'separator-preview-row--vertical': values.orientation === 'vertical' }"
            >
              <span class="separator-preview-side">Left</span>
              <component :is="activeComponent" :key="resetKey" v-bind="boundProps" />
              <span class="separator-preview-side">Right</span>
            </div>
          </template>
          <template v-else-if="isDock">
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              :items="DOCK_PLACEHOLDER_ITEMS"
            />
          </template>
          <template v-else-if="isSpeedDial">
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              :items="SPEED_DIAL_PLACEHOLDER_ITEMS"
            />
          </template>
          <template v-else-if="isResizable">
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              class="resizable-preview"
            >
              Drag the handle
            </component>
          </template>
          <template v-else-if="isTabs">
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              v-model:active="tabsActive"
              :items="TABS_PLACEHOLDER_ITEMS"
            >
              <template #default="{ active: current, select, items: list }">
                <button
                  v-for="item in list"
                  :key="item"
                  type="button"
                  role="tab"
                  class="tabs-preview-tab"
                  :aria-selected="current === item"
                  :tabindex="current === item ? 0 : -1"
                  :data-active="current === item ? '' : undefined"
                  @click="select(item)"
                >
                  {{ item }}
                </button>
              </template>
            </component>
          </template>
          <template v-else-if="isCollapsible">
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              v-model:open="openModelValue"
            >
              <template #trigger>
                <Button variant="outline">{{ openModelValue ? 'Close' : 'Open' }}</Button>
              </template>
              <p class="playground-placeholder-copy">Toggle to reveal this content.</p>
            </component>
          </template>
          <template v-else-if="isAccordion">
            <component :is="activeComponent" :key="resetKey" v-bind="boundProps">
              <component :is="accordionItemComponent" value="item-1" title="What is vael-ui?">
                A Vue 3 component library with a full Vue Vapor build.
              </component>
              <component
                :is="accordionItemComponent"
                value="item-2"
                title="Does it support dark mode?"
              >
                Yes, CSS-only via a data attribute, no JavaScript toggle required.
              </component>
              <component
                :is="accordionItemComponent"
                value="item-3"
                title="Can I use my own animation library?"
              >
                Every component that animates exposes real hooks for GSAP, motion-v, or plain CSS.
              </component>
            </component>
          </template>
          <template v-else-if="isScrollArea">
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              class="scroll-area-preview"
            >
              <ul class="scroll-area-preview-list">
                <li v-for="n in 20" :key="n">Item {{ n }}</li>
              </ul>
            </component>
          </template>
          <template v-else-if="isAvatarGroup">
            <component :is="activeComponent" :key="resetKey" v-bind="boundProps">
              <component :is="avatarComponent" name="Ada Lovelace" />
              <component :is="avatarComponent" name="Grace Hopper" />
              <component :is="avatarComponent" name="Katherine Johnson" />
            </component>
          </template>
          <template v-else-if="isBreadcrumb">
            <component :is="activeComponent" :key="resetKey" v-bind="boundProps">
              <component :is="breadcrumbItemComponent" href="/">Home</component>
              <component :is="breadcrumbSeparatorComponent" />
              <component :is="breadcrumbItemComponent" href="/docs">Docs</component>
              <component :is="breadcrumbSeparatorComponent" />
              <component :is="breadcrumbItemComponent" current>Breadcrumb</component>
            </component>
          </template>
          <template v-else-if="isCommandPalette">
            <Button variant="outline" @click="openModelValue = !openModelValue">
              {{ openModelValue ? 'Close CommandPalette' : 'Open CommandPalette' }}
            </Button>
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              v-model:open="openModelValue"
              :items="COMMAND_PALETTE_PLACEHOLDER_ITEMS"
            />
          </template>
          <template v-else-if="isTour">
            <Button variant="outline" @click="openModelValue = !openModelValue">
              {{ openModelValue ? 'Close Tour' : 'Open Tour' }}
            </Button>
            <div class="tour-playground-targets">
              <Button id="playground-tour-target-1" variant="outline" size="sm">First</Button>
              <Button id="playground-tour-target-2" variant="outline" size="sm">Second</Button>
            </div>
            <component
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              v-model:open="openModelValue"
              :steps="TOUR_PLACEHOLDER_STEPS"
            />
          </template>
          <template v-else>
            <!-- No default slot in these two: some components override data-driven rendering with any default slot content, even empty. -->
            <component
              v-if="suppressDefaultSlot"
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              @update:model-value="onModelUpdate"
            />
            <!-- Not trigger-based; forcing v-model:open (default false) here would
                 override the component's own sensible open-by-default state. -->
            <component
              v-else-if="isSelfManagedOpen"
              :is="activeComponent"
              :key="resetKey"
              v-bind="boundProps"
              @update:model-value="onModelUpdate"
            />
            <!-- Exclusively Menu today: its trigger slot wires its own click
                 on an internal wrapper (no setTriggerEl, unlike Popover/
                 Tooltip below) — an extra manual click here would double-
                 toggle the same v-model:open and cancel itself out. -->
            <component
              v-else-if="hasTriggerSlot && hasItemsProp"
              :is="activeComponent"
              :key="`${resetKey}-trigger`"
              v-model:open="openModelValue"
              v-bind="boundProps"
              @update:model-value="onModelUpdate"
            >
              <template #trigger>
                <Button>Trigger</Button>
              </template>
            </component>
            <component
              v-else
              :is="activeComponent"
              :key="`${resetKey}-default`"
              v-model:open="openModelValue"
              v-bind="boundProps"
              @update:model-value="onModelUpdate"
            >
              <template v-if="hasTriggerSlot" #trigger="{ setTriggerEl }">
                <Button :ref="setTriggerEl" @click="openModelValue = !openModelValue"
                  >Trigger</Button
                >
              </template>
              <svg
                v-if="showIconPreview"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                />
              </svg>
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
import { computed, h, reactive, shallowRef, watch, watchEffect, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import * as VaelUi from 'vael-ui'
import { Button, Input, InputNumber, Select, SelectButton, Switch } from 'vael-ui'
import type { TreeNode } from 'vael-ui'
import CodeBlock from '../components/CodeBlock.vue'
import PlaygroundErrorBoundary from './PlaygroundErrorBoundary.vue'
import { inferControl, defaultControlValue, type PlaygroundControl } from './inferControl'
import componentMeta from '../generated/component-meta.json'
import type { ComponentMetaEntry } from '../types'
import { defaultVariant } from '../preferences'
import { useVaporComponents } from '../composables/useVaporComponents'

const props = defineProps<{ name: string }>()

const meta = computed(() => (componentMeta as Record<string, ComponentMetaEntry>)[props.name])

const vaelUiVapor = useVaporComponents()
const vaelUi = VaelUi as unknown as Record<string, Component | undefined>

// Combobox hits a confirmed upstream Vue Vapor-interop crash in this live
// playground (its floating listbox + filter-input combination), same failure
// class as DataTable/Pagination/Tag's Examples demo (see DemoFrame.vue). The
// toggle stays for API-consistency; it's cosmetic here.
const FAKE_VAPOR_TOGGLE_COMPONENTS = ['Combobox']

const activeComponent = computed<Component | null>(() => {
  if (FAKE_VAPOR_TOGGLE_COMPONENTS.includes(props.name)) return vaelUi[props.name] ?? null
  const vaporExport = vaelUiVapor.value[props.name]
  if (defaultVariant.value === 'vapor' && vaporExport) return vaporExport
  return vaelUi[props.name] ?? null
})

// These throw immediately outside their required parent, even wrapped. See the examples below instead.
const NEEDS_CONTEXT: Record<string, string> = {
  AccordionItem: 'AccordionItem only renders inside an Accordion. See the examples below.',
  Column: 'Column only renders inside a DataTable’s tree. See the examples below.',
}
const needsContext = computed(() => NEEDS_CONTEXT[props.name] ?? null)

// Has an `open` model but isn't trigger-based — it manages its own sensible
// default visibility, so the generic v-model:open="openModelValue" (default
// false) binding used for overlays would incorrectly hide it on load.
const SELF_MANAGED_OPEN = ['Message']
const isSelfManagedOpen = computed(() => SELF_MANAGED_OPEN.includes(props.name))

const OPEN_MODEL_COMPONENTS = ['Dialog', 'Drawer', 'BottomSheet']
const CONTEXT_AREA_COMPONENTS = ['ContextMenu']
const OPEN_MODEL_PLACEHOLDER: Record<string, string> = {
  Dialog: 'This is the dialog body. Put any content here.',
  Drawer: 'This is the drawer body. Put any content here.',
  BottomSheet: 'This is the sheet body. Put any content here.',
}
const isOpenModel = computed(() => OPEN_MODEL_COMPONENTS.includes(props.name))
const isContextArea = computed(() => CONTEXT_AREA_COMPONENTS.includes(props.name))
const isRadioWrap = computed(() => props.name === 'Radio')
const isRadioGroup = computed(() => props.name === 'RadioGroup')
const isField = computed(() => props.name === 'Field')
const isDataTable = computed(() => props.name === 'DataTable')
const isToolbar = computed(() => props.name === 'Toolbar')
const isButtonGroup = computed(() => props.name === 'ButtonGroup')
const isAccordion = computed(() => props.name === 'Accordion')
// Collapsible's own trigger wrapper already toggles `open` on click (see
// Collapsible.vue's onToggle) — the generic fallback below also wires its
// own click-to-toggle onto the trigger slot, which would double-fire off
// the same bubbled click and toggle the model back to where it started.
const isCollapsible = computed(() => props.name === 'Collapsible')
const isSeparator = computed(() => props.name === 'Separator')
const isDock = computed(() => props.name === 'Dock')
const isSpeedDial = computed(() => props.name === 'SpeedDial')
const isTabs = computed(() => props.name === 'Tabs')
const TABS_PLACEHOLDER_ITEMS = ['Overview', 'Activity', 'Settings']
const tabsActive = shallowRef(TABS_PLACEHOLDER_ITEMS[0])
const isResizable = computed(() => props.name === 'Resizable')
const isScrollArea = computed(() => props.name === 'ScrollArea')
const isAvatarGroup = computed(() => props.name === 'AvatarGroup')
const isBreadcrumb = computed(() => props.name === 'Breadcrumb')
const isCommandPalette = computed(() => props.name === 'CommandPalette')
const COMMAND_PALETTE_PLACEHOLDER_ITEMS = [
  { id: 'new-file', label: 'New File', description: 'Create a blank document' },
  { id: 'new-folder', label: 'New Folder', description: 'Group related files' },
  { id: 'open-settings', label: 'Open Settings', description: 'Preferences and theme' },
]
const isTour = computed(() => props.name === 'Tour')
const TOUR_PLACEHOLDER_STEPS = [
  {
    target: '#playground-tour-target-1',
    title: 'First stop',
    description: 'This step points at the button on the left.',
  },
  {
    target: '#playground-tour-target-2',
    title: 'Second stop',
    description: 'This step points at the button on the right.',
  },
]
const showIconPreview = computed(() => props.name === 'Button' && values.icon === true)

function svgIcon(path: string) {
  return () =>
    h('svg', { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'currentColor' }, [
      h('path', { d: path }),
    ])
}
const DOCK_PLACEHOLDER_ITEMS = [
  {
    label: 'Home',
    icon: { render: svgIcon('M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z') },
    style: { color: '#2563eb' },
  },
  {
    label: 'Messages',
    icon: { render: svgIcon('M4 4h16v12H8l-4 4z') },
    style: { color: '#16a34a' },
  },
  {
    label: 'Favorites',
    icon: {
      render: svgIcon(
        'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
      ),
    },
    style: { color: '#d97706' },
  },
  {
    label: 'Settings',
    icon: { render: svgIcon('M12 8a4 4 0 100 8 4 4 0 000-8z') },
    style: { color: '#7c3aed' },
  },
]
const SPEED_DIAL_PLACEHOLDER_ITEMS = [
  { label: 'New file', icon: { render: svgIcon('M4 4h16v12H8l-4 4z') } },
  {
    label: 'New folder',
    icon: { render: svgIcon('M3 5h6l2 2h10v10H3z') },
  },
  {
    label: 'Upload',
    icon: { render: svgIcon('M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z') },
  },
]

// Matches activeComponent's own variant — a child rendered from the other build wasn't reliable (e.g. Radio/RadioGroup mismatched under Vapor).
function resolveVariant(name: string): Component | undefined {
  return defaultVariant.value === 'vapor' ? vaelUiVapor.value[name] : vaelUi[name]
}
const columnComponent = computed(() => resolveVariant('Column'))
const accordionItemComponent = computed(() => resolveVariant('AccordionItem'))
const radioGroupComponent = computed(() => resolveVariant('RadioGroup'))
const radioComponent = computed(() => resolveVariant('Radio'))
const inputComponent = computed(() => resolveVariant('Input'))
const avatarComponent = computed(() => resolveVariant('Avatar'))
const breadcrumbItemComponent = computed(() => resolveVariant('BreadcrumbItem'))
const breadcrumbSeparatorComponent = computed(() => resolveVariant('BreadcrumbSeparator'))

const DATATABLE_PLACEHOLDER_ROWS = [
  {
    id: 'r1',
    name: 'Mira Mitchell',
    role: 'Engineer',
    status: 'Active',
    email: 'mira.mitchell@example.com',
    team: 'Platform',
  },
  {
    id: 'r2',
    name: "Marcus O'Connor",
    role: 'Designer',
    status: 'Active',
    email: 'marcus.oconnor@example.com',
    team: 'Design systems',
  },
  {
    id: 'r3',
    name: 'Priya Nair',
    role: 'Product Manager',
    status: 'Invited',
    email: 'priya.nair@example.com',
    team: 'Growth',
  },
  {
    id: 'r4',
    name: 'Diego Silva',
    role: 'Support',
    status: 'Suspended',
    email: 'diego.silva@example.com',
    team: 'Customer success',
  },
  {
    id: 'r5',
    name: 'Sofia Rossi',
    role: 'Sales',
    status: 'Active',
    email: 'sofia.rossi@example.com',
    team: 'Revenue',
  },
]

// Any default-slot content here overrides their own computed fallback (Avatar's initials, Badge's count, ...).
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

// Scoped per component — a blanket override by prop name would collide (`name` is also a form field attribute elsewhere).
const COMPONENT_OVERRIDES: Record<
  string,
  {
    string?: Record<string, string>
    number?: Record<string, number>
    select?: Record<string, string[]>
    // Picks a specific starting option for a select control whose real prop default exists but
    // demos poorly (Message's `variant: 'default'` has no icon, so `showIcon` looks like it does nothing).
    selectDefault?: Record<string, string>
  }
> = {
  Avatar: { string: { name: 'Ada Lovelace' } },
  Loader: { select: { size: ['1rem', '1.5rem', '2rem'] } },
  Pagination: { number: { total: 132 } },
  // No static default in defineProps (real default is computed: baseSize * 3.5)
  // — seeding to 0 makes dockFalloff's `range <= 0` guard kill magnification entirely.
  Dock: { number: { range: 168 } },
  Badge: { number: { count: 5 } },
  Chip: { string: { label: 'Chip label' } },
  Checkbox: { string: { label: 'Checkbox label' } },
  Switch: { string: { label: 'Switch label' } },
  Message: { selectDefault: { variant: 'info' } },
}

const controls = computed<NamedControl[]>(() => {
  if (!meta.value) return []
  const overrides = COMPONENT_OVERRIDES[props.name]
  const list: NamedControl[] = []
  for (const prop of meta.value.props) {
    if (prop.name === 'modelValue') continue
    // A generic control for `open`/`maximized` would seed a static value that fights the component's own state.
    if (prop.name === 'open' || prop.name === 'maximized') continue
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
const isTreeShaped = computed(
  () => props.name === 'Tree' || props.name === 'TreeSelect' || props.name === 'CascadeSelect',
)

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

// Some string props crash on the normal '' default (Calendar's `locale` hits `new Intl.DateTimeFormat('')`).
const STRING_DEFAULT_OVERRIDES: Record<string, string> = {
  locale: 'en-US',
}

// Props with no real default (Resizable's `size`, Progress's `value`) otherwise seed to 0 and look broken.
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
    if (control.kind === 'select' && overrides?.selectDefault?.[control.name] !== undefined) {
      values[control.name] = overrides.selectDefault[control.name]
    } else if (control.kind === 'string' && overrides?.string?.[control.name] !== undefined) {
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
  align-items: safe center;
  justify-content: safe center;
  gap: 1rem;
  flex-wrap: wrap;
  min-height: 9rem;
  max-height: 32rem;
  overflow: auto;
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

.toolbar-preview-resizable {
  overflow: auto;
  resize: horizontal;
  min-inline-size: 160px;
  max-inline-size: 100%;
  inline-size: 600px;
  padding: 0.5rem;
  border: 1px dashed var(--ui-border-strong);
}

.toolbar-preview-resizable--vertical {
  resize: vertical;
  inline-size: auto;
  min-block-size: 120px;
  max-block-size: 100%;
  block-size: 320px;
}

.toolbar-preview-overflow {
  inline-size: 100%;
}

.separator-preview-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  inline-size: 100%;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}

/* Vertical orientation needs a definite block-size to resolve its own
   block-size: 100% against — same reasoning as the real Separator demo's
   own "needs a sized container" wrapper. */
.separator-preview-row--vertical {
  align-items: stretch;
  block-size: 2rem;
}

.toolbar-preview-resizable--vertical .toolbar-preview-overflow {
  inline-size: auto;
  block-size: 100%;
}

.resizable-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--ui-muted);
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}

/* Needs a definite block-size to resolve its own block-size: 100% against,
   same reasoning as .separator-preview-row--vertical above. */
.scroll-area-preview {
  block-size: 10rem;
  max-inline-size: 16rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.scroll-area-preview-list {
  margin: 0;
  padding: 0.5rem 0.75rem;
  list-style: none;
  font-size: 0.8125rem;
}
.scroll-area-preview-list li {
  padding-block: 0.25rem;
}

.tabs-preview-tab {
  padding: 0.375rem 0.75rem;
  border: none;
  background: none;
  border-radius: var(--ui-radius);
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  cursor: pointer;
}

.tabs-preview-tab[data-active] {
  background: var(--ui-surface);
  color: var(--ui-text);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}

.datatable-expansion-row {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ui-text-muted);
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

.tour-playground-targets {
  display: flex;
  gap: 0.5rem;
  margin-block-start: 1rem;
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
