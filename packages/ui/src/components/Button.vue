<template>
  <span v-if="$slots.badge" class="ui-button-badge-wrapper">
    <component
      :is="as"
      ref="root"
      v-bind="restAttrs"
      :type="isButtonTag ? type : undefined"
      :class="rootPart.class"
      :disabled="isButtonTag ? disabled : undefined"
      :aria-disabled="ariaDisabled"
      :aria-busy="isLoading || undefined"
      :tabindex="rootTabindex"
      :style="rootPart.style"
      @click="onRootClick"
    >
      <span class="ui-button-loader" aria-hidden="true">
        <slot name="loader" :loading="isLoading" :el="el">
          <span class="ui-loader" />
        </slot>
      </span>
      <span v-if="$slots.leading" class="ui-button-leading" aria-hidden="true">
        <slot name="leading" />
      </span>
      <span class="ui-button-content">
        <span class="ui-button-label"><slot :loading="isLoading" :el="el" :run="run" /></span>
      </span>
      <span v-if="$slots.trailing" class="ui-button-trailing" aria-hidden="true">
        <slot name="trailing" />
      </span>
    </component>
    <span :class="badgePart.class" :style="badgePart.style" :data-placement="badgePlacement">
      <slot name="badge" />
    </span>
  </span>
  <component
    :is="as"
    v-else
    ref="root"
    v-bind="restAttrs"
    :type="isButtonTag ? type : undefined"
    :class="rootPart.class"
    :disabled="isButtonTag ? disabled : undefined"
    :aria-disabled="ariaDisabled"
    :aria-busy="isLoading || undefined"
    :tabindex="rootTabindex"
    :style="rootPart.style"
    @click="onRootClick"
  >
    <span class="ui-button-loader" aria-hidden="true">
      <slot name="loader" :loading="isLoading" :el="el">
        <span class="ui-loader" />
      </slot>
    </span>
    <span v-if="$slots.leading" class="ui-button-leading" aria-hidden="true">
      <slot name="leading" />
    </span>
    <span class="ui-button-content">
      <span class="ui-button-label"><slot :loading="isLoading" :el="el" :run="run" /></span>
    </span>
    <span v-if="$slots.trailing" class="ui-button-trailing" aria-hidden="true">
      <slot name="trailing" />
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
  Dual render paths: wrapper only with #badge (Vue scoped-style limitation — wrapper breaks :deep() for badge-less).
-->
<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue'
import { useAsyncLoading } from '../composables/useAsyncLoading'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

// Manual attrs binding intercepts onClick; rest still fall through.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** `'auto'` (default): promise-returning `@click` handlers trigger loading automatically. `true`/`false`: fully controlled. */
    loading?: boolean | 'auto'
    disabled?: boolean
    variant?: ButtonVariant
    size?: ButtonSize
    /** `overlay` (default): loader centered over fading content. `inline`: spinner slides in at start. */
    loader?: ButtonLoaderPlacement
    /** Square icon-only button; pair with an aria-label. */
    icon?: boolean
    /** Fully rounded capsule/pill shape. */
    pill?: boolean
    /** Stretch to container's full inline size. */
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    /** Root tag (e.g. `as="a"` for a link styled as button). */
    as?: string
    /** Where the `#badge` slot wrapper sits relative to the button. */
    badgePlacement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
    ui?: Partial<{ root: UiPartValue; badge: UiPartValue }>
  }>(),
  {
    loading: 'auto',
    disabled: false,
    variant: 'primary',
    size: 'md',
    loader: 'overlay',
    icon: false,
    pill: false,
    block: false,
    type: 'button',
    as: 'button',
    badgePlacement: 'top-end',
  },
)

defineSlots<{
  default(props: {
    loading: boolean
    el: HTMLElement | null
    run: <T>(fn: () => T | Promise<T>) => Promise<T>
  }): unknown
  /** Custom loader visuals (placement and crossfade are library-owned). */
  loader(props: { loading: boolean; el: HTMLElement | null }): unknown
  /** Icon before the label (1em box, optically aligned). */
  leading(): unknown
  /** Icon after the label (1em box, optically aligned). */
  trailing(): unknown
  /** Badge in library-positioned wrapper. */
  badge(): unknown
}>()

const slots = useSlots()
const attrs = useAttrs()

const { loading: autoLoading, run } = useAsyncLoading()
const isLoading = computed(() => (props.loading === 'auto' ? autoLoading.value : props.loading))

const isButtonTag = computed(() => props.as === 'button')
// Non-button tags use aria-disabled (no native disabled attribute).
const ariaDisabled = computed<true | undefined>(() => {
  if (isButtonTag.value && props.disabled) return undefined
  return isLoading.value || props.disabled ? true : undefined
})
const rootTabindex = computed(() => (!isButtonTag.value && props.disabled ? -1 : undefined))

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
  if (!raw) return
  for (const handler of Array.isArray(raw) ? raw : [raw]) {
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
    !!slots.leading && 'ui-button--has-leading',
    !!slots.trailing && 'ui-button--has-trailing',
    isLoading.value && 'ui-button--loading',
    props.disabled && 'ui-button--disabled',
  ),
)
const badgePart = computed(() => resolveUiPart(cx, themedUi()?.badge, 'ui-button-badge'))

defineExpose({ el, loading: isLoading, run })
</script>
