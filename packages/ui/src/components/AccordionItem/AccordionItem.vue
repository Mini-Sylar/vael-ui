<template>
  <div
    ref="item"
    :class="parts.item.class"
    :style="parts.item.style"
    :data-motion="ctx.motion() ? undefined : 'off'"
    v-bind="attrs"
  >
    <component :is="headingTag()" :class="parts.header.class" :style="parts.header.style">
      <button
        :id="triggerId"
        type="button"
        :class="parts.trigger.class"
        :style="parts.trigger.style"
        :aria-expanded="isOpenValue"
        :aria-controls="panelId"
        :aria-disabled="isLocked() || undefined"
        :disabled="disabled"
        data-accordion-trigger
        @click="onToggle"
      >
        <slot name="trigger" :open="isOpenValue" :toggle="onToggle">
          <span class="ui-accordion-trigger-title">{{ title }}</span>
          <svg
            ref="chevron"
            :class="parts.chevron.class"
            :style="parts.chevron.style"
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
      :class="parts.panel.class"
      :style="[collapseStyle, parts.panel.style]"
      :data-state="collapseState"
      :aria-hidden="collapseState === 'closed' && !findable ? 'true' : undefined"
      :inert="collapseState === 'closed' && !findable"
    >
      <div :class="parts.body.class" :style="parts.body.style">
        <slot :open="isOpenValue" :toggle="onToggle" />
      </div>
    </div>
  </div>
</template>

<!-- No beforeClose: panel always mounted (collapsed); data-state + motion={false} + exposed panelEl/chevronEl for exit animation -->
<script setup lang="ts">
import './AccordionItem.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
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
// APG: an open panel that can't collapse marks its trigger aria-disabled, still focusable.
const isLocked = () => !props.disabled && ctx.isLocked(props.value)
function onToggle() {
  if (props.disabled) return
  ctx.toggle(props.value)
}

const headingTag = () => nativeTag(`h${props.headingLevel ?? ctx.headingLevel()}`)

const triggerId = useId()
const panelId = useId()

const panel = useTemplateRef<HTMLElement>('panel')
const {
  style: collapseStyle,
  state: collapseState,
  findable,
} = useCollapse(isOpenValue, {
  el: panel,
  motion: ctx.motion,
  handOff: ctx.handOff,
  // The browser's find opens it on a match (closing the others, as a click would), disabled or
  // not: the browser has already shown the match.
  onFind: () => {
    if (!isOpenValue.value) ctx.toggle(props.value)
  },
})

const item = useTemplateRef<HTMLElement>('item')
const chevron = useTemplateRef<SVGSVGElement>('chevron')
useStateMotion({
  key: 'accordion',
  mainPart: 'trigger',
  motion: ctx.states,
  // Your timing reaches the whole item: the panel's height as well as the chevron.
  root: () => item.value,
  // Found from the item and the panel: fewer template refs to set on every mount.
  parts: () => {
    const header = item.value?.firstElementChild
    return {
      item: item.value,
      header,
      trigger: header?.firstElementChild,
      chevron: chevron.value,
      panel: panel.value,
      body: panel.value?.firstElementChild,
    }
  },
  states: () => ({ open: isOpenValue.value, disabled: !!props.disabled }),
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.accordionItem,
  () => props.ui,
)
// One computed for every part: each item on a long page sets up one instead of six.
const parts = computed(() => {
  const ui = themedUi()
  return {
    item: resolveUiPart(
      cx,
      ui?.item,
      'ui-accordion-item',
      props.disabled && 'ui-accordion-item--disabled',
    ),
    header: resolveUiPart(cx, ui?.header, 'ui-accordion-header'),
    trigger: resolveUiPart(cx, ui?.trigger, 'ui-accordion-trigger'),
    panel: resolveUiPart(cx, ui?.panel, 'ui-accordion-panel'),
    body: resolveUiPart(cx, ui?.body, 'ui-accordion-body'),
    chevron: resolveUiPart(cx, ui?.chevron, 'ui-accordion-chevron'),
  }
})

defineExpose({
  /** Root element. */
  el: item,
  /** Panel element, always mounted. */
  panelEl: panel,
  /** The built-in chevron, for your own engine to turn. Null when the `#trigger` slot replaces it. */
  chevronEl: chevron,
  /** Whether the item is open. */
  open: isOpenValue,
})
</script>
