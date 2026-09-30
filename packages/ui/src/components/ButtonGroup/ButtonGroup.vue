<template>
  <div
    ref="root"
    role="group"
    :aria-label="ariaLabel"
    :class="rootPart.class"
    :style="rootPart.style"
    v-bind="attrs"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import './ButtonGroup.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Whether the buttons sit in a row or a column. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'
    /** Accessible name for the group. */
    ariaLabel?: string
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { orientation: 'horizontal', ariaLabel: undefined, ui: undefined },
)

defineSlots<{
  /** The grouped buttons. */
  default(): unknown
}>()

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

defineExpose({
  /** Root element. */
  el: root,
})
</script>
