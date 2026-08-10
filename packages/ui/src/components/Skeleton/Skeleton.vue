<template>
  <span ref="root" :class="rootPart.class" :style="rootPart.style" aria-hidden="true">
    <span v-if="$slots.default" class="ui-skeleton-content"><slot /></span>
  </span>
</template>

<!-- Slotted content (visibility: hidden) sizes skeleton; no ARIA role (consumer pairs with live region). -->
<script setup lang="ts">
import './Skeleton.css'
import '../shared/tokens.css'
import { computed, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const props = withDefaults(
  defineProps<{
    /** `text` (default): 1em-tall rounded line. `circle`: round, aspect-ratio 1. `rect`: `--ui-radius` corners, sized by content or `ui.root`. */
    variant?: 'text' | 'rect' | 'circle'
    animated?: boolean
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { variant: 'text', animated: true },
)

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.skeleton,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-skeleton',
    `ui-skeleton--${props.variant}`,
    props.animated && 'ui-skeleton--animated',
  ),
)

defineExpose({ el: root })
</script>
