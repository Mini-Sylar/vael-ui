<template>
  <span ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="attrs">
    <span v-if="$slots.icon" :class="iconPart.class" :style="iconPart.style" aria-hidden="true"
      ><slot name="icon"
    /></span>
    <span :class="labelPart.class" :style="labelPart.style"><slot /></span>
  </span>
</template>

<!-- Standalone status label (vs Badge's overlay counter). Soft tinted background; translateY correction for glyph centering. Comment outside <template> to prevent attrs fallthrough. -->
<script setup lang="ts">
import './Tag.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Color variant. @default 'muted' */
    variant?: 'primary' | 'muted' | 'success' | 'warning' | 'danger' | 'info'
    /** Text size and padding. @default 'md' */
    size?: 'sm' | 'md'
    /** Fully pill-rounded instead of the default small label corners. @default false */
    pill?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; icon: UiPartValue; label: UiPartValue }>
  }>(),
  { variant: 'muted', size: 'md', pill: false },
)

defineSlots<{
  /** Tag label. */
  default(): unknown
  /** Small leading glyph, such as a dot or checkmark, sized to match the text rather than a full icon box. */
  icon(): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.tag,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-tag',
    `ui-tag--${props.variant}`,
    `ui-tag--${props.size}`,
    props.pill && 'ui-tag--pill',
  ),
)
const iconPart = computed(() => resolveUiPart(cx, themedUi()?.icon, 'ui-tag-icon'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-tag-label'))

defineExpose({
  /** Root element. */
  el: root,
})
</script>
