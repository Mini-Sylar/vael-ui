<template>
  <span
    ref="root"
    :class="rootPart.class"
    :style="[rootStyle, rootPart.style]"
    :role="label ? 'status' : undefined"
    :aria-labelledby="label ? labelId : undefined"
    :aria-hidden="label ? undefined : 'true'"
    :data-motion="props.motion === false ? 'off' : undefined"
    v-bind="attrs"
  >
    <template v-if="builtIn">
      <span v-for="n in LOADER_PARTS[builtIn]" :key="n" class="ui-loader-part" aria-hidden="true" />
    </template>
    <component :is="type" v-else aria-hidden="true" />
    <span v-if="label" :id="labelId" class="ui-loader-label">{{ label }}</span>
  </span>
</template>

<!-- Template-adjacent comment prevents attrs fallthrough on single-root component. -->
<script setup lang="ts">
import './Loader.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import '../shared/loader-spinner.css'
import { computed, useAttrs, useId, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { LoaderMotion } from '../../motion/types'
import { LOADER_PARTS, useLoaderType } from '../../composables/loaderType'
import type { LoaderSource } from '../../composables/loaderType'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Any CSS length. Sets the root's `font-size`, and the `em`-based ring scales with it. */
    size?: string
    /** Renders `role="status"` with visually hidden text as the accessible name. Omit it to make the loader `aria-hidden`. */
    label?: string
    /** The animation: `'ring'`, `'dots'`, `'bars'`, `'comet'` or `'dither'`, or your own component in the same 1em box. Unset, it follows the nearest ConfigProvider's `loaderType`. @default 'ring' */
    type?: LoaderSource
    /** How it moves: its appearance (`{ initial: { root: { opacity: 0, scale: 0.6 } } }`). `false` holds it still, for a static busy mark. */
    motion?: LoaderMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  {
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

const labelId = useId()
const root = useTemplateRef<HTMLElement>('root')
const parts = useStateMotion({
  key: 'loader',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-loader' },
  states: () => ({}),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.loader,
  () => props.ui,
)
const type = useLoaderType(() => props.type)
const builtIn = computed(() => (typeof type.value === 'string' ? type.value : null))
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-loader', `ui-loader--${builtIn.value ?? 'custom'}`),
)
const rootStyle = computed(() => (props.size ? { fontSize: props.size } : undefined))

defineExpose({
  /** Root element. */
  el: root,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
