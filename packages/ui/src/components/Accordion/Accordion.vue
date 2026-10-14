<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    data-accordion-root
    @keydown="onKeydown"
    v-bind="attrs"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'

export interface AccordionContext {
  isOpen: (value: string) => boolean
  toggle: (value: string) => void
  motionCss: () => boolean
}

export const accordionKey: InjectionKey<AccordionContext> = Symbol('ui-accordion')
</script>

<script setup lang="ts" generic="V extends string | string[] | null = string | string[] | null">
import './Accordion.css'
import '../shared/tokens.css'
import { computed, provide, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
/** Open item's `value` (a `string`, or a union of your item values), or an array of them with `multiple`. `V` takes the type you bind, and `@change` hands the same type back. @default null */
const value = defineModel<V>('value')

const props = withDefaults(
  defineProps<{
    /** Lets several items be open at once; the model becomes an array. @default false */
    multiple?: boolean
    /** Whether the last open item can close, leaving none open. @default true */
    collapsible?: boolean
    /** `false` skips transitions; use exposed `panelEl`/`open` for custom motion. @default true */
    motionCss?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { multiple: false, collapsible: true, motionCss: true },
)

const emit = defineEmits<{
  /** Fires when an item opens or closes, with the new value. */
  change: [value: V]
}>()

// Items report plain strings; the model's narrower type is the caller's to choose.
const current = () => (value.value ?? null) as string | string[] | null
function commit(next: string | string[] | null) {
  value.value = next as typeof value.value
  emit('change', next as V)
}

function isOpen(itemValue: string): boolean {
  const open = current()
  return props.multiple ? Array.isArray(open) && open.includes(itemValue) : open === itemValue
}

function toggle(itemValue: string) {
  const open = current()
  if (props.multiple) {
    const list = Array.isArray(open) ? open : []
    const opening = !list.includes(itemValue)
    if (!opening && !props.collapsible && list.length === 1) return
    commit(opening ? [...list, itemValue] : list.filter((v) => v !== itemValue))
    return
  }
  const next = open === itemValue ? (props.collapsible ? null : open) : itemValue
  if (next !== open) commit(next)
}

// ARIA accordion pattern: arrows and Home/End move between this accordion's
// own triggers (not a nested accordion's), skipping disabled ones.
function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const rootEl = root.value
  if (!rootEl || !target.matches('[data-accordion-trigger]')) return
  if (target.closest('[data-accordion-root]') !== rootEl) return
  const triggers = Array.from(
    rootEl.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]'),
  ).filter((el) => !el.disabled && el.closest('[data-accordion-root]') === rootEl)
  const index = triggers.indexOf(target as HTMLButtonElement)
  if (index === -1) return
  let next: HTMLButtonElement | undefined
  if (event.key === 'ArrowDown') next = triggers[(index + 1) % triggers.length]
  else if (event.key === 'ArrowUp') next = triggers[(index - 1 + triggers.length) % triggers.length]
  else if (event.key === 'Home') next = triggers[0]
  else if (event.key === 'End') next = triggers[triggers.length - 1]
  if (!next) return
  event.preventDefault()
  next.focus()
}

defineSlots<{
  /** The `AccordionItem`s. */
  default(): unknown
}>()

provide(accordionKey, { isOpen, toggle, motionCss: () => props.motionCss })

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.accordion,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-accordion'))

defineExpose({
  /** Root element. */
  el: root,
})
</script>
