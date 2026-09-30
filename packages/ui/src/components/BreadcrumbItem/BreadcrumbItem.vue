<template>
  <li ref="root" :class="itemPart.class" :style="itemPart.style">
    <span v-if="current" aria-current="page" :class="currentPart.class" :style="currentPart.style">
      <slot />
    </span>
    <component :is="as" v-else :class="linkPart.class" :style="linkPart.style" v-bind="$attrs">
      <slot />
    </component>
  </li>
</template>

<script setup lang="ts">
import './BreadcrumbItem.css'
import '../shared/tokens.css'
import { computed, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /**
     * Root tag for the link, such as `'a'` or a router's link component. Has no effect when `current` is `true`.
     * @default 'a'
     */
    as?: string
    /**
     * Renders the last, active crumb: plain text with `aria-current="page"` instead of a link.
     * @default false
     */
    current?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ item: UiPartValue; link: UiPartValue; current: UiPartValue }>
  }>(),
  { as: 'a', current: false },
)

defineSlots<{
  /** Crumb label. */
  default(): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.breadcrumbItem,
  () => props.ui,
)
const itemPart = computed(() => resolveUiPart(cx, themedUi()?.item, 'ui-breadcrumb-item'))
const linkPart = computed(() => resolveUiPart(cx, themedUi()?.link, 'ui-breadcrumb-link'))
const currentPart = computed(() => resolveUiPart(cx, themedUi()?.current, 'ui-breadcrumb-current'))

defineExpose({
  /** Root element. */
  el: root,
})
</script>
