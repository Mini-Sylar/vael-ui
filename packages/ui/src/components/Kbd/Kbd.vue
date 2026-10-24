<template>
  <kbd ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="attrs"><slot /></kbd>
</template>

<!--
  A single keyboard key/shortcut glyph ("⌘", "K", "Esc") — inline, tiny,
  meant to sit next to a label or inside a tooltip/menu-item shortcut hint.
  No variant prop: unlike Tag, a kbd key's whole visual language IS "this is
  a physical key" — there's no status/severity reading to vary.

  Comment stays outside <template> — see Button.vue for why.
-->
<script setup lang="ts">
import './Kbd.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { KbdMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** How it moves: its appearance (`{ initial: { root: { opacity: 0, y: 2 } } }`). `false` turns its own animation off. */
    motion?: KbdMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  {
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

defineSlots<{
  /** Key or shortcut text, e.g. `⌘` or `Esc`. */
  default(): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const parts = useStateMotion({
  key: 'kbd',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-kbd' },
  states: () => ({}),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.kbd,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-kbd'))

defineExpose({
  /** Root element. */
  el: root,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
