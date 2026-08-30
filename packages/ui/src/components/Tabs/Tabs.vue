<template>
  <div
    ref="list"
    v-bind="attrs"
    role="tablist"
    :aria-orientation="props.orientation === 'vertical' ? 'vertical' : undefined"
    :class="listPart.class"
    :style="listPart.style"
    @keydown="onKeydown"
  >
    <slot
      :active="active"
      :focused="focused"
      :select="select"
      :items="props.items"
      :item-props="itemProps"
      :indicator-props="indicatorProps"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import './Tabs.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useTabs } from '../../composables/useTabs'
import { useTabIndicator } from '../../composables/useTabIndicator'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue, UiPartStyle } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const active = defineModel<T>('active', { required: true })

const props = withDefaults(
  defineProps<{
    items: T[]
    /** Vertical layout with ↑/↓ navigation. */
    orientation?: 'horizontal' | 'vertical'
    /** `automatic` (default): arrow keys select. `manual`: arrow keys move focus only; Enter/Space selects. */
    activation?: 'automatic' | 'manual'
    ui?: Partial<{ list: UiPartValue; item: UiPartValue; indicator: UiPartValue }>
  }>(),
  { orientation: 'horizontal', activation: 'automatic' },
)

const emit = defineEmits<{
  change: [item: T]
}>()

defineSlots<{
  /**
   * Render `role="tab"` elements and optionally a sliding indicator.
   * `itemProps(item)` returns a11y/behavior wiring for one tab — spread via
   * v-bind. `indicatorProps(variant)` does the same for the optional sliding
   * highlight (`'background'` default, or `'underline'`) — bind it on a
   * sibling element of the tab buttons. `focused` tracks roving tabindex
   * (diverges from `active` in `manual` mode).
   */
  default(props: {
    active: T
    focused: T
    select: (item: T) => void
    items: T[]
    itemProps: (item: T) => {
      role: 'tab'
      class: string
      style: UiPartStyle | undefined
      'data-tab-value': string
      'aria-selected': boolean
      tabindex: 0 | -1
      onClick: () => void
    }
    indicatorProps: (variant?: 'background' | 'underline') => {
      class: string
      style: Record<string, string | undefined>
    }
  }): unknown
}>()

const listEl = useTemplateRef<HTMLElement>('list')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.tabs,
  () => props.ui,
)

const { select, onKeydown, focused } = useTabs<T>(active, {
  items: () => props.items,
  listEl,
  orientation: () => props.orientation,
  activation: () => props.activation,
  onChange: (item) => emit('change', item),
})

const listPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.list,
    'ui-tabs',
    props.orientation === 'vertical' && 'ui-tabs--vertical',
  ),
)
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-tabs-item'))
const indicatorPart = computed(() => resolveUiPart(cx, themedUi()?.indicator, 'ui-tabs-indicator'))

// Always instantiated — cheap when unused (one ResizeObserver + a watcher),
// and the alternative is calling a composable conditionally from inside a
// function returned to the template, which breaks Vue's setup-time rules.
// A consumer building a fully custom indicator (e.g. motion-v) just never
// calls `indicatorProps`; `listEl` stays exposed for that escape hatch.
const indicator = useTabIndicator(active, { listEl, orientation: () => props.orientation })

function itemProps(item: T) {
  const isManual = props.activation === 'manual'
  return {
    role: 'tab' as const,
    class: itemPart.value.class,
    style: itemPart.value.style,
    'data-tab-value': String(item),
    'aria-selected': active.value === item,
    tabindex: ((isManual ? focused.value : active.value) === item ? 0 : -1) as 0 | -1,
    onClick: () => select(item),
  }
}

function indicatorProps(variant: 'background' | 'underline' = 'background') {
  return {
    class: cx(indicatorPart.value.class, `ui-tabs-indicator--${variant}`),
    style: indicator.style.value,
  }
}

defineExpose({ listEl })
</script>
