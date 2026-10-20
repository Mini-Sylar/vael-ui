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
        :data-morphing="morphing || undefined"
      >
        <div
          :id="tooltipId"
          ref="panel"
          role="tooltip"
          :class="panelPart.class"
          :style="[{ transformOrigin }, panelStyle, panelPart.style]"
          v-bind="$attrs"
        >
          <span class="ui-tooltip-content">
            <slot :content="content" :side="resolvedSide">{{ content }}</slot>
          </span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { Side } from '@floating-ui/dom'
import type { UiPartValue } from '../../classes'

export interface TooltipHostProps {
  /** Default side for targets whose `v-tooltip` value doesn't set one. @default 'top' */
  side?: Side
  /** Delay before a cold open, in milliseconds. Warm-group opens are instant. @default 400 */
  openDelay?: number
  /** Grace period after the pointer leaves, in milliseconds, so it can move onto the tooltip. @default 100 */
  closeDelay?: number
  /** Global default for every `v-tooltip` target; override it per target with `v-tooltip="{ beforeClose }"`. */
  beforeClose?: (done: () => void) => void
  /** Global default for every `v-tooltip` target; override it per target with `v-tooltip="{ forceMount }"`. @default false */
  forceMount?: boolean
  /** Class and style overrides for each part. */
  ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }>
}
</script>

<!-- Singleton behind v-tooltip; document delegation to every target -->
<script setup lang="ts">
import '../shared/tooltip.css'
import '../shared/tokens.css'
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import { useEventListener } from '@vueuse/core'
import { ssrDocument } from '../../ssr'
import { setDescribedBy, useTooltipCore } from '../../composables/useTooltip'
import { TOOLTIP_ATTR, tooltipTargetListeners, tooltipTargets } from '../../directives/vTooltip'
import type { TooltipDirectiveOptions } from '../../directives/vTooltip'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

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
  // 8 is the core's own default gap.
  sideOffset: () => {
    const offset = config.value?.sideOffset
    return (typeof offset === 'function' ? offset() : offset) ?? 8
  },
  openDelay: () => config.value?.openDelay ?? props.openDelay ?? 400,
  closeDelay: () => config.value?.closeDelay ?? props.closeDelay ?? 100,
  beforeClose: () => config.value?.beforeClose ?? props.beforeClose,
})
const {
  positionerStyle,
  panelStyle,
  placement,
  transformOrigin,
  isClosing,
  instant,
  traveling,
  morphing,
} = core

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

// Only the current target matters, so one listener covers every target.
function onTargetChange(target: HTMLElement) {
  if (target !== currentEl.value) return
  config.value = tooltipTargets.get(target) ?? null
  if (!config.value) core.hide()
}
onMounted(() => tooltipTargetListeners.add(onTargetChange))
onBeforeUnmount(() => tooltipTargetListeners.delete(onTargetChange))

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
    if (previousEl && previousEl !== el) setDescribedBy(previousEl, tooltipId, false)
    if (el) setDescribedBy(el, tooltipId, isOpen)
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
