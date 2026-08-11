<template>
  <nav
    ref="root"
    v-bind="attrs"
    :aria-label="ariaLabel"
    :class="rootPart.class"
    :style="rootPart.style"
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
  /** Root tag for this crumb's link, e.g. `'a'` (default) or a registered router-link component name. Ignored when `current` is true. */
  as?: string
  /** Defaults to `true` for the last item, `false` otherwise. */
  current?: boolean
  /** Extra attrs forwarded straight to the rendered `BreadcrumbItem` — the destination prop itself depends on `as` (`{ href: '/docs' }` for a plain `<a>`, `{ to: '/docs' }` for a router link), so it lives here rather than as a dedicated field that would only fit one of them. */
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
    /** Data-driven alternative to composing `BreadcrumbItem`/`BreadcrumbSeparator` yourself in the default slot. Omit to use the default slot instead — the two are mutually exclusive per instance. */
    items?: ReadonlyArray<T>
    /** Overrides the default localized "Breadcrumb" nav landmark label. */
    ariaLabel?: string
    /** `false` (default): a single line that scrolls horizontally once it overflows, edge-faded like Dialog/Select. `true`: wraps onto multiple lines instead. */
    wrap?: boolean
    ui?: Partial<{ root: UiPartValue; list: UiPartValue }>
  }>(),
  { wrap: false },
)

defineSlots<{
  /** `BreadcrumbItem` and `BreadcrumbSeparator` children, interleaved by the caller. Ignored when `items` is set. */
  default(): unknown
  /** Overrides one crumb's label content when using `items`. Falls back to plain text. */
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

defineExpose({ el: root })
</script>
