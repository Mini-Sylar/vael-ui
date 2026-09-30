<template>
  <Teleport to="body">
    <Transition name="ui-tooltip" :css="!forceMount">
      <div
        v-if="forceMount || open"
        v-show="open"
        ref="positioner"
        :class="positionerPart.class"
        :style="[positionerStyle, positionerPart.style]"
        :data-ui-theme="themeScope"
        :data-state="isClosing ? 'closing' : 'open'"
        :data-side="resolvedSide"
        :data-instant="instant || undefined"
        :data-traveling="traveling || undefined"
        :data-sizing-locked="travelActive || undefined"
      >
        <div
          :id="tooltipId"
          ref="panel"
          role="tooltip"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelPart.style]"
        >
          <slot :content="content" :side="resolvedSide">{{ content }}</slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { Side } from '@floating-ui/dom'
import type { UiPartValue } from '../../classes'

export interface TooltipHostProps {
  /** Default side for targets whose `v-tooltip` value doesn't set one. */
  side?: Side
  /** Delay before a cold open, in milliseconds. Warm-group opens are instant. */
  openDelay?: number
  /** Grace period after the pointer leaves, in milliseconds, so it can move onto the tooltip. */
  closeDelay?: number
  /** Global default for every `v-tooltip` target; override it per target with `v-tooltip="{ beforeClose }"`. */
  beforeClose?: (done: () => void) => void
  /** Global default for every `v-tooltip` target; override it per target with `v-tooltip="{ forceMount }"`. */
  forceMount?: boolean
  /** Class and style overrides for each part. */
  ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<!-- Singleton behind v-tooltip; document delegation to every target -->
<script setup lang="ts">
import '../shared/tooltip.css'
import '../shared/tokens.css'
import { computed, inject, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrDocument } from '../../ssr'
import { useTooltipCore } from '../../composables/useTooltip'
import { TOOLTIP_ATTR, tooltipTargets } from '../../directives/vTooltip'
import type { TooltipDirectiveOptions } from '../../directives/vTooltip'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'

const props = defineProps<TooltipHostProps>()

defineSlots<{
  /** Custom tooltip body; defaults to the text `content`. */
  default(props: { content: string; side: Side }): unknown
}>()

const currentEl = shallowRef<HTMLElement | null>(null)
const config = shallowRef<TooltipDirectiveOptions | null>(null)
const open = shallowRef(false)

const positionerEl = useTemplateRef<HTMLElement>('positioner')
const panelEl = useTemplateRef<HTMLElement>('panel')

const core = useTooltipCore(open, {
  triggerEl: currentEl,
  positionerEl,
  side: () => config.value?.side ?? props.side ?? 'top',
  align: () => config.value?.align ?? 'center',
  openDelay: () => config.value?.openDelay ?? props.openDelay ?? 400,
  closeDelay: () => config.value?.closeDelay ?? props.closeDelay ?? 100,
  beforeClose: () => config.value?.beforeClose ?? props.beforeClose,
})
const { positionerStyle, placement, transformOrigin, isClosing, instant, traveling, travelActive } =
  core

const content = computed(() => config.value?.content ?? '')
// Per-target override with host default (like side/openDelay/closeDelay).
const forceMount = computed(() => config.value?.forceMount ?? props.forceMount ?? false)

function findTarget(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null
  return node.closest<HTMLElement>(`[${TOOLTIP_ATTR}]`)
}

function adopt(target: HTMLElement) {
  if (currentEl.value === target) return
  if (open.value) core.beginTravel()
  currentEl.value = target
  config.value = tooltipTargets.get(target) ?? null
}

// pointerover/out bubble (enter/leave don't) — that's what makes delegation work.
useEventListener(ssrDocument, 'pointerover', (event: PointerEvent) => {
  const target = findTarget(event.target)
  if (!target) return
  adopt(target)
  core.pointerEnter(event)
})

useEventListener(ssrDocument, 'pointerout', (event: PointerEvent) => {
  const target = findTarget(event.target)
  if (!target || target !== currentEl.value) return
  const next = event.relatedTarget
  if (next instanceof Node && (target.contains(next) || positionerEl.value?.contains(next))) return
  core.pointerLeave()
})

useEventListener(ssrDocument, 'focusin', (event: FocusEvent) => {
  const target = findTarget(event.target)
  if (!target) return
  adopt(target)
  core.focusEnter()
})

useEventListener(ssrDocument, 'focusout', (event: FocusEvent) => {
  const target = findTarget(event.target)
  if (target && target === currentEl.value) core.focusLeave(event)
})

useEventListener(
  ssrDocument,
  'pointerdown',
  (event: PointerEvent) => {
    const target = findTarget(event.target)
    if (target && target === currentEl.value) core.press(event)
  },
  true,
)

const tooltipId = useId()

watch(
  [open, currentEl] as const,
  ([isOpen, el], previous) => {
    const previousEl = previous?.[1]
    if (previousEl && previousEl !== el) previousEl.removeAttribute('aria-describedby')
    if (!el) return
    if (isOpen) el.setAttribute('aria-describedby', tooltipId)
    else if (el.getAttribute('aria-describedby') === tooltipId)
      el.removeAttribute('aria-describedby')
  },
  { flush: 'post' },
)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.tooltip,
  () => props.ui,
)
const themeScope = inject(themeScopeKey, undefined)

const positionerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.positioner, 'ui-tooltip-positioner'),
)
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-tooltip-panel'))
const resolvedSide = computed(() => placement.value.split('-')[0] as Side)

defineExpose({
  /** Panel element (`null` while closed). */
  panelEl,
  /** Positioning wrapper around the panel (`null` while closed). */
  positionerEl,
  /** The `v-tooltip` target the tooltip is attached to. */
  currentEl,
})
</script>
