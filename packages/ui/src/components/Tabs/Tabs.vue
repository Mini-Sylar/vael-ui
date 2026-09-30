<template>
  <div
    ref="list"
    role="tablist"
    :aria-orientation="props.orientation === 'vertical' ? 'vertical' : undefined"
    :class="listPart.class"
    :style="listPart.style"
    @keydown="onKeydown"
    v-bind="attrs"
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

/** Active tab value. */
const active = defineModel<T>('active', { required: true })

const props = withDefaults(
  defineProps<{
    /** Tab values, in order; drives keyboard navigation. */
    items: T[]
    /** Lays the tabs out in a row or a column; arrow keys follow the axis. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'
    /**
     * `'automatic'`: arrow keys select. `'manual'`: arrow keys move focus only, and `Enter` or `Space` selects.
     * @default 'automatic'
     */
    activation?: 'automatic' | 'manual'
    /** Class and style overrides for each part. */
    ui?: Partial<{ list: UiPartValue; item: UiPartValue; indicator: UiPartValue }>
  }>(),
  { orientation: 'horizontal', activation: 'automatic' },
)

const emit = defineEmits<{
  /** Fires when you select a different tab. */
  change: [item: T]
}>()

defineSlots<{
  /** The tab buttons: bind `itemProps(item)` on each, and `indicatorProps()` on an optional sibling
   * for the sliding highlight. */
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

defineExpose({
  /** Tab list (root) element. */
  listEl,
})
</script>
