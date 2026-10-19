<template>
  <div
    ref="root"
    role="group"
    :aria-label="ariaLabel"
    :class="rootPart.class"
    :style="rootPart.style"
    v-bind="attrs"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'

export type ButtonGroupValue = string | number

/** @internal What a Button inside reads to act as a toggle. */
export interface ButtonGroupContext {
  /** True once the group has a `v-model`, so Buttons with a `value` become toggles. */
  toggles: () => boolean
  isPressed: (value: ButtonGroupValue) => boolean
  toggle: (value: ButtonGroupValue) => void
}

/** Injection key for ButtonGroup context. */
export const buttonGroupKey: InjectionKey<ButtonGroupContext> = Symbol('ui-button-group')
</script>

<script setup lang="ts">
import './ButtonGroup.css'
import '../shared/tokens.css'
import { computed, provide, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Whether the buttons sit in a row or a column. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'
    /** Accessible name for the group. */
    ariaLabel?: string
    /** With `v-model`: several buttons can be on at once, and the model is an array of their
     * `value`s. Otherwise one at a time. @default false */
    multiple?: boolean
    /** With `v-model`, one at a time: clicking the button that's on turns it off. Set `false` for
     * a choice that always has one (text alignment). @default true */
    allowEmpty?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  {
    orientation: 'horizontal',
    ariaLabel: undefined,
    multiple: false,
    allowEmpty: true,
    ui: undefined,
  },
)

/**
 * Opt-in toggles. Bind it, and every Button inside with a `value` turns on and off, with
 * `aria-pressed` set for you: one value at a time, or an array with `multiple`. Unbound, the
 * group is purely visual, as before.
 */
const model = defineModel<ButtonGroupValue | readonly ButtonGroupValue[] | null | undefined>({
  default: undefined,
})

provide<ButtonGroupContext>(buttonGroupKey, {
  toggles: () => model.value !== undefined,
  isPressed: (value) =>
    props.multiple
      ? Array.isArray(model.value) && model.value.includes(value)
      : model.value === value,
  toggle: (value) => {
    if (props.multiple) {
      const current = Array.isArray(model.value) ? model.value : []
      model.value = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    } else if (model.value === value) {
      if (props.allowEmpty) model.value = null
    } else {
      model.value = value
    }
  },
})

defineSlots<{
  /** The grouped buttons. */
  default(): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.buttonGroup,
  () => props.ui,
)

const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-button-group',
    props.orientation === 'vertical' && 'ui-button-group--vertical',
  ),
)

defineExpose({
  /** Root element. */
  el: root,
})
</script>
