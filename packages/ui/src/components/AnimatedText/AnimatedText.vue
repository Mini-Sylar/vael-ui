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
      <span
        :key="value"
        class="ui-animated-text-value"
        :data-split="words ? '' : undefined"
        :data-enter="words && changed && props.motion === true ? '' : undefined"
      >
        <template v-if="words">
          <!-- Read once, whole; the pieces are only what's seen. -->
          <span class="ui-animated-text-read">{{ value }}</span>
          <span aria-hidden="true">
            <template v-for="(word, w) in words" :key="w">
              <span v-if="word.pieces" class="ui-animated-text-word">
                <span
                  v-for="piece in word.pieces"
                  :key="piece.at"
                  class="ui-animated-text-piece"
                  :style="{ '--ui-piece': piece.at }"
                  >{{ piece.text }}</span
                >
              </span>
              <template v-else>{{ word.text }}</template>
            </template>
          </span>
        </template>
        <template v-else>{{ value }}</template>
      </span>
    </Transition>
  </span>
</template>

<!--
  A new value rises in as the old one fades out, and the box eases to the new width.
-->
<script setup lang="ts">
import './AnimatedText.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, shallowRef, Transition, useAttrs, useTemplateRef, watch } from 'vue'
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
    /**
     * A new value comes in a word or a letter at a time, each after the one before. Screen readers
     * still read it whole. Animate the pieces yourself with `motion: { initial: { piece: … } }`.
     */
    split?: 'words' | 'letters'
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { motion: undefined, split: undefined },
)
const props = withProviderDefaults(rawProps, { motion: true })

const root = useTemplateRef<HTMLElement>('root')

// Split: words, each its letters when splitting by letter; spaces stay plain text between them.
type Word = { text: string; pieces?: { text: string; at: number }[] }
const letters = (text: string): string[] =>
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(
        (s) => s.segment,
      )
    : Array.from(text)
const words = computed<Word[] | undefined>(() => {
  if (!props.split) return undefined
  let at = 0
  return props.value.split(/(\s+)/).map((text): Word => {
    if (!text || /^\s+$/.test(text)) return { text }
    const pieces = props.split === 'letters' ? letters(text) : [text]
    return { text, pieces: pieces.map((piece) => ({ text: piece, at: at++ })) }
  })
})
// Pieces come in only for a new value, never on the first render.
const changed = shallowRef(false)
watch(
  () => props.value,
  () => (changed.value = true),
)

const parts = useStateMotion({
  key: 'animatedText',
  mainPart: 'root',
  // Your pieces' `initial` plays again for each new value.
  motion: () =>
    props.split && typeof props.motion === 'object'
      ? { ...props.motion, replay: props.value, appear: false }
      : props.motion,
  root: () => root.value,
  selectors: { root: '.ui-animated-text', piece: '.ui-animated-text-piece' },
  repeated: ['piece'],
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
// Hidden from screen readers as it goes, so only the new text is read.
function keepWidth(el: Element) {
  el.setAttribute('aria-hidden', 'true')
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
