<template>
  <span ref="root" v-bind="attrs" :class="rootPart.class" :style="rootPart.style">
    <span v-if="!dot" :key="count" :class="contentClass" :style="contentStyle()">
      <slot>{{ display }}</slot>
    </span>
  </span>
</template>

<!-- No positioning props: composition via consumer's wrapper (Avatar's #badge slot), not component props -->
<script setup lang="ts">
import './Badge.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'muted' | 'success' | 'warning' | 'danger' | 'info'
    count?: number
    /** Counts above this render as `"${max}+"`. */
    max?: number
    /** Minimal size, no content — a plain presence dot. */
    dot?: boolean
    /** `false` drops the built-in count-change animation — use when driving your own animation instead. */
    animated?: boolean
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { variant: 'primary', max: 99, dot: false, animated: true },
)

defineSlots<{
  /** Overrides `count` entirely — anything you render here wins. */
  default(): unknown
}>()

const display = computed(() => {
  if (props.count == null) return ''
  return props.count > props.max ? `${props.max}+` : String(props.count)
})

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.badge,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-badge',
    `ui-badge--${props.variant}`,
    props.dot && 'ui-badge--dot',
  ),
)
const contentClass = computed(() =>
  cx('ui-badge-content', props.animated && 'ui-badge-content--animated'),
)

// Pop only on state-CHANGE: non-reactive closure flag (like useTabIndicator's measuredOnce) prevents initial-render animation.
let contentMounted = false
function contentStyle(): Record<string, string> | undefined {
  if (!props.animated) return undefined
  const style = contentMounted ? undefined : { animationDuration: '0s' }
  contentMounted = true
  return style
}

defineExpose({ el: root })
</script>
