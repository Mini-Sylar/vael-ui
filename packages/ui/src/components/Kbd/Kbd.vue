<template>
  <kbd ref="root" v-bind="attrs" :class="rootPart.class" :style="rootPart.style"><slot /></kbd>
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

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  {},
)

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.kbd,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-kbd'))

defineExpose({ el: root })
</script>
