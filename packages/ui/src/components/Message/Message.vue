<template>
  <Transition
    name="ui-message"
    :css="!forceMount"
    @before-enter="collapse"
    @enter="grow"
    @after-enter="release"
    @before-leave="hold"
    @leave="shrink"
  >
    <div
      v-if="forceMount || open"
      v-show="open"
      ref="root"
      :class="rootPart.class"
      :style="rootPart.style"
      :role="resolvedRole"
      :data-state="isClosing ? 'closing' : 'open'"
      v-bind="attrs"
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
      <div v-if="$slots.actions" :class="actionsPart.class" :style="actionsPart.style">
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
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none">
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
import type { BeforeClose } from '../../motion/types'

/** Why a message closes: its dismiss button, or your code. */
export type MessageCloseReason = 'dismiss' | 'programmatic'

export type MessageVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface MessageOpenChangeDetails {
  event?: Event
  /** Vetoes the close, so the model never flips. */
  cancel: () => void
}

export interface MessageProps {
  /** Bold heading above the default slot content. */
  title?: string
  /** Color variant; sets the icon and border. @default 'default' */
  variant?: MessageVariant
  /** `'bare'` drops the border, background and padding, leaving only the icon and colored text.
   * Use it inline, such as for form field validation, instead of as a standalone banner.
   * @default 'default'
   */
  appearance?: 'default' | 'bare'
  /** Renders the built-in dismiss button. @default false */
  closable?: boolean
  /** Runs before the message closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. `v-model` stays `true` while the promise is pending. */
  beforeClose?: BeforeClose<MessageCloseReason>
  /** Keeps it mounted, toggled with `v-show`, so you can own the enter/exit animation. @default false */
  forceMount?: boolean
  /** Shows the leading status icon (or the `#icon` slot). @default true */
  showIcon?: boolean
  /** Defaults to `'alert'` for `'error'` and `'warning'`, `'status'` otherwise. */
  role?: 'status' | 'alert'
  /** Class and style overrides for each part. */
  ui?: Partial<{
    root: UiPartValue
    icon: UiPartValue
    content: UiPartValue
    title: UiPartValue
    description: UiPartValue
    actions: UiPartValue
    close: UiPartValue
  }>
}
</script>

<!--
  forceMount + beforeClose(done) contract reimplemented locally (Message needs no focus-trap/scroll-lock).
-->
<script setup lang="ts">
import './Message.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef, watch } from 'vue'
import { useAttrListeners } from '../../composables/forwardedListeners'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import { useThemedUi } from '../../theme'
import StatusIcon from '../internal/StatusIcon.vue'
import { getFocusable } from '../../composables/dom'
import { focusIsFromKeyboard } from '../../composables/useFocusVisible'
import { useCloseGuard } from '../../composables/useCloseGuard'

defineOptions({ inheritAttrs: false })

/** Whether the message is shown. @default true */
const open = defineModel<boolean>('open', { default: true })

const props = withDefaults(defineProps<MessageProps>(), {
  variant: 'default',
  appearance: 'default',
  closable: false,
  forceMount: false,
  showIcon: true,
})

const emit = defineEmits<{
  /** Fires before the model flips to false; `details.cancel()` vetoes the close. */
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
const rawAttrs = useAttrs()
const attrs = useAttrListeners(
  () => root.value,
  () => rawAttrs,
)

const { isClosing, close: closeGuarded, cancelClose } = useCloseGuard(open, () => props.beforeClose)

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

  closeGuarded(event ? 'dismiss' : 'programmatic')
}

function close() {
  requestClose()
}

// Guard stale pending token (same as useDialog.ts deactivate).
watch(open, (value) => {
  if (!value) {
    cancelClose()
    moveFocusOut()
  }
})

// Runs before the DOM update, while the message still holds focus, so focus doesn't drop to <body>.
function moveFocusOut() {
  const el = root.value
  const active = document.activeElement
  if (!el || !active || !el.contains(active) || !focusIsFromKeyboard()) return
  const stops = getFocusable(document.body).filter((stop) => !el.contains(stop))
  const after = (stop: Element) =>
    (el.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  ;(stops.find(after) ?? stops.findLast((stop) => !after(stop)))?.focus()
}

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
const actionsPart = computed(() => resolveUiPart(cx, themedUi()?.actions, 'ui-message-actions'))

// The box grows and shrinks with the fade, so what's below moves with it instead of snapping.
// Shut, it has no height, padding, border or share of the parent's gap, so nothing lingers.
// With force-mount the consumer owns all of it.
function shutStyles(node: HTMLElement) {
  const gap = Number.parseFloat(getComputedStyle(node.parentElement ?? node).rowGap) || 0
  node.style.blockSize = '0px'
  node.style.paddingBlock = '0px'
  node.style.borderBlockWidth = '0px'
  node.style.marginBlockStart = `${-gap}px`
}
function openStyles(node: HTMLElement) {
  node.style.blockSize = `${node.dataset.size}px`
  node.style.paddingBlock = ''
  node.style.borderBlockWidth = ''
  node.style.marginBlockStart = ''
}
function collapse(el: Element) {
  if (props.forceMount) return
  const node = el as HTMLElement
  node.style.boxSizing = 'border-box'
  node.style.overflow = 'hidden'
  shutStyles(node)
}
// Runs once the box is in the DOM (before-enter is before insertion, so it can't measure).
function grow(el: Element) {
  if (props.forceMount) return
  const node = el as HTMLElement
  node.style.blockSize = ''
  node.style.paddingBlock = ''
  node.style.borderBlockWidth = ''
  node.style.marginBlockStart = ''
  node.dataset.size = String(node.offsetHeight)
  shutStyles(node)
  // Lays the shut box out before it grows, or the transition would start from `auto`.
  void node.offsetHeight
  requestAnimationFrame(() => openStyles(node))
}
function release(el: Element) {
  const node = el as HTMLElement
  delete node.dataset.size
  delete node.dataset.shrinking
  node.style.boxSizing = ''
  node.style.overflow = ''
  node.style.transition = ''
  node.style.blockSize = ''
  node.style.paddingBlock = ''
  node.style.borderBlockWidth = ''
  node.style.marginBlockStart = ''
}
function hold(el: Element) {
  const node = el as HTMLElement
  // Already shrinking alongside a `beforeClose` tween, or force-mounted.
  if (props.forceMount || node.style.blockSize) return
  node.style.boxSizing = 'border-box'
  node.style.overflow = 'hidden'
  node.style.blockSize = `${node.offsetHeight}px`
  void node.offsetHeight
}
function shrink(el: Element) {
  const node = el as HTMLElement
  if (props.forceMount || node.dataset.shrinking !== undefined) return
  requestAnimationFrame(() => shutStyles(node))
}
// A `beforeClose` tween runs before the leave; the box shrinks with it instead of after it.
watch(isClosing, (closing) => {
  const node = root.value
  if (!node || props.forceMount) return
  if (closing) {
    hold(node)
    node.dataset.shrinking = ''
    node.style.transition = [
      'block-size',
      'padding-block',
      'border-block-width',
      'margin-block-start',
    ]
      .map((property) => `${property} var(--ui-duration-exit) var(--ui-ease-out)`)
      .join(', ')
    requestAnimationFrame(() => shutStyles(node))
  } else if (open.value) {
    release(node)
  }
})

defineExpose({
  /** Root element (null while closed unless `forceMount`). */
  el: root,
  /** Closes the message, running `@open-change` and `beforeClose` first. */
  close,
  /** `true` while a `beforeClose` close is pending. */
  isClosing,
  /** Cancels a close pending in `beforeClose` and keeps the message open. */
  cancelClose,
})
</script>
