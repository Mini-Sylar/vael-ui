<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="attrs">
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

<script setup lang="ts">
import './Accordion.css'
import '../shared/tokens.css'
import { computed, provide, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
/** Open item's `value`, or an array of them with `multiple`. @default null */
const value = defineModel<string | string[] | null>('value', { default: null })

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
  change: [value: string | string[] | null]
}>()

function isOpen(itemValue: string): boolean {
  return props.multiple
    ? Array.isArray(value.value) && value.value.includes(itemValue)
    : value.value === itemValue
}

function toggle(itemValue: string) {
  if (props.multiple) {
    const current = Array.isArray(value.value) ? value.value : []
    const opening = !current.includes(itemValue)
    if (!opening && !props.collapsible && current.length === 1) return
    const next = opening ? [...current, itemValue] : current.filter((v) => v !== itemValue)
    value.value = next
    emit('change', next)
    return
  }
  const next = value.value === itemValue ? (props.collapsible ? null : value.value) : itemValue
  if (next === value.value) return
  value.value = next
  emit('change', next)
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
