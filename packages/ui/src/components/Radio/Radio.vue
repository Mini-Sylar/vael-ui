<template>
  <label
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="dataState"
    v-bind="rootAttrs"
  >
    <span class="ui-radio-frame">
      <input
        ref="inputEl"
        type="radio"
        :id="inputId"
        class="ui-radio-input"
        :name="ctx.name()"
        :value="value"
        :checked="isChecked"
        :disabled="isDisabled"
        @change="onNativeChange"
        v-bind="inputAttrs"
      />
      <span
        ref="controlEl"
        :class="controlPart.class"
        :style="controlPart.style"
        aria-hidden="true"
      >
        <span ref="dotEl" class="ui-radio-dot" />
      </span>
    </span>
    <span v-if="label || $slots.default || description" class="ui-radio-text">
      <span v-if="label || $slots.default" :class="labelPart.class" :style="labelPart.style">
        <slot :checked="isChecked">{{ label }}</slot>
      </span>
      <span v-if="description" :class="descriptionPart.class" :style="descriptionPart.style">{{
        description
      }}</span>
    </span>
  </label>
</template>

<!-- Injects RadioGroup's name; APG roving arrows are native; throws outside group -->
<script setup lang="ts">
import './Radio.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import {
  computed,
  inject,
  nextTick,
  onMounted,
  shallowRef,
  useAttrs,
  useId,
  useTemplateRef,
} from 'vue'
import { radioGroupKey } from '../RadioGroup/RadioGroup.vue'
import { useControlAttrs } from '../../composables/forwardedListeners'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { RadioMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const { rootAttrs, inputAttrs } = useControlAttrs(useAttrs())
const rawProps = withDefaults(
  defineProps<{
    /** Value the parent RadioGroup's model takes when this radio is selected. */
    value: string | number
    /** Label text; the default slot replaces it. */
    label?: string
    /** Disables this radio. The parent RadioGroup's `disabled` also disables it. */
    disabled?: boolean
    /** Secondary line under the label. */
    description?: string
    /**
     * How it moves: its appearance (`{ initial: { control: { opacity: 0, scale: 0.8 } } }`) and its
     * states, like `checked` or `invalid` (`{ states: { checked: { control: { scale: '1.1' } } } }`).
     * `false` turns its own animation off, built-in transitions too; animate the exposed `controlEl`/`dotEl` yourself.
     * @default true
     */
    motion?: RadioMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      control: UiPartValue
      label: UiPartValue
      description: UiPartValue
    }>
  }>(),
  { motion: undefined },
)
const props = withProviderDefaults(rawProps, { motion: true })

defineSlots<{
  /** Label content; replaces the `label` text. Receives `checked`. */
  default(props: { checked: boolean }): unknown
}>()

const injectedCtx = inject(radioGroupKey)
if (!injectedCtx) {
  throw new Error('Radio must be rendered inside a RadioGroup')
}
const ctx = injectedCtx

const isChecked = computed(() => ctx.isChecked(props.value))
const isDisabled = computed(() => props.disabled || ctx.disabled())

function onNativeChange() {
  ctx.select(props.value)
}

const dataState = computed(() => (isChecked.value ? 'checked' : 'unchecked'))

// First paint only: suppress transitions to prevent initial render
const firstPaint = shallowRef(true)
const skipTransition = computed(() => firstPaint.value || !props.motion)
onMounted(() => {
  void nextTick(() => {
    firstPaint.value = false
  })
})

const inputId = useId()
const root = useTemplateRef<HTMLElement>('root')
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const controlEl = useTemplateRef<HTMLElement>('controlEl')
const dotEl = useTemplateRef<HTMLElement>('dotEl')
const parts = useStateMotion({
  key: 'radio',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: {
    root: '.ui-radio',
    control: '.ui-radio-control',
    label: '.ui-radio-label',
    description: '.ui-radio-description',
  },
  states: () => ({
    checked: isChecked.value,
    unchecked: !isChecked.value,
    invalid: ctx.invalid?.(),
    disabled: isDisabled.value,
  }),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.radio,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-radio',
    isDisabled.value && 'ui-radio--disabled',
    skipTransition.value && 'ui-radio--no-anim',
  ),
)
const controlPart = computed(() => resolveUiPart(cx, themedUi()?.control, 'ui-radio-control'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-radio-label'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-radio-description'),
)

defineExpose({
  /** Root element. */
  el: root,
  /** Native radio input. */
  inputEl,
  /** The circle that fills when selected. */
  controlEl,
  /** The dot inside it. */
  dotEl,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
