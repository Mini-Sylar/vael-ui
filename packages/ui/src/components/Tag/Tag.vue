<template>
  <span ref="root" :class="rootPart.class" :style="rootPart.style">
    <span v-if="$slots.icon" class="ui-tag-icon" aria-hidden="true"><slot name="icon" /></span>
    <span class="ui-tag-label"><slot /></span>
  </span>
</template>

<!-- Standalone status label (vs Badge's overlay counter). Soft tinted background; translateY correction for glyph centering. Comment outside <template> to prevent attrs fallthrough. -->
<script setup lang="ts">
import './Tag.css'
import { computed, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'muted' | 'success' | 'warning' | 'danger' | 'info'
    size?: 'sm' | 'md'
    /** Fully pill-rounded instead of the default small label corners. */
    pill?: boolean
    ui?: Partial<{ root: UiPartValue; icon: UiPartValue }>
  }>(),
  { variant: 'muted', size: 'md', pill: false },
)

defineSlots<{
  default(): unknown
  /** A small leading glyph (a dot, a checkmark) — sized to match the text, not a full icon box. */
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

defineExpose({ el: root })
</script>
