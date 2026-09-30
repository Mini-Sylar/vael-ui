<template>
  <section class="playground" :class="{ 'playground--next': next }">
    <div v-if="!next" class="playground-toolbar">
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
      <div class="playground-stage" :data-bg="next ? stageBg : undefined">
        <div v-if="next" class="pg-stagebar">
          <SelectButton
            v-if="presetItems2.length > 1"
            v-model="activePreset"
            size="sm"
            :items="presetItems2"
            :allow-empty="false"
            aria-label="Presets"
            class="pg-presets"
          />
          <div class="pg-stage-tools">
            <button
              v-if="frameWidth !== null"
              type="button"
              class="pg-width"
              aria-label="Reset preview width"
              @click="frameWidth = null"
            >
              {{ Math.round(frameWidth) }}px
              <PhX :size="10" weight="bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="pg-tool"
              :aria-pressed="stageBg === 'plain'"
              :aria-label="stageBg === 'dots' ? 'Plain background' : 'Dotted background'"
              v-tooltip="stageBg === 'dots' ? 'Plain background' : 'Dotted background'"
              @click="stageBg = stageBg === 'dots' ? 'plain' : 'dots'"
            >
              <PhDotsNine v-if="stageBg === 'dots'" :size="15" aria-hidden="true" />
              <PhSquare v-else :size="15" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          ref="previewEl"
          class="playground-preview"
          :style="
            next && frameWidth !== null ? { inlineSize: `min(${frameWidth}px, 100%)` } : undefined
          "
          :data-sized="(next && frameWidth !== null) || undefined"
        >
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
                  <component
                    :is="columnComponent"
                    :data="columnData"
                    field="status"
                    label="Status"
                  />
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
                :class="{
                  'toolbar-preview-resizable--vertical': values.orientation === 'vertical',
                }"
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
                  Yes. It follows the system setting, and a data-theme attribute on the root element
                  overrides it.
                </component>
                <component
                  :is="accordionItemComponent"
                  value="item-3"
                  title="Can I use my own animation library?"
                >
                  Yes. Every animated component has hooks for GSAP, motion-v, or plain CSS.
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
            <template v-else-if="isPullToRefresh">
              <component
                :is="activeComponent"
                :key="resetKey"
                v-bind="boundProps"
                class="pull-to-refresh-preview"
              >
                <ul class="pull-to-refresh-preview-list">
                  <li v-for="n in 8" :key="n">Row {{ n }}</li>
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
                :container="previewEl"
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
              <!-- No `open` prop at all (a plain form control, say) — nothing to bind. -->
              <component
                v-else-if="!hasOpenProp"
                :is="activeComponent"
                :key="`${resetKey}-default`"
                v-bind="boundProps"
                @update:model-value="onModelUpdate"
              >
                <template v-if="sampleSlotText" #default>{{ sampleSlotText }}</template>
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
          <span
            v-if="next"
            class="pg-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize preview"
            tabindex="0"
            @pointerdown="onHandleDown"
            @dblclick="frameWidth = null"
            @keydown="onHandleKey"
          />
        </div>
      </div>

      <div v-if="controls.length > 0 || showDataPreset" class="playground-controls">
        <div v-if="next" class="pg-inspector-head">
          <span>
            Props
            <span class="pg-count">{{ controls.length + (showDataPreset ? 1 : 0) }}</span>
          </span>
          <button
            type="button"
            class="pg-reset-all"
            :disabled="changedCount === 0"
            @click="resetAll"
          >
            <PhArrowCounterClockwise :size="12" aria-hidden="true" />
            Reset
          </button>
        </div>
        <div ref="rowsEl" class="pg-rows" v-scroll-mask="next" @scroll.passive="updateMore">
          <div v-if="showDataPreset" class="control-row">
            <label for="ctl-data-preset">Data</label>
            <Select
              id="ctl-data-preset"
              size="sm"
              class="control-input"
              :items="presetItems"
              v-model="dataPreset"
            />
          </div>

          <template v-for="control in orderedControls" :key="control.name">
            <p v-if="next && control.name === firstAdvanced" class="pg-group-label">
              Placement, behaviour and animation
            </p>
            <div
              class="control-row"
              :data-changed="next && isChanged(control.name) ? '' : undefined"
            >
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
                :model-value="!!values[control.name]"
                @update:model-value="(v) => setBooleanControl(control.name, v)"
              />
              <Select
                v-else-if="control.kind === 'select'"
                :id="`ctl-${control.name}`"
                size="sm"
                class="control-input"
                :items="control.options.map((o) => ({ label: o, value: o }))"
                :model-value="
                  (values[control.name] ??
                    (control.unsettable ? UNSET_OPTION : undefined)) as string
                "
                @update:model-value="
                  (v) =>
                    (values[control.name] =
                      control.unsettable && v === UNSET_OPTION ? undefined : v)
                "
              />
              <InputNumber
                v-else-if="control.kind === 'number'"
                :id="`ctl-${control.name}`"
                size="sm"
                class="control-input"
                allow-empty
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
              <button
                v-if="next"
                type="button"
                class="pg-row-reset"
                :disabled="!isChanged(control.name)"
                :aria-label="`Reset ${control.name}`"
                @click="resetControl(control.name)"
              >
                <PhArrowCounterClockwise :size="12" aria-hidden="true" />
              </button>
            </div>
          </template>
        </div>
        <Transition name="pg-more">
          <button v-if="next && moreBelow > 0" type="button" class="pg-more" @click="scrollRows">
            <PhArrowDown :size="12" weight="bold" aria-hidden="true" />
            {{ moreBelow }} more
          </button>
        </Transition>
      </div>
      <p v-else class="no-controls">
        This component has no props you can edit here. See the examples below.
      </p>
    </div>

    <CodeBlock lang="vue" :code="next ? codeNext : code">
      <!-- Right where you copy, so a Vapor user can't miss which import they're getting. -->
      <template v-if="next" #toolbar>
        <span class="pg-code-label">Usage</span>
        <SelectButton
          v-model="defaultVariant"
          size="sm"
          :allow-empty="false"
          aria-label="Rendering mode"
          :items="[
            { label: 'Vue DOM', value: 'vdom' },
            { label: 'Vapor', value: 'vapor' },
          ]"
        />
      </template>
    </CodeBlock>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  h,
  reactive,
  shallowRef,
  nextTick,
  toRaw,
  useTemplateRef,
  watch,
  watchEffect,
  type Component,
} from 'vue'
import { RouterLink } from 'vue-router'
import * as VaelUi from 'vael-ui'
import { Button, Input, InputNumber, Select, SelectButton, Switch, vScrollMask } from 'vael-ui'
import type { TreeNode } from 'vael-ui'
import { useResizeObserver } from '@vueuse/core'
import {
  PhArrowCounterClockwise,
  PhArrowDown,
  PhDotsNine,
  PhSquare,
  PhX,
} from '@phosphor-icons/vue'
import CodeBlock from '../components/CodeBlock.vue'
import { layoutNext as next } from '../layoutNext'
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
  Column: 'Column only renders inside a DataTable. See the examples below.',
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
const isPullToRefresh = computed(() => props.name === 'PullToRefresh')
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

// Slot-only components have no label prop, so without this they preview empty.
const SAMPLE_SLOT_TEXT: Record<string, string> = {
  Button: 'Button',
  Card: 'Card content',
  Tag: 'Tag',
  Kbd: '⌘K',
}
const sampleSlotText = computed(() => SAMPLE_SLOT_TEXT[props.name])

const openModelValue = shallowRef(false)
const radioGroupValue = shallowRef<string | number | null>(null)
const previewEl = useTemplateRef<HTMLElement>('previewEl')

const CONTROL_HELP: Record<string, string> = {
  motionCss:
    'Turn off the built-in CSS transition to animate this yourself with GSAP, motion-v, or plain CSS.',
  forceMount:
    'Keeps this mounted while closed, so your animation library runs the exit instead of Vue removing it.',
  filter:
    'Off leaves filter unset, so the component default applies. On sets filter="true" for built-in matching. filter="false" lets you filter the items yourself. It needs a third state, so it has no toggle here. See the prop docs.',
}

interface NamedControl {
  name: string
  kind: PlaygroundControl['kind']
  options: string[]
  /** Optional select with no default: unset is its own real behavior (Combobox's `tabBehavior`, DatePicker's locale-driven `hourFormat`), so it gets an `undefined` choice and starts on it. */
  unsettable?: boolean
}

const UNSET_OPTION = 'undefined'

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
    const unsettable =
      control.kind === 'select' &&
      (prop.default === undefined || prop.default === 'undefined') &&
      typeof prop.schema === 'object' &&
      prop.schema.kind === 'enum' &&
      (prop.schema.schema ?? []).includes('undefined')
    list.push({
      name: prop.name,
      kind: control.kind,
      options:
        control.kind === 'select'
          ? unsettable
            ? [UNSET_OPTION, ...control.options]
            : control.options
          : [],
      unsettable,
    })
  }
  return list
})

const hasItemsProp = computed(() => Boolean(meta.value?.props.some((p) => p.name === 'items')))
// These previews pass their own fixed items, so a data picker would change nothing.
const showDataPreset = computed(
  () =>
    hasItemsProp.value &&
    !isDock.value &&
    !isSpeedDial.value &&
    !isTabs.value &&
    !isCommandPalette.value,
)
const hasTriggerSlot = computed(() => Boolean(meta.value?.slots.some((s) => s.name === 'trigger')))
// Every earlier branch above is for a specifically-named component; this
// generic tail assumed anything falling through to it is some Popover-like
// overlay with an `open` model — true for the whole library until a plain
// form control (PasswordInput) landed here first. Check the real metadata
// instead of assuming, so the next non-overlay component doesn't hit the
// same "Extraneous non-props attributes (open)" warning.
const hasOpenProp = computed(() => Boolean(meta.value?.props.some((p) => p.name === 'open')))
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

// Same idea for a boolean|function prop (Select/Combobox's `filter`) whose
// real "off" is an unset prop, not `false` — `false` still renders the box,
// just without built-in matching, so a toggle that could only ever produce
// `false`/`true` could never show the box actually disappearing.
// FileUpload's `capture`: `true` opens the camera, so it starts unset too.
const BOOLEAN_UNSET_WHEN_OFF = new Set(['filter', 'capture'])

function setBooleanControl(name: string, checked: boolean) {
  values[name] = !checked && BOOLEAN_UNSET_WHEN_OFF.has(name) ? undefined : checked
}

const values = reactive<Record<string, unknown>>({})
// What each control started at, so the next layout can mark and reset edits.
const initialValues = shallowRef<Record<string, unknown>>({})

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
    } else if (control.unsettable) {
      values[control.name] = undefined
    } else if (control.kind === 'string' && overrides?.string?.[control.name] !== undefined) {
      values[control.name] = overrides.string[control.name]
    } else if (control.kind === 'number' && overrides?.number?.[control.name] !== undefined) {
      values[control.name] = overrides.number[control.name]
    } else if (control.kind === 'string' && next.value && control.name === 'placeholder') {
      values.placeholder = /Select|Combobox|Picker/.test(props.name)
        ? 'Choose an option'
        : 'Type here…'
    } else if (control.kind === 'string' && STRING_DEFAULT_OVERRIDES[control.name] !== undefined) {
      values[control.name] = STRING_DEFAULT_OVERRIDES[control.name]
    } else if (control.kind === 'boolean' && BOOLEAN_UNSET_WHEN_OFF.has(control.name)) {
      values[control.name] = undefined
    } else if (
      control.kind === 'number' &&
      propMeta?.default === undefined &&
      NUMBER_DEFAULT_OVERRIDES[control.name] !== undefined
    ) {
      values[control.name] = NUMBER_DEFAULT_OVERRIDES[control.name]
    } else if (
      control.kind === 'number' &&
      (propMeta?.default === undefined || propMeta.default === 'undefined') &&
      !propMeta?.required
    ) {
      // An optional number with no default (min, max, maxSize, maxRows...) is
      // a limit that's off until set. Seeding 0 would clamp everything to 0.
      values[control.name] = undefined
    } else {
      values[control.name] = defaultControlValue(control, propMeta?.default)
    }
  }
  // toRaw: reading `values` reactively here would re-seed on every edit.
  initialValues.value = { ...toRaw(values) }
})

// ---- Next layout (the default; `?layout=current` for the old one) ----

function isChanged(name: string): boolean {
  return !Object.is(values[name], initialValues.value[name])
}
const changedCount = computed(() => controls.value.filter((c) => isChanged(c.name)).length)

function resetControl(name: string) {
  values[name] = initialValues.value[name]
}
function resetAll() {
  for (const c of controls.value) values[c.name] = initialValues.value[c.name]
}

// Placement, wiring and animation hooks: listed after the everyday props.
const ADVANCED = new Set([
  'side',
  'align',
  'name',
  'id',
  'to',
  'locale',
  'query',
  'virtualize',
  'autofocus',
  'as',
  'type',
])
const ADVANCED_PATTERN =
  /Offset$|^closeOn|^force|^motion|^scroll|^tab[A-Z]|^teleport|Placeholder$|^maxPanel|^aria|Label$/
function isAdvanced(name: string): boolean {
  return ADVANCED.has(name) || ADVANCED_PATTERN.test(name)
}
// Grouping only pays off when both halves have something in them.
const grouped = computed(() => {
  const advanced = controls.value.filter((c) => isAdvanced(c.name)).length
  return next.value && advanced > 1 && advanced < controls.value.length
})
const orderedControls = computed(() =>
  grouped.value
    ? [
        ...controls.value.filter((c) => !isAdvanced(c.name)),
        ...controls.value.filter((c) => isAdvanced(c.name)),
      ]
    : controls.value,
)
const firstAdvanced = computed(() =>
  grouped.value ? (orderedControls.value.find((c) => isAdvanced(c.name))?.name ?? null) : null,
)

// One-click states, built from whichever of these booleans the component has.
const PRESET_STATES = ['multiple', 'clearable', 'loading', 'invalid', 'disabled', 'readonly']
const presetItems2 = computed(() => [
  { label: 'Default', value: 'default' },
  ...PRESET_STATES.filter((name) =>
    controls.value.some((c) => c.name === name && c.kind === 'boolean'),
  ).map((name) => ({ label: name[0]!.toUpperCase() + name.slice(1), value: name })),
])
const activePreset = computed<string | null>({
  get: () => {
    const changed = controls.value.filter((c) => isChanged(c.name))
    if (changed.length === 0) return 'default'
    const only = changed[0]!.name
    return changed.length === 1 && PRESET_STATES.includes(only) && values[only] === true
      ? only
      : null
  },
  set: (key) => {
    resetAll()
    if (key && key !== 'default') values[key] = true
  },
})

const stageBg = shallowRef<'dots' | 'plain'>('dots')

// How many props sit below the fold of the scrolling panel, so a long list says
// so instead of relying on a fade the eye can miss.
const rowsEl = useTemplateRef<HTMLElement>('rowsEl')
const moreBelow = shallowRef(0)
function updateMore() {
  const el = rowsEl.value
  if (!el || el.scrollHeight <= el.clientHeight + 1) {
    moreBelow.value = 0
    return
  }
  const fold = el.scrollTop + el.clientHeight
  let count = 0
  for (const row of el.querySelectorAll<HTMLElement>('.control-row')) {
    if (row.offsetTop + row.offsetHeight / 2 > fold) count++
  }
  moreBelow.value = count
}
function scrollRows() {
  const el = rowsEl.value
  el?.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' })
}
useResizeObserver(rowsEl, updateMore)
watch([orderedControls, next], () => nextTick(updateMore))

// Drag the frame's edge to try the component at narrower widths. The frame is
// centered, so the width moves twice the pointer delta to keep the edge under it.
const MIN_FRAME = 240
const frameWidth = shallowRef<number | null>(null)
watch(
  () => props.name,
  () => (frameWidth.value = null),
)
function stageWidth(): number {
  return previewEl.value?.parentElement?.clientWidth ?? 0
}
function clampFrame(width: number): number | null {
  const max = stageWidth()
  return width >= max - 1 ? null : Math.max(MIN_FRAME, width)
}
function onHandleDown(event: PointerEvent) {
  const handle = event.currentTarget as HTMLElement
  const startX = event.clientX
  const startWidth = previewEl.value?.getBoundingClientRect().width ?? 0
  handle.setPointerCapture(event.pointerId)
  const move = (e: PointerEvent) => {
    frameWidth.value = clampFrame(startWidth + (e.clientX - startX) * 2)
  }
  const up = () => {
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', up)
    handle.removeEventListener('pointercancel', up)
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', up)
  handle.addEventListener('pointercancel', up)
}
function onHandleKey(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const current = frameWidth.value ?? stageWidth()
  const step = event.shiftKey ? 80 : 16
  frameWidth.value = clampFrame(current + (event.key === 'ArrowLeft' ? -step : step))
}

// The snippet lists only what differs from the component's own defaults, one
// attribute per line once it stops fitting on one.
function metaDefault(name: string): unknown {
  const raw = meta.value?.props.find((p) => p.name === name)?.default
  if (raw === undefined || raw === 'undefined') return undefined
  const quoted = /^(['"`])(.*)\1$/.exec(raw)
  if (quoted) return quoted[2]
  if (raw === 'true' || raw === 'false') return raw === 'true'
  const n = Number(raw)
  return Number.isNaN(n) ? raw : n
}
const codeNext = computed(() => {
  if (!meta.value) return ''
  const attrs: string[] = []
  for (const c of controls.value) {
    const v = values[c.name]
    const d = metaDefault(c.name)
    if (v === undefined || v === '' || v === null) continue
    if (c.kind === 'boolean' && v === false && (d === undefined || d === false)) continue
    if (Object.is(v, d) || String(v) === String(d)) continue
    if (c.kind === 'boolean') attrs.push(v ? c.name : `:${c.name}="false"`)
    else if (c.kind === 'number') attrs.push(`:${c.name}="${v}"`)
    else attrs.push(`${c.name}="${v}"`)
  }
  if (hasItemsProp.value && showDataPreset.value) attrs.push(':items="items"')
  const { extraAttrs = '', imports = [] } = snippetParts.value
  // A list control's default slot isn't its label, so the name-as-content filler misleads.
  const children = (snippetParts.value.children ?? []).filter(
    (line) => !(hasItemsProp.value && line === props.name),
  )
  if (extraAttrs) attrs.push(extraAttrs)
  const pkg = defaultVariant.value === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  const names = [...new Set([props.name, ...imports])].join(', ')
  const oneLine = `<${[props.name, ...attrs].join(' ')}`
  const fits = oneLine.length <= 64
  const open = fits ? oneLine : `<${props.name}\n${attrs.map((a) => `  ${a}`).join('\n')}\n`
  const inline = children.length === 1 && !children[0]!.startsWith('<')
  const body =
    children.length === 0
      ? `${open}${fits ? ' ' : ''}/>`
      : inline && fits
        ? `${open}>${children[0]}</${props.name}>`
        : `${open}>\n${children.map((line) => `  ${line}`).join('\n')}\n</${props.name}>`
  return sfcSnippet(names, pkg, body)
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

// A whole SFC rather than an import line plus loose markup: it pastes straight
// into a .vue file, and the highlighter only colors markup inside <template>.
// Split so this file's own <script> block isn't closed by the string.
const SCRIPT_CLOSE = '</' + 'script>'
function sfcSnippet(names: string, pkg: string, body: string): string {
  const template = body
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
  return `<script setup lang="ts">\nimport { ${names} } from '${pkg}'\n${SCRIPT_CLOSE}\n\n<template>\n${template}\n</template>`
}

const code = computed(() => {
  if (!meta.value) return ''
  const attrs = controls.value
    .map((c) => {
      const v = values[c.name]
      if (c.kind === 'boolean') return v === undefined ? '' : v ? c.name : `:${c.name}="false"`
      if (c.kind === 'number') return v === undefined ? '' : `:${c.name}="${v}"`
      if (v === undefined) return ''
      return `${c.name}="${v}"`
    })
    .filter(Boolean)
    .join(' ')
  const itemsAttr = hasItemsProp.value ? ' :items="items"' : ''
  const { extraAttrs = '', children = [], imports = [] } = snippetParts.value
  const openTag = [props.name, attrs, itemsAttr, extraAttrs]
    .filter(Boolean)
    .join(' ')
    .replace(/ +/g, ' ')
  const pkg = defaultVariant.value === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  const names = [...new Set([props.name, ...imports])].join(', ')
  const inline = children.length === 1 && !children[0]!.startsWith('<')
  const body =
    children.length === 0
      ? `<${openTag} />`
      : inline
        ? `<${openTag}>${children[0]}</${props.name}>`
        : `<${openTag}>\n${children.map((line) => `  ${line}`).join('\n')}\n</${props.name}>`
  return sfcSnippet(names, pkg, body)
})

// Mirrors the preview branches above, so the snippet shows the same slot
// content the preview renders (and none when the preview has none).
const snippetParts = computed<{ extraAttrs?: string; children?: string[]; imports?: string[] }>(
  () => {
    const open = 'v-model:open="open"'
    if (isOpenModel.value) {
      return { extraAttrs: open, children: [`<p>${OPEN_MODEL_PLACEHOLDER[props.name]}</p>`] }
    }
    if (isContextArea.value) {
      return { extraAttrs: open, children: ['<div>Right-click here</div>'] }
    }
    if (isRadioWrap.value) return { extraAttrs: 'value="playground-option"' }
    if (isRadioGroup.value) {
      return {
        imports: ['Radio'],
        children: [
          '<Radio value="standard" label="Standard shipping" />',
          '<Radio value="express" label="Express shipping" />',
          '<Radio value="overnight" label="Overnight shipping" disabled />',
        ],
      }
    }
    if (isField.value) {
      return { imports: ['Input'], children: ['<Input placeholder="you@example.com" />'] }
    }
    if (isDataTable.value) {
      return {
        extraAttrs: ':data="rows" row-key="id"',
        imports: ['Column'],
        children: [
          '<template #columns="{ columnData }">',
          '  <Column :data="columnData" field="name" label="Name" />',
          '  <Column :data="columnData" field="role" label="Role" />',
          '  <Column :data="columnData" field="status" label="Status" />',
          '</template>',
        ],
      }
    }
    if (isButtonGroup.value) {
      return {
        imports: ['Button'],
        children: ['Archive', 'Report', 'Snooze'].map(
          (label) => `<Button variant="outline">${label}</Button>`,
        ),
      }
    }
    if (isToolbar.value) {
      return {
        imports: ['Button'],
        children: [
          '<Button variant="ghost" size="sm">Bold</Button>',
          '<Button variant="ghost" size="sm">Italic</Button>',
          ...['Cut', 'Copy', 'Paste'].map(
            (label) => `<Button variant="ghost" size="sm" data-toolbar-overflow>${label}</Button>`,
          ),
        ],
      }
    }
    if (isDock.value || isSpeedDial.value) {
      return hasItemsProp.value ? {} : { extraAttrs: ':items="items"' }
    }
    if (isResizable.value) return { children: ['Drag the handle'] }
    if (isTabs.value) {
      return {
        extraAttrs: 'v-model:active="active"',
        children: [
          '<template #default="{ active, select, items }">',
          '  <button',
          '    v-for="item in items"',
          '    :key="item"',
          '    type="button"',
          '    role="tab"',
          '    :aria-selected="active === item"',
          '    @click="select(item)"',
          '  >',
          '    {{ item }}',
          '  </button>',
          '</template>',
        ],
      }
    }
    if (isCollapsible.value) {
      return {
        extraAttrs: open,
        imports: ['Button'],
        children: [
          '<template #trigger>',
          `  <Button variant="outline">{{ open ? 'Close' : 'Open' }}</Button>`,
          '</template>',
          '<p>Toggle to reveal this content.</p>',
        ],
      }
    }
    if (isAccordion.value) {
      return {
        imports: ['AccordionItem'],
        children: [
          '<AccordionItem value="item-1" title="What is vael-ui?">',
          '  A Vue 3 component library with a full Vue Vapor build.',
          '</AccordionItem>',
          '<AccordionItem value="item-2" title="Does it support dark mode?">',
          '  Yes. It follows the system setting, and a data-theme attribute on the root element overrides it.',
          '</AccordionItem>',
          '<AccordionItem value="item-3" title="Can I use my own animation library?">',
          '  Yes. Every animated component has hooks for GSAP, motion-v, or plain CSS.',
          '</AccordionItem>',
        ],
      }
    }
    if (isScrollArea.value) {
      return {
        children: ['<ul>', '  <li v-for="n in 20" :key="n">Item {{ n }}</li>', '</ul>'],
      }
    }
    if (isPullToRefresh.value) {
      return {
        children: ['<ul>', '  <li v-for="n in 8" :key="n">Row {{ n }}</li>', '</ul>'],
      }
    }
    if (isAvatarGroup.value) {
      return {
        imports: ['Avatar'],
        children: ['Ada Lovelace', 'Grace Hopper', 'Katherine Johnson'].map(
          (person) => `<Avatar name="${person}" />`,
        ),
      }
    }
    if (isBreadcrumb.value) {
      return {
        imports: ['BreadcrumbItem', 'BreadcrumbSeparator'],
        children: [
          '<BreadcrumbItem href="/">Home</BreadcrumbItem>',
          '<BreadcrumbSeparator />',
          '<BreadcrumbItem href="/docs">Docs</BreadcrumbItem>',
          '<BreadcrumbSeparator />',
          '<BreadcrumbItem current>Breadcrumb</BreadcrumbItem>',
        ],
      }
    }
    if (isCommandPalette.value) {
      return { extraAttrs: hasItemsProp.value ? open : `${open} :items="items"` }
    }
    if (isTour.value) return { extraAttrs: `${open} :steps="steps"` }
    if (suppressDefaultSlot.value || isSelfManagedOpen.value) return {}
    if (hasTriggerSlot.value && hasItemsProp.value) {
      return {
        extraAttrs: open,
        imports: ['Button'],
        children: ['<template #trigger>', '  <Button>Trigger</Button>', '</template>'],
      }
    }
    if (!hasOpenProp.value) {
      return sampleSlotText.value ? { children: [sampleSlotText.value] } : {}
    }
    const trigger = hasTriggerSlot.value
      ? [
          '<template #trigger="{ setTriggerEl }">',
          '  <Button :ref="setTriggerEl" @click="open = !open">Trigger</Button>',
          '</template>',
        ]
      : []
    return {
      extraAttrs: open,
      imports: hasTriggerSlot.value ? ['Button'] : [],
      children: [...trigger, props.name],
    }
  },
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

.pull-to-refresh-preview {
  block-size: 12rem;
  max-inline-size: 16rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.pull-to-refresh-preview-list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
}
.pull-to-refresh-preview-list li {
  padding: 0.5rem 0.75rem;
  border-block-end: 1px solid var(--ui-border);
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

  .playground:not(.playground--next) .playground-controls {
    flex-direction: row;
    flex-wrap: wrap;
    border-left: none;
    border-top: 1px solid var(--ui-border);
    max-height: none;
  }

  .playground:not(.playground--next) .control-input {
    width: 9rem;
  }
}

.playground-stage {
  display: contents;
}

/* ---- Next layout (the default; `?layout=current` for the old one) ---- */

.playground--next {
  /* clip, not hidden: hidden would stop the stage sticking when stacked. */
  overflow: clip;
  container-type: inline-size;
}

/* Preview and props side by side, so every change stays in view. */
.playground--next .playground-body {
  grid-template-columns: minmax(0, 1fr) 23rem;
  grid-template-areas: 'stage controls';
}

.playground--next .playground-stage {
  grid-area: stage;
  position: relative;
  isolation: isolate;
  display: flex;
  justify-content: center;
  padding: 3.25rem 1rem 1rem;
}

.playground--next .playground-stage[data-bg='dots']::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: radial-gradient(circle, var(--ui-border) 1px, transparent 1px);
  background-size: 20px 20px;
  mask-image: radial-gradient(ellipse at center, black 55%, transparent 100%);
}

.playground--next .playground-preview {
  inline-size: 100%;
  min-height: 15rem;
  max-height: 34rem;
  padding: 2rem;
  border-radius: calc(var(--docs-radius) - 2px);
}

.playground--next .playground-preview::before {
  content: none;
}

.playground--next .playground-preview[data-sized] {
  outline: 1px dashed var(--ui-border-strong);
  outline-offset: -1px;
}

.pg-stagebar {
  position: absolute;
  inset: 0.625rem 0.625rem auto;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pg-presets {
  min-inline-size: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.pg-stage-tools {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-inline-start: auto;
}

.pg-tool,
.pg-width,
.pg-row-reset,
.pg-reset-all {
  border: none;
  background: none;
  color: var(--ui-text-muted);
  font: inherit;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 120ms var(--ui-ease-out);
}

.pg-tool {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 7px;
}

.pg-width {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  block-size: 1.5rem;
  padding-inline: 0.5rem;
  border-radius: 999px;
  background: var(--ui-surface);
  box-shadow: 0 0 0 1px var(--ui-border);
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}

@media (hover: hover) and (pointer: fine) {
  .pg-tool:hover,
  .pg-row-reset:hover,
  .pg-reset-all:hover:not(:disabled) {
    background: var(--ui-muted-hover);
    color: var(--ui-text);
  }
  .pg-width:hover {
    color: var(--ui-text);
  }
}

.pg-tool:active,
.pg-width:active,
.pg-row-reset:active,
.pg-reset-all:active:not(:disabled) {
  transform: scale(0.96);
}

/* The frame's resize grip: quiet until you're over the stage. */
.pg-handle {
  position: absolute;
  inset-inline-end: 0.75rem;
  inset-block-start: 50%;
  inline-size: 4px;
  block-size: 2.5rem;
  translate: 0 -50%;
  border-radius: 999px;
  background: var(--ui-border-strong);
  cursor: ew-resize;
  touch-action: none;
  opacity: 0;
  transition:
    opacity 150ms ease,
    background-color 150ms ease;
}

.pg-handle::before {
  content: '';
  position: absolute;
  inset: -0.75rem -0.5rem;
}

.playground-stage:hover .pg-handle,
.pg-handle:focus-visible,
.playground-preview[data-sized] .pg-handle {
  opacity: 1;
}

.pg-handle:hover,
.pg-handle:active {
  background: var(--ui-text-muted);
}

.pg-handle:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.pg-rows {
  display: contents;
}

/* The panel matches the stage's height and scrolls on its own; the fade at
   either edge says there's more. */
.playground--next .playground-controls {
  position: relative;
  grid-area: controls;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 30rem;
  padding: 0;
  border-left: 1px solid var(--ui-border);
  background: none;
  overflow: hidden;
}

.playground--next .pg-rows {
  position: relative;
  display: block;
  flex: 1;
  min-block-size: 0;
  padding-block-end: 0.75rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pg-inspector-head {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.5rem 0.375rem 1rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.pg-code-label {
  margin-inline-end: auto;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.pg-count {
  margin-inline-start: 0.25rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

.pg-more {
  position: absolute;
  inset-block-end: 0.625rem;
  inset-inline-start: 50%;
  translate: -50% 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  block-size: 1.625rem;
  padding-inline: 0.625rem;
  border: none;
  border-radius: 999px;
  background: var(--ui-surface);
  /* Floats over the rows, so it needs real lift to read as a control. */
  box-shadow:
    0 0 0 1px var(--ui-border),
    0 1px 2px rgb(0 0 0 / 0.06),
    0 6px 16px rgb(0 0 0 / 0.14);
  color: var(--ui-text);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    scale 120ms var(--ui-ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .pg-more:hover {
    background: var(--ui-muted);
  }
}

:root[data-theme='dark'] .pg-more {
  box-shadow:
    0 0 0 1px var(--ui-border-strong),
    0 6px 16px rgb(0 0 0 / 0.5);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .pg-more {
    box-shadow:
      0 0 0 1px var(--ui-border-strong),
      0 6px 16px rgb(0 0 0 / 0.5);
  }
}

.pg-more:active {
  scale: 0.96;
}

.pg-more-enter-active,
.pg-more-leave-active {
  transition:
    opacity 150ms var(--ui-ease-out),
    transform 150ms var(--ui-ease-out);
}

.pg-more-enter-from,
.pg-more-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.pg-reset-all {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  block-size: 1.625rem;
  padding-inline: 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.pg-reset-all:disabled {
  opacity: 0.45;
  cursor: default;
}

.playground--next .control-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8.75rem 1.5rem;
  align-items: center;
  gap: 0.75rem;
  min-block-size: 2.5rem;
  padding: 0.25rem 0.5rem 0.25rem 1rem;
}

.playground--next .control-row label {
  gap: 0.5rem;
  min-inline-size: 0;
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.8125rem;
  font-weight: 450;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ui-text);
  white-space: nowrap;
}

/* Changed from its starting value: a dot in the gutter, so labels never shift. */
.playground--next .control-row[data-changed]::before {
  content: '';
  position: absolute;
  inset-inline-start: 0.375rem;
  inset-block-start: 50%;
  inline-size: 5px;
  block-size: 5px;
  margin-block-start: -2.5px;
  border-radius: 999px;
  background: var(--ui-primary);
}

.playground--next .control-row :deep(.ui-switch) {
  justify-self: start;
}

.pg-row-reset {
  display: grid;
  place-items: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  border-radius: 6px;
}

.pg-row-reset:disabled {
  visibility: hidden;
}

/* Everything stays visible; the divider just says where the everyday props end. */
.pg-group-label {
  margin: 0.625rem 1rem 0.25rem;
  padding-block-start: 0.875rem;
  border-block-start: 1px solid var(--ui-border);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

/* Stacked on narrow cards; the stage sticks so the preview stays in view while
   you work down the props. */
@container (max-width: 40rem) {
  .playground--next .playground-stage {
    position: sticky;
    inset-block-start: var(--docs-header-height);
    z-index: 2;
    background: var(--ui-surface);
    border-block-end: 1px solid var(--ui-border);
  }
  .playground--next .playground-preview {
    min-height: 11rem;
    max-height: 16rem;
  }
  .playground--next .playground-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'stage'
      'controls';
  }
  .playground--next .playground-controls {
    max-height: none;
    border-left: none;
  }
  .playground--next .pg-rows {
    overflow: visible;
  }
  .playground--next .control-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 11rem) 1.5rem;
  }
}

@container (min-width: 40rem) and (max-width: 50rem) {
  .playground--next .playground-body {
    grid-template-columns: minmax(0, 1fr) 20rem;
  }
  .playground--next .control-row {
    grid-template-columns: minmax(0, 1fr) 7.5rem 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pg-handle {
    transition: none;
  }
  .pg-more-enter-from,
  .pg-more-leave-to {
    transform: none;
  }
}
</style>
