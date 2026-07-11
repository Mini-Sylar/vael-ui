<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style">
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
import { computed, provide, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const value = defineModel<string | string[] | null>('value', { default: null })

const props = withDefaults(
  defineProps<{
    multiple?: boolean
    /** Whether the last open item can close, leaving none open. */
    collapsible?: boolean
    /** `false` skips transitions; use exposed `panelEl`/`open` for custom motion. */
    motionCss?: boolean
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { multiple: false, collapsible: true, motionCss: true },
)

const emit = defineEmits<{ change: [value: string | string[] | null] }>()

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

provide(accordionKey, { isOpen, toggle, motionCss: () => props.motionCss })

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.accordion,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-accordion'))

defineExpose({ el: root })
</script>
