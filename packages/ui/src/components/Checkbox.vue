<template>
  <label
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="dataState"
    :data-invalid="isInvalid || undefined"
  >
    <span :class="controlClass">
      <input
        ref="inputEl"
        type="checkbox"
        :id="fieldControl.id"
        class="ui-checkbox-input"
        :checked="isChecked"
        :disabled="isDisabled"
        :name="name"
        :value="value"
        :aria-describedby="fieldControl.describedBy()"
        :aria-invalid="isInvalid || undefined"
        :aria-required="fieldControl.required() || undefined"
        @change="onNativeChange"
        @focus="onNativeFocus"
        @blur="onNativeBlur"
      />
      <span ref="boxEl" :class="boxPart.class" :style="boxPart.style" aria-hidden="true">
        <svg
          ref="checkEl"
          class="ui-checkbox-check"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
        >
          <path
            d="M3.5 8.5l3 3 6-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          class="ui-checkbox-indeterminate"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
        >
          <path d="M4 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </span>
    </span>
    <span v-if="label || $slots.default" :class="labelPart.class" :style="labelPart.style">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<!-- Native checkbox overlay (opacity 0) with SVG box styling + first-paint transition guard -->
<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { useFieldControl } from '../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

/** Checked state. Bind an array instead to toggle this checkbox's `value` prop in/out of it (checkbox-group pattern). */
const modelValue = defineModel<boolean | unknown[]>({ default: false })

const props = withDefaults(
  defineProps<{
    label?: string
    /** Only meaningful alongside an array model — checked reflects membership. */
    value?: string | number
    /** Property, not attribute. */
    indeterminate?: boolean
    disabled?: boolean
    invalid?: boolean
    size?: 'sm' | 'md'
    name?: string
    /** `false` skips built-in transitions; use exposed `boxEl`/`checkEl` to drive animation instead. */
    motionCss?: boolean
    ui?: Partial<{ root: UiPartValue; box: UiPartValue; label: UiPartValue }>
  }>(),
  { indeterminate: false, disabled: false, invalid: false, size: 'md', motionCss: true },
)

const emit = defineEmits<{ change: [checked: boolean] }>()

defineSlots<{
  /** Inline label content; overrides the `label` prop text entirely. */
  default(): unknown
}>()

const isChecked = computed(() => {
  if (Array.isArray(modelValue.value)) {
    return props.value !== undefined && modelValue.value.includes(props.value)
  }
  return !!modelValue.value
})

const fieldControl = useFieldControl({ filled: isChecked })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

function onNativeChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (Array.isArray(modelValue.value)) {
    modelValue.value = checked
      ? [...modelValue.value, props.value]
      : modelValue.value.filter((v) => v !== props.value)
  } else {
    modelValue.value = checked
  }
  emit('change', checked)
}
function onNativeFocus() {
  fieldControl.onFocus()
}
function onNativeBlur() {
  fieldControl.onBlur()
}

const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
watchEffect(() => {
  if (inputEl.value) inputEl.value.indeterminate = props.indeterminate
})

const dataState = computed(() =>
  props.indeterminate ? 'indeterminate' : isChecked.value ? 'checked' : 'unchecked',
)

// First paint only: suppress transitions to prevent drawing check on initial render
const firstPaint = shallowRef(true)
onMounted(() => {
  void nextTick(() => {
    firstPaint.value = false
  })
})
const skipTransition = computed(() => firstPaint.value || !props.motionCss)

const root = useTemplateRef<HTMLElement>('root')
const boxEl = useTemplateRef<HTMLElement>('boxEl')
const checkEl = useTemplateRef<SVGElement>('checkEl')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.checkbox,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-checkbox',
    `ui-checkbox--${props.size}`,
    isDisabled.value && 'ui-checkbox--disabled',
    skipTransition.value && 'ui-checkbox--no-anim',
  ),
)
const controlClass = computed(() => cx('ui-checkbox-control'))
const boxPart = computed(() => resolveUiPart(cx, themedUi()?.box, 'ui-checkbox-box'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-checkbox-label'))

defineExpose({ el: root, inputEl, boxEl, checkEl })
</script>
