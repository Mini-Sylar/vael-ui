<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="editing ? 'editing' : 'preview'"
    :data-motion="props.motion ? undefined : 'off'"
    v-bind="rootAttrs"
  >
    <template v-if="editing">
      <!-- Enter, Escape and focus leaving are handled here, so any control in #edit gets them. -->
      <span
        ref="editArea"
        :class="editPart.class"
        :style="editPart.style"
        @keydown="onKeydown"
        @focusout="onFocusout"
      >
        <slot
          name="edit"
          :value="draft"
          :update="setDraft"
          :submit="submit"
          :cancel="cancel"
          :size="size"
        >
          <Input
            ref="input"
            v-model="draft"
            :size="size"
            :placeholder="placeholder"
            :maxlength="maxlength"
            :enterkeyhint="submitsOnEnter ? 'done' : undefined"
            :aria-label="attrs['aria-label'] as string | undefined"
            :aria-labelledby="attrs['aria-labelledby'] as string | undefined"
            :ui="{ root: inputPart }"
          />
        </slot>
      </span>
      <!-- Pressing an action must not blur the input first, or blur would submit before the click lands. -->
      <span
        v-if="$slots.actions"
        :class="actionsPart.class"
        :style="actionsPart.style"
        @pointerdown.prevent
        @mousedown.prevent
      >
        <slot name="actions" :submit="submit" :cancel="cancel" />
      </span>
    </template>
    <button
      v-else
      ref="preview"
      type="button"
      :class="previewPart.class"
      :style="previewPart.style"
      :disabled="disabled"
      :data-placeholder="modelValue ? undefined : ''"
      @click="activationMode === 'click' && start()"
      @dblclick="activationMode === 'dblclick' && start()"
      @focus="activationMode === 'focus' && !refocusing && start()"
      @keydown.enter.prevent="start()"
    >
      <slot name="preview" :value="modelValue">{{ modelValue || placeholder }}</slot>
    </button>
  </div>
</template>

<script setup lang="ts">
import './Editable.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { computed, nextTick, shallowRef, useAttrs, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import Input from '../Input/Input.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import { containsThroughLayers } from '../../composables/useLayerStack'
import { omitAttrs } from '../../composables/forwardedListeners'
import type { EditableMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
// The label names the input, so the wrapper doesn't get it.
const rootAttrs = computed(() => omitAttrs(attrs, ['aria-label', 'aria-labelledby']))
/** The text. Updates when an edit is submitted, not on every keystroke. @default '' */
const modelValue = defineModel<string>({ default: '' })
/** Whether the input is showing. Bind it to open or close the edit from outside. @default false */
const editing = defineModel<boolean>('editing', { default: false })

const rawProps = withDefaults(
  defineProps<{
    /** Shown in the preview when the text is empty, and in the input. @default 'Click to edit' */
    placeholder?: string
    /** What opens the input: a click, a double click, or focus arriving. @default 'click' */
    activationMode?: 'click' | 'dblclick' | 'focus'
    /** What saves the edit: Enter, leaving the input, either, or only `submit()`. Leaving the input otherwise cancels. @default 'both' */
    submitMode?: 'enter' | 'blur' | 'both' | 'none'
    /** Selects the text when the input opens, so typing replaces it. @default true */
    selectOnFocus?: boolean
    /** Native `maxlength` on the input. */
    maxlength?: number
    /** Blocks editing. @default false */
    disabled?: boolean
    /** Control size, as on Input. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /**
     * How it moves: its appearance (`{ initial: { root: { opacity: 0, y: 4 } } }`) and its states
     * (`{ states: { editing: { root: { scale: '1.01' } } } }`). `false` skips the swap transition;
     * use the exposed `previewEl` and `inputEl` for your own. @default true
     */
    motion?: EditableMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      preview: UiPartValue
      edit: UiPartValue
      input: UiPartValue
      actions: UiPartValue
    }>
  }>(),
  {
    placeholder: 'Click to edit',
    activationMode: 'click',
    submitMode: 'both',
    selectOnFocus: true,
    disabled: false,
    size: 'md',
    motion: undefined,
  },
)
const props = withProviderDefaults(rawProps, { motion: true })

const emit = defineEmits<{
  /** Fires with the saved text. */
  submit: [value: string]
  /** Fires when an edit is dropped. */
  cancel: []
}>()

defineSlots<{
  /** The resting text. */
  preview(props: { value: string }): unknown
  /**
   * The control while editing, in place of the Input: a Textarea, a Select, a date picker. Bind
   * `value` and call `update` with each change; Enter, Escape and focus leaving still work.
   */
  edit(props: {
    value: string
    update: (value: string) => void
    submit: () => void
    cancel: () => void
    size: 'sm' | 'md' | 'lg'
  }): unknown
  /** Buttons beside the control, such as save and cancel. */
  actions(props: { submit: () => void; cancel: () => void }): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const input = useTemplateRef<InstanceType<typeof Input>>('input')
const editArea = useTemplateRef<HTMLElement>('editArea')
const preview = useTemplateRef<HTMLButtonElement>('preview')
const draft = shallowRef('')
// Opened from outside (v-model:editing), the input starts on the text, as a click would.
watch(editing, (on) => on && (draft.value = modelValue.value), { immediate: true })
const parts = useStateMotion({
  key: 'editable',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: {
    root: '.ui-editable',
    preview: '.ui-editable-preview',
    edit: '.ui-editable-edit',
    input: '.ui-editable-input',
    actions: '.ui-editable-actions',
  },
  states: () => ({ editing: editing.value, disabled: props.disabled }),
})
// The phone keyboard's action key reads Done when it saves.
const submitsOnEnter = computed(() => props.submitMode === 'enter' || props.submitMode === 'both')
function setDraft(value: string) {
  draft.value = value
}
const FOCUSABLE = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'

function start() {
  if (props.disabled || editing.value) return
  draft.value = modelValue.value
  editing.value = true
  nextTick(() => {
    const el = input.value?.inputEl ?? editArea.value?.querySelector<HTMLElement>(FOCUSABLE)
    el?.focus()
    if (
      props.selectOnFocus &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    )
      el.select()
  })
}
// Focus coming back on close must not reopen a focus-activated edit.
let refocusing = false
function close() {
  editing.value = false
  nextTick(() => {
    // Focus already moved on to the page stays there.
    const active = document.activeElement
    if (active && active !== document.body && !inside(active)) return
    refocusing = true
    preview.value?.focus()
    refocusing = false
  })
}
function submit() {
  if (!editing.value) return
  modelValue.value = draft.value
  close()
  emit('submit', draft.value)
}
function cancel() {
  if (!editing.value) return
  close()
  emit('cancel')
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && submitsOnEnter.value) {
    // A textarea keeps Enter for new lines; Cmd or Ctrl with it submits.
    if (event.target instanceof HTMLTextAreaElement && !event.metaKey && !event.ctrlKey) return
    event.preventDefault()
    submit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
  }
}
function leave() {
  if (props.submitMode === 'blur' || props.submitMode === 'both') submit()
  else cancel()
}
const inside = (node: unknown) => containsThroughLayers(root.value, node as Node | null)
// Safari doesn't focus a pressed button, so focus drops to nowhere: after a press inside, that's not leaving.
let pressedInside = false
// Focus moving within the component (to an action, between parts of a custom control, or into a
// picker's teleported panel) is not leaving.
function onFocusout(event: FocusEvent) {
  if (inside(event.relatedTarget) || (event.relatedTarget === null && pressedInside)) return
  leave()
}
const whileEditing = () => (editing.value ? document : null)
// Focus leaving that panel doesn't bubble through the teleport to the edit area.
useEventListener(
  whileEditing,
  'focusout',
  (event: FocusEvent) => {
    if (!root.value?.contains(event.target as Node) && inside(event.target)) onFocusout(event)
  },
  true,
)
useEventListener(
  whileEditing,
  'pointerdown',
  (event: PointerEvent) => {
    pressedInside = inside(event.target)
    // Focus already lost that way never blurs again, so a press outside is the leave.
    if (!pressedInside && !inside(document.activeElement)) leave()
  },
  true,
)
useEventListener(whileEditing, 'keydown', () => (pressedInside = false), true)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.editable,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-editable', props.disabled && 'ui-editable--disabled'),
)
const previewPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.preview,
    'ui-editable-preview',
    `ui-editable-preview--${props.size}`,
  ),
)
const editPart = computed(() => resolveUiPart(cx, themedUi()?.edit, 'ui-editable-edit'))
const inputPart = computed(() => resolveUiPart(cx, themedUi()?.input, 'ui-editable-input'))
const actionsPart = computed(() => resolveUiPart(cx, themedUi()?.actions, 'ui-editable-actions'))

defineExpose({
  /** Root element. */
  el: root,
  /** The resting text's button; `null` while editing. */
  previewEl: preview,
  /** The native input; `null` until editing. */
  inputEl: computed(() => input.value?.inputEl ?? null),
  /** Opens the input. */
  start,
  /** Saves the draft and closes. */
  submit,
  /** Drops the draft and closes. */
  cancel,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
