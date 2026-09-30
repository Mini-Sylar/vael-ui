<template>
  <label
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="dataState"
    v-bind="attrs"
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
      />
      <span :class="controlPart.class" :style="controlPart.style" aria-hidden="true">
        <span class="ui-radio-dot" />
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
import '../shared/tokens.css'
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
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = defineProps<{
  /** Value the parent RadioGroup's model takes when this radio is selected. */
  value: string | number
  /** Label text; the default slot replaces it. */
  label?: string
  /** Disables this radio. The parent RadioGroup's `disabled` also disables it. */
  disabled?: boolean
  /** Secondary line under the label. */
  description?: string
  /** Class and style overrides for each part. */
  ui?: Partial<{
    root: UiPartValue
    control: UiPartValue
    label: UiPartValue
    description: UiPartValue
  }>
}>()

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
const skipTransition = shallowRef(true)
onMounted(() => {
  void nextTick(() => {
    skipTransition.value = false
  })
})

const inputId = useId()
const root = useTemplateRef<HTMLElement>('root')
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
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
})
</script>
