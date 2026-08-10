<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="indeterminate ? undefined : clampedValue"
    :aria-label="label"
    :data-state="state"
  >
    <div :class="trackPart.class" :style="trackPart.style">
      <div ref="fill" :class="fillPart.class" :style="[fillStyle, fillPart.style]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import './Progress.css'
import '../shared/tokens.css'
import { computed, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const props = withDefaults(
  defineProps<{
    /** `null`/`undefined` renders the indeterminate (looping) state. */
    value?: number | null
    max?: number
    label?: string
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
    /** Track thickness. */
    size?: 'sm' | 'md'
    ui?: Partial<{ root: UiPartValue; track: UiPartValue; fill: UiPartValue }>
  }>(),
  { max: 100, variant: 'primary', size: 'md' },
)

const indeterminate = computed(() => props.value == null)
const clampedValue = computed(() => {
  if (props.value == null) return 0
  return Math.min(props.max, Math.max(0, props.value))
})
const state = computed(() => {
  if (indeterminate.value) return 'indeterminate'
  return clampedValue.value >= props.max ? 'complete' : 'loading'
})
// Custom property (not inline transform) allows motion-v/GSAP consumers to drive fillEl directly.
const fillStyle = computed(() => ({
  '--ui-progress-scale': String(props.max > 0 ? clampedValue.value / props.max : 0),
}))

const root = useTemplateRef<HTMLElement>('root')
const fillEl = useTemplateRef<HTMLElement>('fill')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.progress,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-progress',
    `ui-progress--${props.size}`,
    `ui-progress--${props.variant}`,
  ),
)
const trackPart = computed(() => resolveUiPart(cx, themedUi()?.track, 'ui-progress-track'))
const fillPart = computed(() => resolveUiPart(cx, themedUi()?.fill, 'ui-progress-fill'))

defineExpose({ el: root, fillEl })
</script>
