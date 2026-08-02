<template>
  <div
    :class="itemPart.class"
    :style="itemPart.style"
    :data-motion="ctx.motionCss() ? undefined : 'off'"
  >
    <h3 :class="headerPart.class" :style="headerPart.style">
      <button
        :id="triggerId"
        type="button"
        :class="triggerPart.class"
        :style="triggerPart.style"
        :aria-expanded="isOpenValue"
        :aria-controls="panelId"
        :disabled="disabled"
        @click="onToggle"
      >
        <slot name="trigger" :open="isOpenValue" :toggle="onToggle">
          <span class="ui-accordion-trigger-title">{{ title }}</span>
          <svg
            class="ui-accordion-chevron"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </slot>
      </button>
    </h3>
    <div
      ref="panel"
      :id="panelId"
      role="region"
      :aria-labelledby="triggerId"
      :class="panelPart.class"
      :style="[collapseStyle, panelPart.style]"
      :data-state="collapseState"
      :aria-hidden="collapseState === 'closed' ? 'true' : undefined"
    >
      <div :class="bodyPart.class" :style="bodyPart.style">
        <slot :open="isOpenValue" :toggle="onToggle" />
      </div>
    </div>
  </div>
</template>

<!-- No beforeClose: panel always mounted (collapsed); data-state + motionCss={false} + exposed panelEl for exit animation -->
<script setup lang="ts">
import { computed, inject, useId, useTemplateRef } from 'vue'
import { accordionKey } from './Accordion.vue'
import { useCollapse } from '../composables/useCollapse'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const props = defineProps<{
  value: string
  title?: string
  disabled?: boolean
  ui?: Partial<{
    item: UiPartValue
    header: UiPartValue
    trigger: UiPartValue
    panel: UiPartValue
    body: UiPartValue
  }>
}>()

defineSlots<{
  default(props: { open: boolean; toggle: () => void }): unknown
  trigger(props: { open: boolean; toggle: () => void }): unknown
}>()

const injectedCtx = inject(accordionKey)
if (!injectedCtx) {
  throw new Error('AccordionItem must be rendered inside an Accordion')
}
// Reassign to prevent TS narrowing from being lost in hoisted function
const ctx = injectedCtx

const isOpenValue = computed(() => ctx.isOpen(props.value))
function onToggle() {
  if (props.disabled) return
  ctx.toggle(props.value)
}

const triggerId = useId()
const panelId = useId()

const panel = useTemplateRef<HTMLElement>('panel')
const { style: collapseStyle, state: collapseState } = useCollapse(isOpenValue, {
  el: panel,
  motionCss: ctx.motionCss,
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.accordionItem,
  () => props.ui,
)
const itemPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.item,
    'ui-accordion-item',
    props.disabled && 'ui-accordion-item--disabled',
  ),
)
const headerPart = computed(() => resolveUiPart(cx, themedUi()?.header, 'ui-accordion-header'))
const triggerPart = computed(() => resolveUiPart(cx, themedUi()?.trigger, 'ui-accordion-trigger'))
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-accordion-panel'))
const bodyPart = computed(() => resolveUiPart(cx, themedUi()?.body, 'ui-accordion-body'))

defineExpose({ panelEl: panel, open: isOpenValue })
</script>
