<template>
  <Transition name="ui-message" :css="!forceMount">
    <div
      v-if="forceMount || open"
      v-show="open"
      ref="root"
      :class="rootPart.class"
      :style="rootPart.style"
      :role="resolvedRole"
      :data-state="isClosing ? 'closing' : 'open'"
    >
      <span v-if="showIcon" :class="iconPart.class" :style="iconPart.style" aria-hidden="true">
        <slot name="icon">
          <StatusIcon :variant="variant" />
        </slot>
      </span>
      <div :class="contentPart.class" :style="contentPart.style">
        <p v-if="title" :class="titlePart.class" :style="titlePart.style">{{ title }}</p>
        <div v-if="$slots.default" :class="descriptionPart.class" :style="descriptionPart.style">
          <slot />
        </div>
      </div>
      <div v-if="$slots.actions" class="ui-message-actions">
        <slot name="actions" />
      </div>
      <button
        v-if="closable"
        type="button"
        :class="closePart.class"
        :style="closePart.style"
        :aria-label="messages.message.dismiss"
        @click="requestClose($event)"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none">
          <path
            d="M3 3l10 10M13 3L3 13"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script lang="ts">
import type { UiPartValue } from '../../classes'

export type MessageVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface MessageOpenChangeDetails {
  event?: Event
  /** Call to veto the close — the model never flips. */
  cancel: () => void
}

export interface MessageProps {
  title?: string
  variant?: MessageVariant
  /** `bare` drops the border/background/padding — icon + colored text only,
   * for inline use (e.g. form field validation) instead of a standalone banner. */
  appearance?: 'default' | 'bare'
  /** Renders the built-in dismiss button. */
  closable?: boolean
  /** Called before the model flips to false. Call `done()` to actually close. */
  beforeClose?: (done: () => void) => void
  /** When true, presence is v-show-driven and owned by the consumer (e.g. AnimatePresence). */
  forceMount?: boolean
  showIcon?: boolean
  /** Defaults to `alert` for `error`/`warning`, `status` otherwise. */
  role?: 'status' | 'alert'
  ui?: Partial<{
    root: UiPartValue
    icon: UiPartValue
    content: UiPartValue
    title: UiPartValue
    description: UiPartValue
    close: UiPartValue
  }>
}
</script>

<!--
  forceMount + beforeClose(done) contract reimplemented locally (Message needs no focus-trap/scroll-lock).
-->
<script setup lang="ts">
import './Message.css'
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import { useThemedUi } from '../../theme'
import StatusIcon from '../internal/StatusIcon.vue'

const open = defineModel<boolean>('open', { default: true })

const props = withDefaults(defineProps<MessageProps>(), {
  variant: 'default',
  appearance: 'default',
  closable: false,
  forceMount: false,
  showIcon: true,
})

const emit = defineEmits<{
  'open-change': [value: boolean, details: MessageOpenChangeDetails]
}>()

defineSlots<{
  /** Description body, under the optional title. */
  default(): unknown
  /** Replaces the default StatusIcon. */
  icon(): unknown
  /** Trailing action row, before the close button. */
  actions(): unknown
}>()

const messages = useUiMessages()
const root = useTemplateRef<HTMLElement>('root')

const isClosing = shallowRef(false)
let pendingClose: symbol | null = null

function requestClose(event?: Event) {
  if (!open.value || isClosing.value) return
  let cancelled = false
  const details: MessageOpenChangeDetails = {
    event,
    cancel: () => {
      cancelled = true
    },
  }
  emit('open-change', false, details)
  if (cancelled) return

  if (!props.beforeClose) {
    open.value = false
    return
  }
  const token = Symbol('pending-close')
  pendingClose = token
  isClosing.value = true
  props.beforeClose(() => {
    if (pendingClose !== token) return
    pendingClose = null
    isClosing.value = false
    open.value = false
  })
}

function cancelClose() {
  pendingClose = null
  isClosing.value = false
}

function close() {
  requestClose()
}

// Guard stale pending token (same as useDialog.ts deactivate).
watch(open, (value) => {
  if (!value) {
    pendingClose = null
    isClosing.value = false
  }
})

const resolvedRole = computed(
  () =>
    props.role ?? (props.variant === 'error' || props.variant === 'warning' ? 'alert' : 'status'),
)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.message,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-message',
    `ui-message--${props.variant}`,
    props.appearance === 'bare' && 'ui-message--bare',
  ),
)
const iconPart = computed(() => resolveUiPart(cx, themedUi()?.icon, 'ui-message-icon'))
const contentPart = computed(() => resolveUiPart(cx, themedUi()?.content, 'ui-message-content'))
const titlePart = computed(() => resolveUiPart(cx, themedUi()?.title, 'ui-message-title'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-message-description'),
)
const closePart = computed(() => resolveUiPart(cx, themedUi()?.close, 'ui-message-close'))

defineExpose({ el: root, close, isClosing, cancelClose })
</script>
