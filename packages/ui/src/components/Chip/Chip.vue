<template>
  <span
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-disabled="disabled || undefined"
    v-bind="attrs"
    @keydown="onKeydown"
  >
    <span :class="labelPart.class" :style="labelPart.style"
      ><slot>{{ label }}</slot></span
    >
    <button
      v-if="removable"
      type="button"
      :class="removePart.class"
      :style="removePart.style"
      :aria-label="label ? `${messages.chip.remove} ${label}` : messages.chip.remove"
      :disabled="disabled"
      @click.stop="onRemoveClick"
      @mousedown.stop.prevent
    >
      <svg viewBox="0 0 16 16" width="10" height="10" fill="none" aria-hidden="true">
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </span>
</template>

<script lang="ts">
// Shared across instances: chips still in the DOM for a leave transition must not receive focus.
const unmountedChips = new WeakSet<Element>()
</script>

<!-- Small reusable pill; remove button stops propagation to avoid toggling parent trigger -->
<script setup lang="ts">
import './Chip.css'
import '../shared/tokens.css'
import '../shared/chip.css'
import { computed, onBeforeUnmount, onUnmounted, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Label text. Also names the remove button, so pass it even when using the default slot. */
    label?: string
    /** Shows a remove button that fires `@remove`. @default false */
    removable?: boolean
    /** Disables the remove button. @default false */
    disabled?: boolean
    /** Chip size. @default 'md' */
    size?: 'sm' | 'md'
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; label: UiPartValue; remove: UiPartValue }>
  }>(),
  { removable: false, disabled: false, size: 'md' },
)

const emit = defineEmits<{
  /** Fires when you click the remove button, or press Delete/Backspace on a focused removable chip. */
  remove: []
}>()

defineSlots<{
  /** Label content; replaces the `label` text. The remove button keeps its name from `label`. */
  default(): unknown
}>()

const messages = useUiMessages()

function onRemoveClick() {
  if (props.disabled) return
  emit('remove')
}

function onKeydown(event: KeyboardEvent) {
  if (!props.removable || props.disabled) return
  if (event.key !== 'Delete' && event.key !== 'Backspace') return
  // Only the chip itself or its remove button; slotted controls keep their own keys.
  const target = event.target as HTMLElement
  if (target !== root.value && !target.classList.contains('ui-chip-remove')) return
  event.preventDefault()
  emit('remove')
}

const root = useTemplateRef<HTMLElement>('root')

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'

function focusTargetOf(chip: Element): HTMLElement | null {
  if (chip.matches('[tabindex]:not([tabindex="-1"])')) return chip as HTMLElement
  return chip.querySelector<HTMLElement>(FOCUSABLE)
}

// Removing the focused chip would drop focus to <body>; hand it to a neighbour instead.
let focusAfterUnmount: HTMLElement | null = null
onBeforeUnmount(() => {
  const el = root.value
  if (!el) return
  unmountedChips.add(el)
  const active = document.activeElement
  if (!active || !el.contains(active)) return
  const siblings = el.parentElement ? Array.from(el.parentElement.children) : []
  const index = siblings.indexOf(el)
  const pick = (list: Element[]) => {
    for (const s of list) {
      if (!s.classList.contains('ui-chip') || unmountedChips.has(s)) continue
      const t = focusTargetOf(s)
      if (t) return t
    }
    return null
  }
  focusAfterUnmount = pick(siblings.slice(index + 1)) ?? pick(siblings.slice(0, index).reverse())
})
onUnmounted(() => {
  const target = focusAfterUnmount
  focusAfterUnmount = null
  if (target?.isConnected) target.focus()
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.chip,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-chip',
    `ui-chip--${props.size}`,
    props.removable && 'ui-chip--removable',
  ),
)
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-chip-label'))
const removePart = computed(() => resolveUiPart(cx, themedUi()?.remove, 'ui-chip-remove'))

defineExpose({
  /** Root element. */
  el: root,
})
</script>
