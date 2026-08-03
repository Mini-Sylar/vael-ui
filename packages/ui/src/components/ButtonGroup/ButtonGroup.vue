<template>
  <div
    ref="root"
    role="group"
    :aria-label="ariaLabel"
    :class="rootPart.class"
    :style="rootPart.style"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import './ButtonGroup.css'
import { computed, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const props = withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical'
    ariaLabel?: string
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { orientation: 'horizontal', ariaLabel: undefined, ui: undefined },
)

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.buttonGroup,
  () => props.ui,
)

const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-button-group',
    props.orientation === 'vertical' && 'ui-button-group--vertical',
  ),
)

defineExpose({ el: root })
</script>
