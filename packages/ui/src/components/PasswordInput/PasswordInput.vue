<template>
  <div
    ref="root"
    :class="[rootPart.class, $attrs.class]"
    :style="[rootPart.style, $attrs.style as never]"
    :data-side="inlineSide"
    :data-align="inlineAlign"
  >
    <Input
      ref="inputRef"
      v-model="modelValue"
      :type="visible ? 'text' : 'password'"
      :size="props.size"
      :disabled="isDisabled"
      :readonly="readonly"
      :invalid="isInvalid"
      :placeholder="placeholder"
      :name="name"
      :autocomplete="resolvedAutocomplete"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      :ui="innerUi"
      v-bind="inputAttrs"
      @focus="onFocus"
      @blur="onBlur"
    >
      <template v-if="$slots.display" #display="displayProps">
        <slot name="display" v-bind="displayProps" />
      </template>
      <template #end>
        <slot name="end" />
        <button
          v-if="revealable"
          type="button"
          :class="togglePart.class"
          :style="togglePart.style"
          :disabled="isDisabled"
          :aria-label="visible ? messages.passwordInput.hide : messages.passwordInput.show"
          @click="visible = !visible"
        >
          <svg v-if="visible" viewBox="0 0 16 16" aria-hidden="true" fill="none">
            <path
              d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z"
              stroke="currentColor"
              stroke-width="1.4"
            />
            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4" />
          </svg>
          <svg v-else viewBox="0 0 16 16" aria-hidden="true" fill="none">
            <path
              d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z"
              stroke="currentColor"
              stroke-width="1.4"
            />
            <path
              d="M2.5 2.5l11 11"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </template>
    </Input>

    <Transition
      v-if="hintPlacement === 'inline' && hasHintContent"
      :name="props.motion ? 'ui-field-error' : undefined"
    >
      <div :class="hintPart.class" :style="hintPart.style">
        <slot name="hint" :value="modelValue" :results="ruleResults">
          <ul :id="hintListId" :class="hintListPart.class" :style="hintListPart.style">
            <li
              v-for="result in ruleResults"
              :key="result.label"
              :class="hintItemPart.class"
              :style="hintItemPart.style"
              :data-passed="result.passed || undefined"
            >
              <span :class="hintIconPart.class" :style="hintIconPart.style" aria-hidden="true">
                <svg v-if="result.passed" viewBox="0 0 12 12" width="10" height="10" fill="none">
                  <path
                    d="M2.5 6.5l2.5 2.5 4.5-5"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              {{ result.label }}
              <span class="ui-password-input-sr">{{
                result.passed ? messages.passwordInput.met : messages.passwordInput.unmet
              }}</span>
            </li>
          </ul>
        </slot>
      </div>
    </Transition>
    <!-- One polite announcement per change, not the whole list on every keystroke. -->
    <span v-if="resolvedRules.length" class="ui-password-input-status" aria-live="polite">{{
      announcement
    }}</span>
  </div>

  <Popover
    v-if="hintPlacement === 'popover' && hasHintContent"
    ref="popoverRef"
    v-model:open="hintOpen"
    :trigger-el="inputEl"
    :side="side"
    :align="align"
    :side-offset="sideOffset"
    :align-offset="alignOffset"
    :force-mount="forceMount"
    :before-close="beforeClose"
    :teleport-to="teleportTo"
    :ui="{ panel: hintPart }"
  >
    <template #default>
      <slot name="hint" :value="modelValue" :results="ruleResults">
        <ul :id="hintListId" :class="hintListPart.class" :style="hintListPart.style">
          <li
            v-for="result in ruleResults"
            :key="result.label"
            :class="hintItemPart.class"
            :style="hintItemPart.style"
            :data-passed="result.passed || undefined"
          >
            <span :class="hintIconPart.class" :style="hintIconPart.style" aria-hidden="true">
              <svg v-if="result.passed" viewBox="0 0 12 12" width="10" height="10" fill="none">
                <path
                  d="M2.5 6.5l2.5 2.5 4.5-5"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            {{ result.label }}
            <span class="ui-password-input-sr">{{
              result.passed ? messages.passwordInput.met : messages.passwordInput.unmet
            }}</span>
          </li>
        </ul>
      </slot>
    </template>
  </Popover>
</template>

<!-- Wraps Input (InputNumber's own pattern) — reveal toggle rides its #end slot. The
     requirements hint is the one piece with two structurally different homes (inline vs
     popover), so its slot call is duplicated once rather than pulled into a second SFC,
     matching how InputNumber itself duplicates its stepper button markup across
     stepperPosition's 'end'/'split' branches instead of abstracting a single-use helper. -->
<script lang="ts">
import type { UiPartValue } from '../../classes'
import type { PopoverAlign, PopoverSide } from '../Popover/Popover.vue'

export interface PasswordRule {
  label: string
  test: (value: string) => boolean
}

export interface PasswordRuleResult {
  label: string
  passed: boolean
}
</script>

<script setup lang="ts">
import type { PopoverCloseReason } from '../../composables/usePopover'
import type { BeforeClose } from '../../motion/types'
import './PasswordInput.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, shallowRef, useAttrs, useId, useSlots, useTemplateRef, watch } from 'vue'
import { useSlotPresence } from '../../composables/dom'
import type { ComponentExposed } from 'vue-component-type-helpers'
import Input from '../Input/Input.vue'
import Popover from '../Popover/Popover.vue'
import { useFieldControl } from '../../composables/useFieldControl'
import { omitAttrs } from '../../composables/forwardedListeners'
import { useMessages, passwordInputMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { PasswordInputMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

/** Password value. @default '' */
const modelValue = defineModel<string>({ default: '' })
/** Whether the password is shown as plain text. @default false */
const visible = defineModel<boolean>('visible', { default: false })

const rawProps = withDefaults(
  defineProps<{
    /** Control size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Disables the input and reveal toggle. A disabled parent Field also disables it. @default false */
    disabled?: boolean
    /** Makes the value read-only while keeping it focusable and selectable. @default false */
    readonly?: boolean
    /** Standalone override; ORed with the nearest Field's `error` state. @default false */
    invalid?: boolean
    /** Text shown while the input is empty. */
    placeholder?: string
    /** Native `name` on the input, for plain `<form>` submission. */
    name?: string
    /** Tells password managers what this field is. Defaults to `'new-password'` when the field
     * shows requirements (`rules` or `#hint`), so the phone offers a strong password, and to
     * `'current-password'` otherwise, so a saved one fills in. Set it for a case that reads
     * otherwise, like a sign-up form without rules. */
    autocomplete?: string
    /** `false` hides the reveal toggle, for forms that must never show the password in plain text.
     * @default true
     */
    revealable?: boolean
    /** Requirement checks (`{ label, test }`) for the hint checklist and the `#hint` slot's `results`.
     * There are no built-in rules; without `rules` or `#hint`, the hint doesn't render. */
    rules?: PasswordRule[]
    /** Where the requirements hint renders. `'none'` disables it outright. @default 'popover' */
    hintPlacement?: 'inline' | 'popover' | 'none'
    /**
     * How it moves: its appearance (`{ initial: { root: { opacity: 0, y: 4 } } }`) and its states
     * (`{ states: { invalid: { root: { x: [0, -6, 6, 0] } } } }`). The inline `hint` is a part;
     * the popover one is not. `false` skips the inline hint's enter/exit transition. @default true
     */
    motion?: PasswordInputMotion
    /** Which side of the input the hint appears on, in both `'popover'` and `'inline'` mode.
     * Inline defaults to `'bottom'`. */
    side?: PopoverSide
    /** How the hint aligns against the input along that side, in both `'popover'` and `'inline'` mode.
     * Inline defaults to `'start'`. */
    align?: PopoverAlign
    /** Gap between the input and the hint popover, in pixels. Popover mode only. */
    sideOffset?: number
    /** Shifts the hint popover along the alignment axis, in pixels. Popover mode only. */
    alignOffset?: number
    /** Teleport target for the hint popover: a CSS selector or element. Popover mode only. */
    teleportTo?: string | HTMLElement
    /** Keeps the hint popover mounted (toggled with `v-show`) and skips the built-in transition.
     * Popover mode only.
     * @default false
     */
    forceMount?: boolean
    /** Runs before the hint closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. The hint stays open while the promise is pending. Popover mode only. */
    beforeClose?: BeforeClose<PopoverCloseReason>
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      frame: UiPartValue
      input: UiPartValue
      toggle: UiPartValue
      hint: UiPartValue
      hintList: UiPartValue
      hintItem: UiPartValue
      /** The mark before each rule in the hint list, a check once the rule passes. */
      hintIcon: UiPartValue
    }>
  }>(),
  {
    disabled: false,
    readonly: false,
    invalid: false,
    revealable: true,
    hintPlacement: 'popover',
    motion: undefined,
    forceMount: false,
  },
)
const props = withProviderDefaults(rawProps, { size: 'md', motion: true })

defineSlots<{
  /** Inline trailing content, placed before the reveal toggle. */
  end(): unknown
  /**
   * Draws the text yourself over the field's own text, as Input's `#display`: the real input keeps
   * the caret, selection and screen reader text.
   */
  display(props: { value: string; placeholder: string; focused: boolean }): unknown
  /** Replaces the default requirements checklist. Falls back to it when omitted. */
  hint(props: { value: string; results: PasswordRuleResult[] }): unknown
}>()

const resolvedRules = computed(() => props.rules ?? [])
const ruleResults = computed<PasswordRuleResult[]>(() =>
  resolvedRules.value.map((rule) => ({ label: rule.label, passed: rule.test(modelValue.value) })),
)

// Reads only the requirements that just changed, e.g. "A number met".
const announcement = shallowRef('')
watch(ruleResults, (next, prev) => {
  const changed = next.filter((result, i) => prev[i] && prev[i].passed !== result.passed)
  if (!changed.length) return
  const { met, unmet } = messages.value.passwordInput
  announcement.value = changed
    .map((result) => `${result.label} ${result.passed ? met : unmet}`)
    .join(', ')
})

const slots = useSlots()
const hasSlot = useSlotPresence(slots)
// Nothing to show: no rules and no #hint override — don't mount an empty popover/hint.
const hasHintContent = computed(() => resolvedRules.value.length > 0 || hasSlot('hint'))
// Requirements mean someone is choosing a password; without them, they're typing one they have.
const resolvedAutocomplete = computed(
  () => props.autocomplete ?? (hasHintContent.value ? 'new-password' : 'current-password'),
)

const messages = useMessages({ passwordInput: passwordInputMessages })
const fieldControl = useFieldControl()
const isDisabled = computed(() => props.disabled || fieldControl.disabled())
const isInvalid = computed(() => props.invalid || fieldControl.invalid())

const hintOpen = shallowRef(false)
function onFocus() {
  hintOpen.value = true
}
function onBlur() {
  hintOpen.value = false
}

// Only meaningful for inline mode's flex layout — popover mode forwards
// side/align straight to Popover instead, which has its own defaults.
const inlineSide = computed(() =>
  props.hintPlacement === 'inline' ? (props.side ?? 'bottom') : undefined,
)
const inlineAlign = computed(() =>
  props.hintPlacement === 'inline' ? (props.align ?? 'start') : undefined,
)

const root = useTemplateRef<HTMLElement>('root')
const inputRef = useTemplateRef<ComponentExposed<typeof Input>>('inputRef')
const el = computed(() => root.value)
const inputEl = computed(() => inputRef.value?.inputEl ?? null)
const parts = useStateMotion({
  key: 'passwordInput',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  // The popover hint is teleported, so only the inline one is found.
  selectors: {
    root: '.ui-password-input',
    input: '.ui-input-el',
    toggle: '.ui-password-input-toggle',
    hint: '.ui-password-input-hint',
  },
  states: () => ({ invalid: isInvalid.value, disabled: isDisabled.value }),
})

const popoverRef = useTemplateRef<ComponentExposed<typeof Popover>>('popoverRef')
const hintPanelEl = computed(() => popoverRef.value?.panelEl ?? null)
function closeHint() {
  popoverRef.value?.close()
}
function cancelCloseHint() {
  popoverRef.value?.cancelClose()
}

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.passwordInput,
  () => props.ui,
)
const innerUi = computed(() => ({ root: themedUi()?.frame, input: themedUi()?.input }))
// Two roots (the field and the hints popover), so attrs are routed by hand:
// class and style to the wrapper, everything else to the input.
const attrs = useAttrs()
// The requirements list describes the input, after your own description.
const hintListId = useId()
const inputAttrs = computed(() => ({
  ...omitAttrs(attrs, ['class', 'style']),
  'aria-describedby':
    [attrs['aria-describedby'], hasHintContent.value && !hasSlot('hint') ? hintListId : undefined]
      .filter(Boolean)
      .join(' ') || undefined,
}))
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-password-input'))
const togglePart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.toggle,
    'ui-password-input-toggle',
    `ui-password-input-toggle--${props.size}`,
  ),
)
const hintPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.hint,
    'ui-password-input-hint',
    `ui-password-input-hint--${props.hintPlacement}`,
  ),
)
const hintListPart = computed(() =>
  resolveUiPart(cx, themedUi()?.hintList, 'ui-password-input-hint-list'),
)
const hintItemPart = computed(() =>
  resolveUiPart(cx, themedUi()?.hintItem, 'ui-password-input-hint-item'),
)
const hintIconPart = computed(() =>
  resolveUiPart(cx, themedUi()?.hintIcon, 'ui-password-input-hint-icon'),
)

defineExpose({
  /** Root element. */
  el,
  /** Native `<input>` element. */
  inputEl,
  /** Whether the password is shown as plain text (writable). */
  visible,
  /** Hint popover panel element (null while closed or in `'inline'` mode). */
  hintPanelEl,
  /** Closes the hint popover, running `beforeClose` if set. */
  closeHint,
  /** Aborts a pending `beforeClose` exit and keeps the hint popover open. */
  cancelCloseHint,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
