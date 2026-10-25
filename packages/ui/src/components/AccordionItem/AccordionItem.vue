<template>
  <div
    ref="item"
    :class="itemPart.class"
    :style="itemPart.style"
    :data-motion="ctx.motion() ? undefined : 'off'"
    v-bind="attrs"
  >
    <component :is="headingTag" ref="header" :class="headerPart.class" :style="headerPart.style">
      <button
        ref="trigger"
        :id="triggerId"
        type="button"
        :class="triggerPart.class"
        :style="triggerPart.style"
        :aria-expanded="isOpenValue"
        :aria-controls="panelId"
        :disabled="disabled"
        data-accordion-trigger
        @click="onToggle"
      >
        <slot name="trigger" :open="isOpenValue" :toggle="onToggle">
          <span class="ui-accordion-trigger-title">{{ title }}</span>
          <svg
            ref="chevron"
            :class="chevronPart.class"
            :style="chevronPart.style"
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
    </component>
    <div
      ref="panel"
      :id="panelId"
      role="region"
      :aria-labelledby="triggerId"
      :class="panelPart.class"
      :style="[collapseStyle, panelPart.style]"
      :data-state="collapseState"
      :aria-hidden="collapseState === 'closed' ? 'true' : undefined"
      :inert="collapseState === 'closed'"
    >
      <div ref="body" :class="bodyPart.class" :style="bodyPart.style">
        <slot :open="isOpenValue" :toggle="onToggle" />
      </div>
    </div>
  </div>
</template>

<!-- No beforeClose: panel always mounted (collapsed); data-state + motion={false} + exposed panelEl/chevronEl for exit animation -->
<script setup lang="ts">
import './AccordionItem.css'
import '../shared/tokens.css'
import { computed, inject, useAttrs, useId, useTemplateRef } from 'vue'
import { accordionKey } from '../Accordion/Accordion.vue'
import { useCollapse } from '../../composables/useCollapse'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { nativeTag } from '../../composables/dom'
import { useStateMotion } from '../../motion/useStateMotion'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = defineProps<{
  /** Identifies the item in the parent `Accordion`'s value. */
  value: string
  /** Trigger text; the `#trigger` slot replaces it. */
  title?: string
  /** Disables the trigger so the item can't be toggled. */
  disabled?: boolean
  /** Overrides the parent `Accordion`'s `headingLevel` for this item. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Class and style overrides for each part. */
  ui?: Partial<{
    item: UiPartValue
    header: UiPartValue
    trigger: UiPartValue
    panel: UiPartValue
    body: UiPartValue
    /** The chevron at the end of the trigger. */
    chevron: UiPartValue
  }>
}>()

defineSlots<{
  /** Panel content. */
  default(props: { open: boolean; toggle: () => void }): unknown
  /** Replaces the trigger's title and chevron; renders inside the trigger button. */
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

const headingTag = computed(() => nativeTag(`h${props.headingLevel ?? ctx.headingLevel()}`))

const triggerId = useId()
const panelId = useId()

const panel = useTemplateRef<HTMLElement>('panel')
const { style: collapseStyle, state: collapseState } = useCollapse(isOpenValue, {
  el: panel,
  motion: ctx.motion,
  handOff: ctx.handOff,
})

const item = useTemplateRef<HTMLElement>('item')
const header = useTemplateRef<HTMLElement>('header')
const trigger = useTemplateRef<HTMLElement>('trigger')
const chevron = useTemplateRef<SVGSVGElement>('chevron')
const body = useTemplateRef<HTMLElement>('body')
useStateMotion({
  key: 'accordion',
  mainPart: 'trigger',
  motion: ctx.states,
  // Your timing reaches the whole item: the panel's height as well as the chevron.
  root: () => item.value,
  parts: () => ({
    item: item.value,
    header: header.value,
    trigger: trigger.value,
    chevron: chevron.value,
    panel: panel.value,
    body: body.value,
  }),
  states: () => ({ open: isOpenValue.value, disabled: !!props.disabled }),
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
const chevronPart = computed(() => resolveUiPart(cx, themedUi()?.chevron, 'ui-accordion-chevron'))

defineExpose({
  /** Panel element, always mounted. */
  panelEl: panel,
  /** The built-in chevron, for your own engine to turn. Null when the `#trigger` slot replaces it. */
  chevronEl: chevron,
  /** Whether the item is open. */
  open: isOpenValue,
})
</script>
