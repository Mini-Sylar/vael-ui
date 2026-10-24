<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="dataState"
    v-bind="attrs"
  >
    <span
      ref="triggerWrapper"
      :class="triggerPart.class"
      :style="triggerPart.style"
      @click="onToggle"
    >
      <slot name="trigger" :open="open" />
    </span>
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
      <div :class="bodyPart.class" :style="bodyPart.style">
        <slot />
      </div>
    </div>
  </div>
</template>

<!-- Single disclosure with auto-wired trigger slot; imperative aria-expanded/aria-controls via watchEffect -->
<script setup lang="ts">
import './Collapsible.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, shallowRef, useAttrs, useId, useTemplateRef, watchEffect } from 'vue'
import { useMutationObserver } from '@vueuse/core'
import { useCollapse } from '../../composables/useCollapse'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import type { CollapsibleMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
/** Whether the panel is open. @default false */
const open = defineModel<boolean>('open', { default: false })

const rawProps = withDefaults(
  defineProps<{
    /** Blocks toggling and marks the trigger `aria-disabled`. @default false */
    disabled?: boolean
    /**
     * How it moves: its appearance (`{ initial: { panel: { opacity: 0 } } }`) and its states
     * (`{ states: { open: { trigger: { opacity: 0.7 } } } }`). `false` skips the height transition;
     * use the exposed `panelEl` for your own. @default true
     */
    motion?: CollapsibleMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; trigger: UiPartValue; panel: UiPartValue; body: UiPartValue }>
  }>(),
  { disabled: false, motion: undefined },
)
const props = withProviderDefaults(rawProps, { motion: true })

defineSlots<{
  /** Toggle control: clicks toggle the panel, and its first button receives `aria-expanded` and `aria-controls`. */
  trigger(props: { open: boolean }): unknown
  /** Panel content. */
  default(): unknown
}>()

function onToggle() {
  if (props.disabled) return
  open.value = !open.value
}

const panelId = useId()
// The trigger names the panel's region.
const triggerId = shallowRef<string>()

const root = useTemplateRef<HTMLElement>('root')
const triggerWrapper = useTemplateRef<HTMLElement>('triggerWrapper')
const panel = useTemplateRef<HTMLElement>('panel')

const { style: collapseStyle, state: collapseState } = useCollapse(open, {
  el: panel,
  motion: () => props.motion !== false,
  // Its own motion="false" hands the height over; a provider's just makes it instant.
  handOff: () => rawProps.motion === false,
})

const parts = useStateMotion({
  key: 'collapsible',
  mainPart: 'root',
  motion: () => props.motion,
  parts: () => ({ root: root.value, trigger: triggerWrapper.value, panel: panel.value }),
  states: () => ({ open: open.value, disabled: props.disabled }),
})

// Reach into slot's real focusable child to keep expanded state + panel association in sync
function syncTrigger() {
  const trigger =
    triggerWrapper.value?.querySelector<HTMLElement>('button, [role="button"], a[href]') ??
    (triggerWrapper.value?.firstElementChild as HTMLElement | null)
  if (!trigger) return
  if (!trigger.id) trigger.id = `${panelId}-trigger`
  triggerId.value = trigger.id
  trigger.setAttribute('aria-expanded', String(open.value))
  trigger.setAttribute('aria-controls', panelId)
  if (props.disabled) trigger.setAttribute('aria-disabled', 'true')
  else trigger.removeAttribute('aria-disabled')
}
watchEffect(syncTrigger)
// A trigger slot that swaps in a different element gets the same wiring.
useMutationObserver(triggerWrapper, syncTrigger, { childList: true, subtree: true })

const dataState = computed(() => (open.value ? 'open' : 'closed'))

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.collapsible,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-collapsible',
    props.disabled && 'ui-collapsible--disabled',
  ),
)
const triggerPart = computed(() => resolveUiPart(cx, themedUi()?.trigger, 'ui-collapsible-trigger'))
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-collapsible-panel'))
const bodyPart = computed(() => resolveUiPart(cx, themedUi()?.body, 'ui-collapsible-body'))

defineExpose({
  /** Root element. */
  el: root,
  /** Panel element, always mounted. */
  panelEl: panel,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
