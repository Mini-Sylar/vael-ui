<template>
  <span
    v-if="$slots.badge || badgePlacement !== undefined"
    :class="['ui-button-badge-wrapper', wrapperRootPart.class]"
    :style="wrapperRootPart.style"
  >
    <component
      :is="nativeTag(as)"
      ref="root"
      v-bind="restAttrs"
      :value="value"
      :aria-pressed="ariaPressed"
      :type="isButtonTag ? type : undefined"
      :class="rootPart.class"
      :disabled="isButtonTag ? disabled : undefined"
      :aria-disabled="ariaDisabled"
      :aria-busy="isLoading || undefined"
      :tabindex="rootTabindex"
      :style="rootPart.style"
      @click="onRootClick"
    >
      <span class="ui-button-inner">
        <span class="ui-button-loader" aria-hidden="true">
          <slot name="loader" :loading="isLoading" :el="el">
            <LoaderMark :type="loaderType" />
          </slot>
        </span>
        <span
          v-if="$slots.leading"
          :class="leadingPart.class"
          :style="leadingPart.style"
          aria-hidden="true"
        >
          <slot name="leading" />
        </span>
        <span :class="contentPart.class" :style="contentPart.style">
          <span :class="labelPart.class" :style="labelPart.style"
            ><slot :loading="isLoading" :el="el" :run="run"
          /></span>
        </span>
        <span
          v-if="$slots.trailing"
          :class="trailingPart.class"
          :style="trailingPart.style"
          aria-hidden="true"
        >
          <slot name="trailing" />
        </span>
      </span>
    </component>
    <span
      v-if="$slots.badge"
      :class="badgePart.class"
      :style="badgePart.style"
      :data-placement="resolvedBadgePlacement"
    >
      <slot name="badge" />
    </span>
  </span>
  <component
    :is="nativeTag(as)"
    v-else
    ref="root"
    v-bind="restAttrs"
    :value="value"
    :aria-pressed="ariaPressed"
    :type="isButtonTag ? type : undefined"
    :class="rootPart.class"
    :disabled="isButtonTag ? disabled : undefined"
    :aria-disabled="ariaDisabled"
    :aria-busy="isLoading || undefined"
    :tabindex="rootTabindex"
    :style="rootPart.style"
    @click="onRootClick"
  >
    <span class="ui-button-inner">
      <span class="ui-button-loader" aria-hidden="true">
        <slot name="loader" :loading="isLoading" :el="el">
          <LoaderMark :type="loaderType" />
        </slot>
      </span>
      <span
        v-if="$slots.leading"
        :class="leadingPart.class"
        :style="leadingPart.style"
        aria-hidden="true"
      >
        <slot name="leading" />
      </span>
      <span :class="contentPart.class" :style="contentPart.style">
        <span :class="labelPart.class" :style="labelPart.style"
          ><slot :loading="isLoading" :el="el" :run="run"
        /></span>
      </span>
      <span
        v-if="$slots.trailing"
        :class="trailingPart.class"
        :style="trailingPart.style"
        aria-hidden="true"
      >
        <slot name="trailing" />
      </span>
    </span>
  </component>
</template>

<script lang="ts">
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'text'
  | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonLoaderPlacement = 'overlay' | 'inline'
</script>

<!--
  Loading: aria-disabled + click guard (preserves focus); loader stays mounted (interruptible crossfade).
  Dual render paths: the badge wrapper renders only with a badge in play (`#badge` slot, or
  `badgePlacement` set to reserve the structure) so a plain button keeps its `:deep()`/sibling
  selectors; when it IS the outer node it mirrors the consumer's own `ui.root`/class/style so
  class-based placement still resolves (Button.css forces the wrapper paint-free regardless of
  what that class contains — see its own comment). Badge is a sibling of the button, not a child,
  so it never inherits the button's own `:active` press-scale. `defineExpose({ el })` is the inner
  button either way.
-->
<script setup lang="ts">
import './Button.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { nativeTag, useSlotPresence } from '../../composables/dom'
import '../shared/loader-spinner.css'
import LoaderMark from '../internal/LoaderMark.vue'
import type { LoaderType } from '../../composables/loaderType'
import { computed, inject, useAttrs, useSlots, useTemplateRef } from 'vue'
import { buttonGroupKey } from '../ButtonGroup/ButtonGroup.vue'
import type { StyleValue } from 'vue'
import { useAsyncLoading } from '../../composables/useAsyncLoading'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { ClassValue, UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

// Manual attrs binding intercepts onClick; rest still fall through.
defineOptions({ inheritAttrs: false })

const rawProps = withDefaults(
  defineProps<{
    /** `true` and `false` set the loading state directly. With `'auto'`, the button stays loading
     * until every overlapping promise your `@click` handler returns settles.
     * @default false
     */
    loading?: boolean | 'auto'
    /** Disables the button and blocks interaction. @default false */
    disabled?: boolean
    /** Visual style of the button. @default 'primary' */
    variant?: ButtonVariant
    /** Button size. @default 'md' */
    size?: ButtonSize
    /**
     * `'overlay'` centers the loader over the fading content; `'inline'` slides a spinner in at the start.
     * @default 'overlay'
     */
    loader?: ButtonLoaderPlacement
    /** The loading animation. Unset, it follows the nearest ConfigProvider's `loaderType`. @default 'ring' */
    loaderType?: LoaderType
    /** Renders a square icon-only button; pair it with an `aria-label`. @default false */
    icon?: boolean
    /** Gives the button a fully rounded pill shape. @default false */
    pill?: boolean
    /** Stretches the button to its container's full inline size. @default false */
    block?: boolean
    /** Native `type` attribute; applied only when `as` is `'button'`. @default 'button' */
    type?: 'button' | 'submit' | 'reset'
    /** Root tag, such as `as="a"` for a link styled as a button. @default 'button' */
    as?: string
    /** Where the `#badge` slot sits. Setting it reserves the wrapper up front, so a `v-if`'d `#badge`
     * keeps a stable DOM position. @default 'top-end' */
    badgePlacement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
    /** In a `ButtonGroup` with a `v-model`, what this button turns on and off. Still the native
     * `value` attribute, for a submit button in a form. Style the on state with
     * `[aria-pressed='true']`, or Tailwind's `aria-pressed:`. */
    value?: string | number
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      /** Wraps the `#leading` slot and carries the gap to the label. */
      leading: UiPartValue
      /** Wraps the `#trailing` slot and carries the gap to the label. */
      trailing: UiPartValue
      /** Wraps the label (`display: inline-block`); override for stacked layouts. */
      content: UiPartValue
      /** The label itself, nested one level inside `content`. */
      label: UiPartValue
      badge: UiPartValue
    }>
  }>(),
  {
    loading: false,
    disabled: false,
    variant: 'primary',
    loader: 'overlay',
    icon: false,
    pill: false,
    block: false,
    type: 'button',
    as: 'button',
  },
)
const props = withProviderDefaults(rawProps, { size: 'md' })

defineSlots<{
  /** Button label; receives the loading state, the root element and `run`. */
  default(props: {
    loading: boolean
    el: HTMLElement | null
    run: <T>(fn: () => T | Promise<T>) => Promise<T>
  }): unknown
  /** Custom loader visuals; the library still handles placement and the crossfade. */
  loader(props: { loading: boolean; el: HTMLElement | null }): unknown
  /** Icon before the label, in an optically aligned `1em` box. */
  leading(): unknown
  /** Icon after the label, in an optically aligned `1em` box. */
  trailing(): unknown
  /** Badge content, placed in a wrapper the library positions. */
  badge(): unknown
}>()

const slots = useSlots()
const hasSlot = useSlotPresence(slots)
const attrs = useAttrs()

/** Opt-in standalone toggle: `v-model:pressed` turns it on and off and sets `aria-pressed`.
 * Style the on state with `[aria-pressed='true']`, or Tailwind's `aria-pressed:`. */
const pressed = defineModel<boolean | undefined>('pressed', { default: undefined })
const group = inject(buttonGroupKey, null)
const groupToggle = computed(() => !!group?.toggles() && props.value !== undefined)
// Toggle state when this button has one; otherwise whatever aria-pressed you passed, untouched.
const ariaPressed = computed(() => {
  if (groupToggle.value) return String(group!.isPressed(props.value!))
  if (pressed.value !== undefined) return String(pressed.value)
  return attrs['aria-pressed'] as string | boolean | undefined
})

const { loading: autoLoading, run } = useAsyncLoading()
const isLoading = computed(() => (props.loading === 'auto' ? autoLoading.value : props.loading))

const isButtonTag = computed(() => props.as === 'button')
// Non-button tags use aria-disabled (no native disabled attribute).
const ariaDisabled = computed<true | undefined>(() => {
  if (isButtonTag.value && props.disabled) return undefined
  return isLoading.value || props.disabled ? true : undefined
})
// An explicit incoming tabindex (e.g. a roving-tabindex tablist) always wins
// — this only supplies the non-button-tag disabled fallback otherwise.
const rootTabindex = computed(() => {
  if (attrs.tabindex !== undefined) return attrs.tabindex as number | string
  return !isButtonTag.value && props.disabled ? -1 : undefined
})

// Detects promise-returning handlers to trigger auto-loading.
function onRootClick(event: MouseEvent) {
  // Guard clicks during loading (no native disabled—see template comment for focus preservation).
  if (isLoading.value) return
  if (!isButtonTag.value && props.disabled) {
    event.preventDefault()
    return
  }
  const raw = attrs.onClick as
    | ((e: MouseEvent) => unknown)
    | Array<(e: MouseEvent) => unknown>
    | undefined
  for (const handler of raw ? (Array.isArray(raw) ? raw : [raw]) : []) {
    const result = handler(event)
    if (
      props.loading === 'auto' &&
      result != null &&
      typeof (result as PromiseLike<unknown>).then === 'function'
    ) {
      // Rejections intentionally propagate (as one unhandled rejection);
      // swallowing them here would hide the consumer's errors.
      void run(() => result as Promise<unknown>)
    }
  }
  // Your @click runs first and can call preventDefault() to keep the toggle where it is.
  if (event.defaultPrevented) return
  if (groupToggle.value) group!.toggle(props.value!)
  else if (pressed.value !== undefined) pressed.value = !pressed.value
}

const restAttrs = computed(() => {
  const { onClick: _onClick, ...rest } = attrs
  return rest
})

const el = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
// Theme from ConfigProvider; instance ui prop overrides per-key.
const themedUi = useThemedUi(
  (theme) => theme.button,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-button',
    `ui-button--${props.variant}`,
    `ui-button--${props.size}`,
    `ui-button--loader-${props.loader}`,
    props.icon && 'ui-button--icon',
    props.pill && 'ui-button--pill',
    props.block && 'ui-button--block',
    hasSlot('leading') && 'ui-button--has-leading',
    hasSlot('trailing') && 'ui-button--has-trailing',
    isLoading.value && 'ui-button--loading',
    props.disabled && 'ui-button--disabled',
  ),
)
const badgePart = computed(() => resolveUiPart(cx, themedUi()?.badge, 'ui-button-badge'))
const resolvedBadgePlacement = computed(() => props.badgePlacement ?? 'top-end')
// The consumer's own root class/style, mirrored onto the wrapper when it's the outer node.
const wrapperRootPart = computed(() => {
  const uiRoot = splitUiPart(themedUi()?.root)
  return {
    class: cx(uiRoot.class, attrs.class as ClassValue),
    style: [uiRoot.style, attrs.style] as StyleValue,
  }
})
const leadingPart = computed(() => resolveUiPart(cx, themedUi()?.leading, 'ui-button-leading'))
const trailingPart = computed(() => resolveUiPart(cx, themedUi()?.trailing, 'ui-button-trailing'))
const contentPart = computed(() => resolveUiPart(cx, themedUi()?.content, 'ui-button-content'))
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.label, 'ui-button-label'))

defineExpose({
  /** Root element (the button itself, even when a badge wrapper is rendered). */
  el,
  /** Whether the button is loading, from the `loading` prop or `'auto'` tracking. */
  loading: isLoading,
  /** Runs `fn` with the loading state shown until it settles. */
  run,
})
</script>
