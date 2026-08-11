<template>
  <li ref="root" v-bind="attrs" aria-hidden="true" :class="rootPart.class" :style="rootPart.style">
    <slot>
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
        <path
          d="M6 3l4 5-4 5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </slot>
  </li>
</template>

<script setup lang="ts">
import './BreadcrumbSeparator.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = defineProps<{
  ui?: Partial<{ root: UiPartValue }>
}>()

defineSlots<{
  /** Replaces the default chevron icon. */
  default(): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.breadcrumbSeparator,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-breadcrumb-separator'))

defineExpose({ el: root })
</script>
