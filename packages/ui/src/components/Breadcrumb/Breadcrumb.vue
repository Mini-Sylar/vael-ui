<template>
  <nav
    ref="root"
    :aria-label="ariaLabel"
    :class="rootPart.class"
    :style="rootPart.style"
    v-bind="attrs"
  >
    <ol v-scroll-mask="wrap ? false : 'x'" :class="listPart.class" :style="listPart.style">
      <template v-if="items">
        <template v-for="(item, index) in items" :key="index">
          <BreadcrumbItem
            :as="item.as"
            :current="item.current ?? index === items.length - 1"
            v-bind="item.attrs"
          >
            <slot name="item" :item="item" :index="index">
              <component
                :is="item.icon"
                v-if="item.icon"
                aria-hidden="true"
                class="ui-breadcrumb-item-icon"
              />
              {{ item.label }}
            </slot>
          </BreadcrumbItem>
          <BreadcrumbSeparator v-if="index < items.length - 1" />
        </template>
      </template>
      <slot v-else />
    </ol>
  </nav>
</template>

<script lang="ts">
import type { Component } from 'vue'

export interface BreadcrumbItemData {
  label: string
  icon?: Component
  /** Link tag for this crumb, such as `'a'` (default) or a registered router-link component name. Has no effect when `current` is `true`. */
  as?: string
  /** Defaults to `true` for the last item, `false` otherwise. */
  current?: boolean
  /** Extra attributes for the rendered `BreadcrumbItem`, such as `{ href: '/docs' }` for `<a>` or `{ to: '/docs' }` for a router link. */
  attrs?: Record<string, unknown>
}
</script>

<script setup lang="ts" generic="T extends BreadcrumbItemData = BreadcrumbItemData">
import './Breadcrumb.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import BreadcrumbItem from '../BreadcrumbItem/BreadcrumbItem.vue'
import BreadcrumbSeparator from '../BreadcrumbSeparator/BreadcrumbSeparator.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'
import { vScrollMask } from '../../directives/vScrollMask'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Crumbs to render, with separators added between them. Omit to compose children in the default slot. */
    items?: ReadonlyArray<T>
    /** Overrides the default localized "Breadcrumb" nav landmark label. */
    ariaLabel?: string
    /**
     * Wraps crumbs onto multiple lines instead of scrolling one line horizontally on overflow.
     * @default false
     */
    wrap?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; list: UiPartValue }>
  }>(),
  { wrap: false },
)

defineSlots<{
  /** `BreadcrumbItem` and `BreadcrumbSeparator` children that you interleave. Has no effect when you pass `items`. */
  default(): unknown
  /** Custom label content for each crumb when you pass `items`. Falls back to plain text. */
  item(props: { item: T; index: number }): unknown
}>()

const messages = useUiMessages()
const ariaLabel = computed(() => props.ariaLabel ?? messages.value.breadcrumb.label)

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.breadcrumb,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-breadcrumb'))
const listPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.list,
    'ui-breadcrumb-list',
    props.wrap ? 'ui-breadcrumb-list--wrap' : 'ui-breadcrumb-list--scroll',
  ),
)

defineExpose({
  /** Root element. */
  el: root,
})
</script>
