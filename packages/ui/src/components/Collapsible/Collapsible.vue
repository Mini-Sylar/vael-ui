<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" :data-state="dataState">
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
      :class="panelPart.class"
      :style="[collapseStyle, panelPart.style]"
      :data-state="collapseState"
      :aria-hidden="collapseState === 'closed' ? 'true' : undefined"
    >
      <div class="ui-collapsible-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<!-- Single disclosure with auto-wired trigger slot; imperative aria-expanded/aria-controls via watchEffect -->
<script setup lang="ts">
import './Collapsible.css'
import { computed, useId, useTemplateRef, watchEffect } from 'vue'
import { useCollapse } from '../../composables/useCollapse'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    // false skips transitions; use exposed panelEl for custom motion
    motionCss?: boolean
    ui?: Partial<{ root: UiPartValue; trigger: UiPartValue; panel: UiPartValue }>
  }>(),
  { disabled: false, motionCss: true },
)

defineSlots<{
  // Collapsible wires click handler and aria attributes
  trigger(props: { open: boolean }): unknown
  default(): unknown
}>()

function onToggle() {
  if (props.disabled) return
  open.value = !open.value
}

const panelId = useId()

const root = useTemplateRef<HTMLElement>('root')
const triggerWrapper = useTemplateRef<HTMLElement>('triggerWrapper')
const panel = useTemplateRef<HTMLElement>('panel')

const { style: collapseStyle, state: collapseState } = useCollapse(open, {
  el: panel,
  motionCss: () => props.motionCss,
})

// Reach into slot's real focusable child to keep expanded state + panel association in sync
watchEffect(() => {
  const trigger =
    triggerWrapper.value?.querySelector<HTMLElement>('button, [role="button"], a[href]') ??
    (triggerWrapper.value?.firstElementChild as HTMLElement | null)
  if (!trigger) return
  trigger.setAttribute('aria-expanded', String(open.value))
  trigger.setAttribute('aria-controls', panelId)
  if (props.disabled) trigger.setAttribute('aria-disabled', 'true')
  else trigger.removeAttribute('aria-disabled')
})

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

defineExpose({ el: root, panelEl: panel })
</script>
