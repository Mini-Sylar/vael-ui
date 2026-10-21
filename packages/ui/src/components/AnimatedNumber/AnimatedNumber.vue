<template>
  <span
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-motion="props.motion ? undefined : 'off'"
    v-bind="attrs"
  >
    <span class="ui-animated-number-text">{{ text }}</span>
    <TransitionGroup
      tag="span"
      class="ui-animated-number-chars"
      dir="ltr"
      aria-hidden="true"
      :name="props.motion ? 'ui-animated-number' : undefined"
      :css="props.motion"
    >
      <span
        v-for="part in parts"
        :key="part.key"
        :class="part.kind === 'digit' ? 'ui-animated-number-digit' : 'ui-animated-number-symbol'"
        :style="part.kind === 'digit' ? { '--ui-digit': part.digit } : undefined"
      >
        <template v-if="part.kind === 'digit'">
          <span class="ui-animated-number-placeholder">{{ part.text }}</span>
          <span class="ui-animated-number-reel">
            <span v-for="glyph in glyphs" :key="glyph">{{ glyph }}</span>
          </span>
        </template>
        <template v-else>{{ part.text }}</template>
      </span>
    </TransitionGroup>
  </span>
</template>

<!--
  Each digit is a reel of 0–9 that rolls to its value; screen readers get the formatted text.
-->
<script setup lang="ts">
import './AnimatedNumber.css'
import '../shared/tokens.css'
import { computed, TransitionGroup, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { validLocale, withProviderDefaults } from '../../config'
import { digitGlyphs, numberParts, visualOrder } from '../../composables/numberParts'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const rawProps = withDefaults(
  defineProps<{
    /** The number to show. Changing it rolls each changed digit to its new value. */
    value: number
    /** `Intl.NumberFormat` options: currency, percent, compact, fraction digits and so on. */
    format?: Intl.NumberFormatOptions
    /** BCP 47 locale for the digits and separators. Unset, it follows the nearest `ConfigProvider`, then the browser. */
    locale?: string
    /**
     * `false` swaps digits without rolling. Unset, it follows the nearest `ConfigProvider`.
     * @default true
     */
    motion?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { motion: undefined },
)
const props = withProviderDefaults(rawProps, { motion: true, locale: undefined })

const root = useTemplateRef<HTMLElement>('root')
const formatter = computed(() => new Intl.NumberFormat(validLocale(props.locale), props.format))
const glyphs = computed(() => digitGlyphs(formatter.value))
const text = computed(() => formatter.value.format(props.value))
const direction = () =>
  root.value
    ? getComputedStyle(root.value).direction
    : typeof document === 'undefined'
      ? 'ltr'
      : document.documentElement.dir || 'ltr'
const parts = computed(() =>
  visualOrder(numberParts(formatter.value, props.value, glyphs.value), direction()),
)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.animatedNumber,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-animated-number'))

defineExpose({
  /** Root element. */
  el: root,
})
</script>
