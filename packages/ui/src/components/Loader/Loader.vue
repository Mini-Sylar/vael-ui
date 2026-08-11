<template>
  <span
    ref="root"
    v-bind="attrs"
    :class="rootPart.class"
    :style="[rootStyle, rootPart.style]"
    :role="label ? 'status' : undefined"
    :aria-labelledby="label ? labelId : undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <span v-if="label" :id="labelId" class="ui-loader-label">{{ label }}</span>
  </span>
</template>

<!-- Template-adjacent comment prevents attrs fallthrough on single-root component. -->
<script setup lang="ts">
import './Loader.css'
import '../shared/tokens.css'
import '../shared/loader-spinner.css'
import { computed, useAttrs, useId, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = defineProps<{
  /** Any CSS length. Sets the root's font-size — the ring is sized in `em`, so it scales with it. */
  size?: string
  /** Renders role="status" with visually-hidden text as the accessible name. Omit to make the loader aria-hidden. */
  label?: string
  ui?: Partial<{ root: UiPartValue }>
}>()

const labelId = useId()
const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.loader,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-loader'))
const rootStyle = computed(() => (props.size ? { fontSize: props.size } : undefined))

defineExpose({ el: root })
</script>
