<template>
  <span
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    aria-hidden="true"
    v-bind="attrs"
  >
    <span v-if="$slots.default" class="ui-skeleton-content"><slot /></span>
  </span>
</template>

<script setup lang="ts">
import './Skeleton.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /**
     * `'text'`: a `1em`-tall rounded line. `'circle'`: round, with `aspect-ratio: 1`. `'rect'`: `--ui-radius` corners; content or `ui.root` sets its size.
     * @default 'text'
     */
    variant?: 'text' | 'rect' | 'circle'
    /** Shows the shimmer animation. @default true */
    animated?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { variant: 'text', animated: true },
)

defineSlots<{
  /** Placeholder content that sizes the skeleton; it renders hidden. */
  default(): unknown
}>()

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

defineExpose({
  /** Root element. */
  el: root,
})
</script>
