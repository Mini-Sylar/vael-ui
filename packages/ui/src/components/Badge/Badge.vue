<template>
  <span ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="attrs">
    <span
      v-if="!dot"
      :key="count"
      :class="contentClass"
      :style="contentStyle()"
      :data-direction="direction"
    >
      <slot>{{ display }}</slot>
    </span>
  </span>
</template>

<!-- No positioning props: composition via consumer's wrapper (Avatar's #badge slot), not component props -->
<script setup lang="ts">
import './Badge.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, shallowRef, useAttrs, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { BadgeMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Color variant. @default 'primary' */
    variant?: 'primary' | 'muted' | 'success' | 'warning' | 'danger' | 'info'
    /** Number to display; capped by `max`. */
    count?: number
    /** Counts above this render as `"${max}+"`. @default 99 */
    max?: number
    /** Minimal size with no content: a plain presence dot. @default false */
    dot?: boolean
    /**
     * `false` drops the built-in count-change animation so you can drive your own.
     * @default true
     */
    animated?: boolean
    /** How it moves: its appearance (`{ initial: { root: { opacity: 0, scale: 0.6 } } }`). `false` turns its own appearance off; `animated` keeps the count change. */
    motion?: BadgeMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  {
    variant: 'primary',
    max: 99,
    dot: false,
    animated: true,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

defineSlots<{
  /** Overrides `count` entirely; anything you render here wins. */
  default(): unknown
}>()

const display = computed(() => {
  if (props.count == null) return ''
  return props.count > props.max ? `${props.max}+` : String(props.count)
})

const root = useTemplateRef<HTMLElement>('root')
const parts = useStateMotion({
  key: 'badge',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-badge' },
  states: () => ({}),
})
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

const direction = shallowRef<'up' | 'down'>('up')
watch(
  () => props.count,
  (next, prev) => {
    if (next != null && prev != null) direction.value = next < prev ? 'down' : 'up'
  },
  { flush: 'sync' },
)

// Animate only on state-CHANGE: non-reactive closure flag (like useTabIndicator's measuredOnce) prevents initial-render animation.
let contentMounted = false
function contentStyle(): Record<string, string> | undefined {
  if (!props.animated) return undefined
  const style = contentMounted ? undefined : { animationDuration: '0s' }
  contentMounted = true
  return style
}

defineExpose({
  /** Root element. */
  el: root,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
