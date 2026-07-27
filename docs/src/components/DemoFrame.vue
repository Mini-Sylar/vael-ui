<template>
  <section class="demo-frame">
    <div v-if="items.length > 1" class="demo-toolbar">
      <SelectButton v-model="variant" size="sm" :items="items" :allow-empty="false" />
    </div>
    <div class="demo-preview">
      <Transition name="demo-crossfade" mode="out-in">
        <p v-if="!hasActiveDemo" key="empty" class="no-demo">
          No live demo for this component yet.
        </p>
        <component v-else-if="activeComponent" :is="activeComponent" :key="`${name}-${variant}`" />
      </Transition>
    </div>
    <details class="demo-code">
      <summary>{{ t('component.code') }}</summary>
      <CodeBlock :code="code" />
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { SelectButton } from 'vael-ui'
import CodeBlock from './CodeBlock.vue'
import { defaultVariant, type DemoVariant } from '../preferences'

const props = defineProps<{
  name: string
  vdomComponent: Component | null
  vaporComponent: Component | null
  vdomCode: string
  vaporCode: string
}>()

const { t } = useI18n()

// DataTable/Pagination/Tag/Combobox each hit their own confirmed upstream Vue
// Vapor-interop bug in this docs site's async demo-loading harness (see
// nuxt/ui#6395 for the same failure class in another component library). The
// API is identical either way, so the toggle stays for visual consistency,
// but it's cosmetic here: selecting "Vapor" still renders the VDOM demo
// rather than a genuinely broken one.
const FAKE_VAPOR_TOGGLE_COMPONENTS = ['DataTable', 'Pagination', 'Tag', 'Combobox']
const isFakeVaporToggle = computed(() => FAKE_VAPOR_TOGGLE_COMPONENTS.includes(props.name))

const items = computed(() => {
  const list = []
  if (props.vdomComponent) list.push({ label: t('component.vdom'), value: 'vdom' })
  if (props.vaporComponent) list.push({ label: t('component.vapor'), value: 'vapor' })
  return list
})

// Follows the header's global VDOM/Vapor preference, falling back to VDOM
// when a page has no demo for the preferred variant (e.g. no Vapor twin).
function availableVariant(preferred: DemoVariant): DemoVariant {
  if (preferred === 'vapor' && props.vaporComponent) return 'vapor'
  return 'vdom'
}

const variant = shallowRef<DemoVariant>(availableVariant(defaultVariant.value))
watch(defaultVariant, (preferred) => (variant.value = availableVariant(preferred)))
// DemoFrame is reused across component pages (same route, different param),
// so re-apply the preference whenever navigation swaps in a new demo.
watch(
  () => props.vaporComponent,
  () => (variant.value = availableVariant(defaultVariant.value)),
)

const activeComponent = computed(() =>
  variant.value === 'vapor' && !isFakeVaporToggle.value
    ? props.vaporComponent
    : props.vdomComponent,
)
const hasActiveDemo = computed(() => Boolean(activeComponent.value))
const code = computed(() =>
  variant.value === 'vapor' && !isFakeVaporToggle.value ? props.vaporCode : props.vdomCode,
)
</script>

<style scoped>
.demo-frame {
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  overflow: hidden;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
}

.demo-crossfade-enter-active,
.demo-crossfade-leave-active {
  transition:
    opacity 150ms var(--ui-ease-out),
    filter 150ms var(--ui-ease-out);
}

.demo-crossfade-enter-from,
.demo-crossfade-leave-to {
  opacity: 0;
  filter: blur(2px);
}

@media (prefers-reduced-motion: reduce) {
  .demo-crossfade-enter-active,
  .demo-crossfade-leave-active {
    transition: opacity 150ms var(--ui-ease-out);
  }

  .demo-crossfade-enter-from,
  .demo-crossfade-leave-to {
    filter: none;
  }
}

.demo-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-muted);
}

.demo-preview {
  position: relative;
  padding: 2.5rem 2.75rem;
  min-height: 6rem;
  /* The docs chrome's Geist Variable is a docs-branding choice, not part of
     the library. Components here should show their real, unstyled default,
     which inherits system-ui unless a consumer app overrides it. */
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
}

.demo-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: radial-gradient(circle, var(--ui-border) 1px, transparent 1px);
  background-size: 20px 20px;
  /* Fades toward every edge instead of cutting off hard against the frame's
     border: a flat dot grid touching the corners read as an unfinished
     placeholder rather than a deliberate texture. */
  mask-image: radial-gradient(ellipse at center, black 55%, transparent 100%);
}

.no-demo {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
}

.demo-code {
  border-top: 1px solid var(--ui-border);
}

.demo-code summary {
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--ui-text-muted);
}

.demo-code :deep(.code-block) {
  border: none;
  border-radius: 0;
  border-top: 1px solid var(--ui-border);
}
</style>
