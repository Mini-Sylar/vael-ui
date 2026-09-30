<template>
  <span ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="attrs">
    <span class="ui-avatar-frame">
      <span
        :class="fallbackPart.class"
        :style="[{ display: showImage ? 'none' : undefined }, fallbackPart.style]"
      >
        <slot>{{ initials }}</slot>
      </span>
      <img
        v-if="src"
        ref="imgEl"
        :src="src"
        :alt="alt ?? name ?? ''"
        :class="imagePart.class"
        :style="[{ opacity: showImage ? 1 : 0 }, imagePart.style]"
        @load="onLoad"
        @error="onError"
      />
    </span>
    <span
      v-if="$slots.badge"
      :class="badgePart.class"
      :style="badgePart.style"
      :data-placement="badgePlacement"
    >
      <slot name="badge" />
    </span>
  </span>
</template>

<!-- Two-layer crossfade (fallback + img overlay); frame wrapper (overflow hidden) separate from root for badge edge overlap. The fallback is display:none once showImage is true, not just covered by the img's own opacity - an img with transparent regions (a PNG logo) would otherwise composite against the fallback still sitting fully visible underneath it, permanently bleeding its background color/initials through every transparent pixel, not just during the load flash. -->
<script setup lang="ts">
import './Avatar.css'
import '../shared/tokens.css'
import { computed, onMounted, ref, useAttrs, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Image URL. Falls back to the default slot or initials until it loads, or if it fails. */
    src?: string
    /** Image alt text; defaults to `name`. */
    alt?: string
    /** Person's name, used for the fallback initials and as the default `alt`. */
    name?: string
    /** Avatar size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Round or rounded-square frame. @default 'circle' */
    shape?: 'circle' | 'square'
    /** Which corner the `#badge` slot sits on. @default 'bottom-end' */
    badgePlacement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      image: UiPartValue
      fallback: UiPartValue
      badge: UiPartValue
    }>
  }>(),
  { size: 'md', shape: 'circle', badgePlacement: 'bottom-end' },
)

const emit = defineEmits<{
  /** Fires when the image loads. */
  load: [event: Event]
  /** Fires when the image fails to load. */
  error: [event: Event]
}>()

defineSlots<{
  /** Fallback content shown while there's no loaded image; defaults to the initials of `name`. */
  default(): unknown
  /** Overlay on the avatar's edge, e.g. a `Badge`; position it with `badgePlacement`. */
  badge(): unknown
}>()

const initials = computed(() => {
  if (!props.name) return ''
  const parts = props.name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
})

const loaded = ref(false)
const errored = ref(false)
const showImage = computed(() => !!props.src && loaded.value && !errored.value)

// Reset state on src change (fresh load attempt)
watch(
  () => props.src,
  () => {
    loaded.value = false
    errored.value = false
  },
)

function onLoad(event: Event) {
  loaded.value = true
  emit('load', event)
}
function onError(event: Event) {
  errored.value = true
  emit('error', event)
}

const imgEl = useTemplateRef<HTMLImageElement>('imgEl')
// Cached images fire load synchronously; check .complete + naturalWidth on mount
onMounted(() => {
  if (imgEl.value?.complete && imgEl.value.naturalWidth > 0) loaded.value = true
})

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.avatar,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-avatar',
    `ui-avatar--${props.size}`,
    `ui-avatar--${props.shape}`,
  ),
)
const imagePart = computed(() => resolveUiPart(cx, themedUi()?.image, 'ui-avatar-image'))
const fallbackPart = computed(() => resolveUiPart(cx, themedUi()?.fallback, 'ui-avatar-fallback'))
const badgePart = computed(() => resolveUiPart(cx, themedUi()?.badge, 'ui-avatar-badge'))

defineExpose({
  /** Root element. */
  el: root,
  /** Image element (null without `src`). */
  imgEl,
})
</script>
