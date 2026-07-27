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
import './style.css'        // your base layer, loads first
import 'vael-ui/style.css'  // now sorts after app-base"
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
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
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

const tocLinks = computed(() => [
  { id: 'cascade-layers', label: t('stylingLayers.cascadeLayersTitle') },
  { id: 'css-variables', label: t('stylingLayers.cssVariablesTitle') },
])
</script>

<style scoped>
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
