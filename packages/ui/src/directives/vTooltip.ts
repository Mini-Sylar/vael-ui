import { watchEffect } from 'vue'
import type { Directive, DirectiveBinding } from 'vue'
import type { Side } from '@floating-ui/dom'
import type { Align } from '../composables/useFloatingPosition'

export interface TooltipDirectiveOptions {
  content: string
  side?: Side
  align?: Align
  openDelay?: number
  closeDelay?: number
  /** Per-target override for TooltipHost's `beforeClose` prop — same escape hatch as Tooltip.vue's own prop, threaded through since TooltipHost is a single shared singleton. */
  beforeClose?: (done: () => void) => void
  /** Per-target override for TooltipHost's `forceMount` prop. */
  forceMount?: boolean
}

export type TooltipDirectiveValue = string | TooltipDirectiveOptions | null | undefined

// Backed by globalThis, not a plain module-scope WeakMap: the VDOM and Vapor
// builds are separate bundled files, so `new WeakMap()` here would give each
// its own copy, and a Vapor-compiled v-tooltip would never reach the app's
// (usually VDOM-sourced) <TooltipHost/>.
const TOOLTIP_TARGETS_KEY = Symbol.for('vael-ui.tooltipTargets')
type TooltipTargetsGlobal = typeof globalThis & {
  [TOOLTIP_TARGETS_KEY]?: WeakMap<HTMLElement, TooltipDirectiveOptions>
}
const targetsGlobal = globalThis as TooltipTargetsGlobal
export const tooltipTargets: WeakMap<HTMLElement, TooltipDirectiveOptions> = (targetsGlobal[
  TOOLTIP_TARGETS_KEY
] ??= new WeakMap())

export const TOOLTIP_ATTR = 'data-ui-tooltip'

const SIDES = ['top', 'bottom', 'left', 'right'] as const

function normalize(
  value: string | TooltipDirectiveOptions,
  modifiers: Partial<Record<string, boolean>>,
): TooltipDirectiveOptions {
  const options = typeof value === 'string' ? { content: value } : { ...value }
  if (!options.side) {
    options.side = SIDES.find((side) => modifiers[side])
  }
  return options
}

// A directive on a component binds to its ROOT element, and a
// `display: contents` root (e.g. Button's badge wrapper) has a zero rect —
// useless as a floating-ui reference and wrong for aria-describedby. Descend
// to the first element that actually generates a box.
function resolveTarget(el: HTMLElement): HTMLElement {
  let target = el
  while (
    target.firstElementChild instanceof HTMLElement &&
    getComputedStyle(target).display === 'contents'
  ) {
    target = target.firstElementChild
  }
  return target
}

// mounted's resolution reused verbatim on update/unmount — re-resolving there
// could pick a different node if styles changed in between.
const resolvedTargets = new WeakMap<HTMLElement, HTMLElement>()

// Shared by both the VDOM directive object below and vTooltipVapor — apply
// (or update) the current value against whatever target `el` last resolved
// to, registering a fresh target the first time a real value shows up.
function apply(
  el: HTMLElement,
  value: string | TooltipDirectiveOptions,
  modifiers: Partial<Record<string, boolean>>,
) {
  let target = resolvedTargets.get(el)
  if (!target) {
    target = resolveTarget(el)
    resolvedTargets.set(el, target)
    target.setAttribute(TOOLTIP_ATTR, '')
  }
  tooltipTargets.set(target, normalize(value, modifiers))
}

function teardown(el: HTMLElement) {
  const target = resolvedTargets.get(el) ?? el
  target.removeAttribute(TOOLTIP_ATTR)
  tooltipTargets.delete(target)
  resolvedTargets.delete(el)
}

// v-tooltip="'text'" for plain content, or v-tooltip="{ content, side, ... }"
// for options. Modifiers .top/.bottom/.left/.right set the side shorthand:
// v-tooltip.bottom="'text'".
export const vTooltip: Directive<HTMLElement, TooltipDirectiveValue> = {
  mounted(el, binding) {
    if (binding.value == null) return
    apply(el, binding.value, binding.modifiers)
  },
  // `undefined`/`null` means "no tooltip" — the common case is a computed
  // label that's conditionally absent (`v-tooltip="hint || undefined"`), so
  // this both tears an existing target down and lets one start being bound
  // later (mount-time absence isn't final either way).
  updated(el, binding) {
    if (binding.value == null) {
      if (binding.oldValue == null) return
      teardown(el)
      return
    }
    apply(el, binding.value, binding.modifiers)
  },
  unmounted(el) {
    teardown(el)
  },
}

export function vTooltipVapor(
  el: HTMLElement,
  binding: DirectiveBinding<TooltipDirectiveValue>,
): void
export function vTooltipVapor(
  el: HTMLElement,
  value?: () => TooltipDirectiveValue,
  argument?: unknown,
  modifiers?: Partial<Record<string, boolean>>,
): () => void
export function vTooltipVapor(
  el: HTMLElement,
  value?: (() => TooltipDirectiveValue) | DirectiveBinding<TooltipDirectiveValue>,
  _argument?: unknown,
  modifiers: Partial<Record<string, boolean>> = {},
): (() => void) | void {
  watchEffect(() => {
    const current = typeof value === 'function' ? value() : undefined
    if (current == null) {
      if (resolvedTargets.has(el)) teardown(el)
      return
    }
    apply(el, current, modifiers)
  })
  return () => teardown(el)
}
