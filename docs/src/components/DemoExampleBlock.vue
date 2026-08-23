<template>
  <section class="demo-frame">
    <h3 v-if="showTitle" class="demo-title">{{ example.title }}</h3>
    <div class="demo-toolbar">
      <SelectButton v-model="view" size="sm" :items="viewItems" :allow-empty="false" />
      <SelectButton
        v-if="variantItems.length > 1"
        v-model="variant"
        size="sm"
        :items="variantItems"
        :allow-empty="false"
      />
    </div>
    <div v-show="view === 'preview'" class="demo-preview">
      <Transition name="demo-crossfade" mode="out-in">
        <p v-if="!activeComponent" key="empty" class="no-demo">
          No live demo for this component yet.
        </p>
        <component v-else :is="activeComponent" :key="`${name}-${example.id}-${variant}`" />
      </Transition>
    </div>
    <div v-show="view === 'code'" class="demo-code">
      <CodeBlock :code="code" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SelectButton } from 'vael-ui'
import CodeBlock from './CodeBlock.vue'
import { defaultVariant, type DemoVariant } from '../preferences'
import type { DemoExample } from './DemoFrame.vue'

const props = defineProps<{
  name: string
  example: DemoExample
  showTitle: boolean
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

const viewItems = computed(() => [
  { label: t('component.preview'), value: 'preview' },
  { label: t('component.code'), value: 'code' },
])
const view = shallowRef<'preview' | 'code'>('preview')

const variantItems = computed(() => {
  const list = []
  if (props.example.vdomComponent) list.push({ label: t('component.vdom'), value: 'vdom' })
  if (props.example.vaporComponent) list.push({ label: t('component.vapor'), value: 'vapor' })
  return list
})

// Follows the header's global VDOM/Vapor preference, falling back to VDOM
// when this example has no Vapor twin.
function availableVariant(preferred: DemoVariant): DemoVariant {
  if (preferred === 'vapor' && props.example.vaporComponent) return 'vapor'
  return 'vdom'
}

const variant = shallowRef<DemoVariant>(availableVariant(defaultVariant.value))
watch(defaultVariant, (preferred) => (variant.value = availableVariant(preferred)))
// This block is reused across component pages (same route, different param),
// so re-apply the preference whenever navigation swaps in a new example.
watch(
  () => props.example,
  () => (variant.value = availableVariant(defaultVariant.value)),
)

const activeComponent = computed(() =>
  variant.value === 'vapor' && !isFakeVaporToggle.value
    ? (props.example.vaporComponent ?? null)
    : (props.example.vdomComponent ?? null),
)
const code = computed(() =>
  variant.value === 'vapor' && !isFakeVaporToggle.value
    ? (props.example.vaporCode ?? '')
    : (props.example.vdomCode ?? ''),
)
</script>

<style scoped>
.demo-frame {
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  overflow: hidden;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
}

.demo-title {
  margin: 0;
  padding: 0.85rem 1rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
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
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
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

.demo-code :deep(.code-block) {
  border: none;
  border-radius: 0;
}
</style>
