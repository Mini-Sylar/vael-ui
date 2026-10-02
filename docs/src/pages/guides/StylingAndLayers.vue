<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('stylingLayers.title') }}</h1>
    <i18n-t keypath="stylingLayers.intro" tag="p" scope="global">
      <template #layer><code>@layer ui-components</code></template>
    </i18n-t>

    <h2 id="cascade-layers">{{ t('stylingLayers.cascadeLayersTitle') }}</h2>
    <CodeBlock
      code="/* your app's main stylesheet, e.g. style.css */
@layer app-base, ui-components;

@layer app-base {
  * { margin: 0; box-sizing: border-box; }
  button, input, textarea, select { font: inherit; }
}"
    />
    <CodeBlock
      lang="typescript"
      code="// main.ts
import './style.css'  // your base layer, loads first"
    />

    <p>{{ t('stylingLayers.orderNote') }}</p>

    <i18n-t keypath="stylingLayers.overrideNote" tag="p" scope="global">
      <template #code><code>ui</code></template>
      <template #link>
        <RouterLink to="/docs/guides/tailwind">{{
          t('stylingLayers.overrideNoteLink')
        }}</RouterLink>
      </template>
    </i18n-t>

    <h2 id="css-variables">{{ t('stylingLayers.cssVariablesTitle') }}</h2>
    <p>{{ t('stylingLayers.cssVariablesIntro') }}</p>
    <CodeBlock
      lang="css"
      code="/* your own global stylesheet, unlayered so it always wins */
:root {
  --ui-primary: #6366f1;
  --ui-radius: 6px;
}"
    />
    <p v-html="t('stylingLayers.cssVariablesThemeNote')" />

    <h3>{{ t('stylingLayers.colorsTitle') }}</h3>
    <table>
      <thead>
        <tr>
          <th>{{ t('stylingLayers.variable') }}</th>
          <th>{{ t('stylingLayers.default') }}</th>
          <th>{{ t('stylingLayers.description') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in colorRows" :key="row.name">
          <td>
            <code>{{ row.name }}</code>
          </td>
          <td>
            <code>{{ row.value }}</code>
          </td>
          <td>{{ row.description }}</td>
        </tr>
      </tbody>
    </table>

    <h3>{{ t('stylingLayers.shapeTitle') }}</h3>
    <table>
      <thead>
        <tr>
          <th>{{ t('stylingLayers.variable') }}</th>
          <th>{{ t('stylingLayers.default') }}</th>
          <th>{{ t('stylingLayers.description') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in shapeRows" :key="row.name">
          <td>
            <code>{{ row.name }}</code>
          </td>
          <td>
            <code>{{ row.value }}</code>
          </td>
          <td>{{ row.description }}</td>
        </tr>
      </tbody>
    </table>

    <h3>{{ t('stylingLayers.elevationTitle') }}</h3>
    <table>
      <thead>
        <tr>
          <th>{{ t('stylingLayers.variable') }}</th>
          <th>{{ t('stylingLayers.default') }}</th>
          <th>{{ t('stylingLayers.description') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in elevationRows" :key="row.name">
          <td>
            <code>{{ row.name }}</code>
          </td>
          <td>
            <code>{{ row.value }}</code>
          </td>
          <td>{{ row.description }}</td>
        </tr>
      </tbody>
    </table>

    <h3>{{ t('stylingLayers.motionTitle') }}</h3>
    <table>
      <thead>
        <tr>
          <th>{{ t('stylingLayers.variable') }}</th>
          <th>{{ t('stylingLayers.default') }}</th>
          <th>{{ t('stylingLayers.description') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in motionRows" :key="row.name">
          <td>
            <code>{{ row.name }}</code>
          </td>
          <td>
            <code>{{ row.value }}</code>
          </td>
          <td>{{ row.description }}</td>
        </tr>
      </tbody>
    </table>

    <Message
      variant="info"
      :title="t('stylingLayers.bundlerNoteTitle')"
      class="callout"
      :ui="{ root: 'callout-info' }"
    >
      {{ t('stylingLayers.bundlerNote') }}
      <CodeBlock
        lang="typescript"
        code="// main.ts
import './style.css'        // your base layer, loads first
import 'vael-ui/style.css'  // sorts after app-base, if you use it"
        class="callout-code"
      />
    </Message>

    <h2 id="advanced">{{ t('stylingLayers.advancedTitle') }}</h2>
    <p>{{ t('stylingLayers.advancedNote') }}</p>
    <Collapsible class="advanced">
      <template #trigger="{ open }">
        <Button variant="outline" block class="advanced-trigger">
          {{ t('stylingLayers.joinTitle') }}
          <template #trailing>
            <PhCaretDown class="advanced-chevron" :class="{ 'advanced-chevron--open': open }" />
          </template>
        </Button>
      </template>
      <div class="advanced-body">
        <p v-html="t('stylingLayers.joinIntro')" />
        <CodeBlock
          code='<Field label="Handle">
  <template #prepend>@</template>
  <input class="my-input" data-ui-frame="md" />
</Field>'
        />
        <p
          v-html="t('stylingLayers.joinLayerNote', { layer: '<code>@layer ui-components</code>' })"
        />
        <CodeBlock
          lang="css"
          code="/* unlayered, so Field's own join rules can't reach .my-input */
.ui-field[data-join-start] .my-input {
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
.ui-field[data-join-end] .my-input {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
.ui-field[data-focused] .my-input {
  border-color: var(--ui-primary);
}"
        />
        <p v-html="t('stylingLayers.joinCellNote')" />

        <h3>{{ t('stylingLayers.attributesTitle') }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('stylingLayers.attribute') }}</th>
              <th>{{ t('stylingLayers.setWhen') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in fieldAttributeRows" :key="row.name">
              <td>
                <code>{{ row.name }}</code>
              </td>
              <td>{{ row.description }}</td>
            </tr>
          </tbody>
        </table>

        <h3>{{ t('stylingLayers.variablesTitle') }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('stylingLayers.variable') }}</th>
              <th>{{ t('stylingLayers.default') }}</th>
              <th>{{ t('stylingLayers.description') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in fieldVariableRows" :key="row.name">
              <td>
                <code>{{ row.name }}</code>
              </td>
              <td>
                <code>{{ row.value }}</code>
              </td>
              <td>{{ row.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Collapsible>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Button, Collapsible, Message } from 'vael-ui'
import { PhCaretDown } from '@phosphor-icons/vue'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import { useBreadcrumbSchema } from '../../composables/useBreadcrumbSchema'

const { t } = useI18n()
useHead({ title: () => t('stylingLayers.title') })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('stylingLayers.title'), url: 'https://vael-ui.dev/docs/guides/styling-and-layers' },
])

interface TokenRow {
  name: string
  value: string
  description: string
}

const colorRows = computed<TokenRow[]>(() => [
  { name: '--ui-primary', value: '#18181b', description: t('stylingLayers.rows.primary') },
  {
    name: '--ui-primary-hover',
    value: '#27272a',
    description: t('stylingLayers.rows.primaryHover'),
  },
  {
    name: '--ui-primary-contrast',
    value: '#fafafa',
    description: t('stylingLayers.rows.primaryContrast'),
  },
  { name: '--ui-muted', value: '#f4f4f5', description: t('stylingLayers.rows.muted') },
  { name: '--ui-muted-hover', value: '#e4e4e7', description: t('stylingLayers.rows.mutedHover') },
  {
    name: '--ui-danger',
    value: 'oklch(0.586 0.253 26)',
    description: t('stylingLayers.rows.danger'),
  },
  { name: '--ui-danger-hover', value: '—', description: t('stylingLayers.rows.hoverVariant') },
  {
    name: '--ui-danger-contrast',
    value: '#ffffff',
    description: t('stylingLayers.rows.contrastVariant'),
  },
  {
    name: '--ui-success',
    value: 'oklch(71.335% 0.15901 160.899)',
    description: t('stylingLayers.rows.success'),
  },
  { name: '--ui-success-hover', value: '—', description: t('stylingLayers.rows.hoverVariant') },
  {
    name: '--ui-success-contrast',
    value: '#ffffff',
    description: t('stylingLayers.rows.contrastVariant'),
  },
  {
    name: '--ui-warning',
    value: 'oklch(0.666 0.179 58.315)',
    description: t('stylingLayers.rows.warning'),
  },
  { name: '--ui-warning-hover', value: '—', description: t('stylingLayers.rows.hoverVariant') },
  {
    name: '--ui-warning-contrast',
    value: '#ffffff',
    description: t('stylingLayers.rows.contrastVariant'),
  },
  { name: '--ui-info', value: '#2563eb', description: t('stylingLayers.rows.info') },
  { name: '--ui-info-hover', value: '#1d4ed8', description: t('stylingLayers.rows.hoverVariant') },
  {
    name: '--ui-info-contrast',
    value: '#ffffff',
    description: t('stylingLayers.rows.contrastVariant'),
  },
  { name: '--ui-surface', value: '#ffffff', description: t('stylingLayers.rows.surface') },
  { name: '--ui-text', value: '#18181b', description: t('stylingLayers.rows.text') },
  { name: '--ui-text-muted', value: '#71717a', description: t('stylingLayers.rows.textMuted') },
  { name: '--ui-border', value: '#e4e4e7', description: t('stylingLayers.rows.border') },
  {
    name: '--ui-border-strong',
    value: '#d4d4d8',
    description: t('stylingLayers.rows.borderStrong'),
  },
  { name: '--ui-overlay', value: 'rgb(0 0 0 / 0.4)', description: t('stylingLayers.rows.overlay') },
])

const shapeRows = computed<TokenRow[]>(() => [
  { name: '--ui-radius', value: '10px', description: t('stylingLayers.rows.radius') },
  {
    name: '--ui-radius-surface',
    value: 'min(var(--ui-radius), 1rem)',
    description: t('stylingLayers.rows.radiusSurface'),
  },
])

const elevationRows = computed<TokenRow[]>(() => [
  { name: '--ui-z-dialog', value: '50', description: t('stylingLayers.rows.zDialog') },
  { name: '--ui-z-popover', value: '55', description: t('stylingLayers.rows.zPopover') },
  { name: '--ui-z-toast', value: '60', description: t('stylingLayers.rows.zToast') },
  { name: '--ui-z-tooltip', value: '70', description: t('stylingLayers.rows.zTooltip') },
  {
    name: '--ui-panel-shadow',
    value: '0 0 0 1px …, 0 8px 24px …, 0 24px 48px …',
    description: t('stylingLayers.rows.panelShadow'),
  },
])

const motionRows = computed<TokenRow[]>(() => [
  {
    name: '--ui-ease-out',
    value: 'cubic-bezier(0.23, 1, 0.32, 1)',
    description: t('stylingLayers.rows.easeOut'),
  },
  {
    name: '--ui-ease-in-out',
    value: 'cubic-bezier(0.77, 0, 0.175, 1)',
    description: t('stylingLayers.rows.easeInOut'),
  },
  {
    name: '--ui-ease-drawer',
    value: 'cubic-bezier(0.32, 0.72, 0, 1)',
    description: t('stylingLayers.rows.easeDrawer'),
  },
  {
    name: '--ui-duration-drawer',
    value: '500ms',
    description: t('stylingLayers.rows.durationDrawer'),
  },
  {
    name: '--ui-duration-press',
    value: '160ms',
    description: t('stylingLayers.rows.durationPress'),
  },
  {
    name: '--ui-duration-enter',
    value: '200ms',
    description: t('stylingLayers.rows.durationEnter'),
  },
  { name: '--ui-duration-exit', value: '150ms', description: t('stylingLayers.rows.durationExit') },
  {
    name: '--ui-duration-tooltip',
    value: '125ms',
    description: t('stylingLayers.rows.durationTooltip'),
  },
  {
    name: '--ui-duration-tooltip-exit',
    value: '100ms',
    description: t('stylingLayers.rows.durationTooltipExit'),
  },
  {
    name: '--ui-duration-toast',
    value: '400ms',
    description: t('stylingLayers.rows.durationToast'),
  },
  {
    name: '--ui-duration-toast-exit',
    value: '200ms',
    description: t('stylingLayers.rows.durationToastExit'),
  },
  { name: '--ui-ease-toast', value: 'ease', description: t('stylingLayers.rows.easeToast') },
  { name: '--ui-toast-offset', value: '1rem', description: t('stylingLayers.rows.toastOffset') },
])

const fieldAttributeRows = computed(() => [
  { name: 'data-ui-frame', description: t('stylingLayers.rows.joinFrame') },
  { name: 'data-join-start', description: t('stylingLayers.rows.joinStart') },
  { name: 'data-join-end', description: t('stylingLayers.rows.joinEnd') },
  { name: 'data-focused', description: t('stylingLayers.rows.joinFocused') },
  { name: 'data-invalid', description: t('stylingLayers.rows.joinInvalid') },
  { name: 'data-attached', description: t('stylingLayers.rows.joinAttached') },
])

const fieldVariableRows = computed<TokenRow[]>(() => [
  {
    name: '--ui-field-cell-bg',
    value: 'var(--ui-muted)',
    description: t('stylingLayers.rows.cellBg'),
  },
  {
    name: '--ui-field-cell-color',
    value: 'var(--ui-text-muted)',
    description: t('stylingLayers.rows.cellColor'),
  },
  {
    name: '--ui-field-label-width',
    value: 'max-content',
    description: t('stylingLayers.rows.labelWidth'),
  },
])

const tocLinks = computed(() => [
  { id: 'cascade-layers', label: t('stylingLayers.cascadeLayersTitle') },
  { id: 'css-variables', label: t('stylingLayers.cssVariablesTitle') },
  { id: 'advanced', label: t('stylingLayers.advancedTitle') },
])
</script>

<style scoped>
.advanced-trigger {
  justify-content: space-between;
}

.advanced-chevron {
  transition: rotate var(--ui-duration-press) var(--ui-ease-out);
}

.advanced-chevron--open {
  rotate: 180deg;
}

.advanced-body {
  padding-block-start: 1rem;
}

.callout {
  margin-bottom: 1.25rem;
}

:deep(.callout-info) {
  background: color-mix(in oklch, var(--ui-info) 10%, var(--ui-surface));
  border-color: color-mix(in oklch, var(--ui-info) 35%, var(--ui-border-strong));
}

.callout-code {
  margin-top: 0.625rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin-top: 1rem;
  margin-bottom: 2rem;
}

th,
td {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  vertical-align: top;
}

thead th {
  color: var(--ui-text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--ui-muted);
}
</style>
