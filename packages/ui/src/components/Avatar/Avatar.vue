<template>
  <span ref="root" :class="rootPart.class" :style="rootPart.style">
    <span class="ui-avatar-frame">
      <span :class="fallbackPart.class" :style="fallbackPart.style">
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

<!-- Two-layer crossfade (fallback + img overlay); frame wrapper (overflow hidden) separate from root for badge edge overlap -->
<script setup lang="ts">
import './Avatar.css'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    name?: string
    size?: 'sm' | 'md' | 'lg'
    shape?: 'circle' | 'square'
    badgePlacement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
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
  load: [event: Event]
  error: [event: Event]
}>()

defineSlots<{
  default(): unknown
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

defineExpose({ el: root, imgEl })
</script>
