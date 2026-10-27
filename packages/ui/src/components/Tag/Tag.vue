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
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { TagMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const rawProps = withDefaults(
  defineProps<{
    /** Color variant. @default 'muted' */
    variant?: 'primary' | 'muted' | 'success' | 'warning' | 'danger' | 'info'
    /** Text size and padding. @default 'md' */
    size?: 'sm' | 'md'
    /** Fully pill-rounded instead of the default small label corners. @default false */
    pill?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; icon: UiPartValue; label: UiPartValue }>
    /** How it moves: its appearance (`{ initial: { root: { opacity: 0, scale: 0.9 } } }`) and its press states (`{ states: { active: { root: { scale: '0.96' } } } }`). `false` turns its own animation off. */
    motion?: TagMotion
  }>(),
  {
    variant: 'muted',
    pill: false,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)
const props = withProviderDefaults(rawProps, { size: 'md' }, ['sm', 'md'])

defineSlots<{
  /** Tag label. */
  default(): unknown
  /** Small leading glyph, such as a dot or checkmark, sized to match the text rather than a full icon box. */
  icon(): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const parts = useStateMotion({
  key: 'tag',
  // A shared style's press look only on a tag you can click or focus.
  get role() {
    return attrs.onClick || attrs.tabindex !== undefined ? ('press' as const) : undefined
  },
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-tag' },
  states: () => ({}),
})
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
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
