<template>
  <span
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-motion="props.motion ? undefined : 'off'"
    v-bind="attrs"
  >
    <Transition
      :name="props.motion ? 'ui-animated-text' : undefined"
      :css="!!props.motion"
      @before-leave="keepWidth"
      @after-leave="releaseWidth"
    >
      <span :key="value" class="ui-animated-text-value">{{ value }}</span>
    </Transition>
  </span>
</template>

<!--
  A new value blurs in as the old one blurs out, and the box eases to the new width.
-->
<script setup lang="ts">
import './AnimatedText.css'
import '../shared/tokens.css'
import { computed, Transition, useAttrs, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { withProviderDefaults } from '../../config'
import { useStateMotion } from '../../motion/useStateMotion'
import type { AnimatedTextMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const rawProps = withDefaults(
  defineProps<{
    /** The text to show. Changing it crossfades to the new text. */
    value: string
    /**
     * How it moves: its appearance (`{ initial: { root: { opacity: 0, y: 4 } } }`). `false` swaps
     * the text at once. Unset, it follows the nearest `ConfigProvider`.
     * @default true
     */
    motion?: AnimatedTextMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { motion: undefined },
)
const props = withProviderDefaults(rawProps, { motion: true })

const root = useTemplateRef<HTMLElement>('root')
const parts = useStateMotion({
  key: 'animatedText',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-animated-text' },
  states: () => ({}),
})

// Hold the old width for one frame, then ease to the new one.
let fromWidth = 0
watch(
  () => props.value,
  () => {
    fromWidth = root.value?.getBoundingClientRect().width ?? 0
  },
  { flush: 'pre' },
)
watch(
  () => props.value,
  () => {
    const el = root.value
    if (!el || !props.motion || !fromWidth) return
    el.style.inlineSize = ''
    const toWidth = el.getBoundingClientRect().width
    if (Math.abs(toWidth - fromWidth) < 0.5) return
    el.style.inlineSize = `${fromWidth}px`
    el.dataset.sizing = ''
    void el.offsetWidth
    el.style.inlineSize = `${toWidth}px`
  },
  { flush: 'post' },
)
// The old text leaves out of flow; holding its width stops it rewrapping in the new box.
function keepWidth(el: Element) {
  ;(el as HTMLElement).style.inlineSize = `${el.getBoundingClientRect().width}px`
}
function releaseWidth() {
  if (!root.value) return
  root.value.style.inlineSize = ''
  delete root.value.dataset.sizing
}

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.animatedText,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-animated-text'))

defineExpose({
  /** Root element. */
  el: root,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
