<template>
  <label
    ref="root"
    v-bind="attrs"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="dataState"
    :data-invalid="isInvalid || undefined"
  >
    <span class="ui-switch-control">
      <input
        ref="inputEl"
        type="checkbox"
        role="switch"
        :id="fieldControl.id"
        class="ui-switch-input"
        :checked="modelValue"
        :disabled="isDisabled"
        :name="name"
        :aria-checked="modelValue"
        :aria-describedby="fieldControl.describedBy()"
        :aria-invalid="isInvalid || undefined"
        :aria-required="fieldControl.required() || undefined"
        @change="onNativeChange"
        @focus="onNativeFocus"
        @blur="onNativeBlur"
      />
      <span ref="trackEl" :class="trackPart.class" :style="trackPart.style" aria-hidden="true">
        <span ref="thumbEl" :class="thumbPart.class" :style="thumbPart.style" />
      </span>
    </span>
    <span v-if="label || $slots.default" :class="labelPart.class" :style="labelPart.style">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<!-- APG switch pattern via checkbox + role="switch"; no inline style on thumbEl for spring override -->
<script setup lang="ts">
import './Switch.css'
import '../shared/tokens.css'
import { computed, nextTick, onMounted, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const modelValue = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
    invalid?: boolean
    size?: 'sm' | 'md'
    name?: string
    // false skips transitions; exposed trackEl/thumbEl enable custom motion
    motionCss?: boolean
    ui?: Partial<{ root: UiPartValue; track: UiPartValue; thumb: UiPartValue; label: UiPartValue }>
  }>(),
  { disabled: false, invalid: false, size: 'md', motionCss: true },
)

defineSlots<{
  default(): unknown
}>()

const fieldControl = useFieldControl({ filled: () => modelValue.value })
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

function onNativeChange(event: Event) {
  modelValue.value = (event.target as HTMLInputElement).checked
}
function onNativeFocus() {
  fieldControl.onFocus()
}
function onNativeBlur() {
  fieldControl.onBlur()
}

const dataState = computed(() => (modelValue.value ? 'checked' : 'unchecked'))

// First paint only: suppress transitions to prevent initial jump
const firstPaint = shallowRef(true)
onMounted(() => {
  void nextTick(() => {
    firstPaint.value = false
  })
})
const skipTransition = computed(() => firstPaint.value || !props.motionCss)

const root = useTemplateRef<HTMLElement>('root')
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
const trackEl = useTemplateRef<HTMLElement>('trackEl')
const thumbEl = useTemplateRef<HTMLElement>('thumbEl')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.switch,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-switch',
    `ui-switch--${props.size}`,
    isDisabled.value && 'ui-switch--disabled',
    skipTransition.value && 'ui-switch--no-anim',
  ),
)
const trackPart = computed(() => resolveUiPart(cx, themedUi()?.track, 'ui-switch-track'))
const thumbPart = computed(() => resolveUiPart(cx, themedUi()?.thumb, 'ui-switch-thumb'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-switch-label'))

defineExpose({ el: root, inputEl, trackEl, thumbEl })
</script>
