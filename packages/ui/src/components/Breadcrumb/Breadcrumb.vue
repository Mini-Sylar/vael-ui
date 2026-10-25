<template>
  <nav
    ref="root"
    :aria-label="ariaLabel"
    :class="rootPart.class"
    :style="rootPart.style"
    v-bind="attrs"
  >
    <component
      :is="crumbsTransition ? TransitionGroup : 'ol'"
      v-scroll-mask="wrap ? false : 'x'"
      :class="listPart.class"
      :style="listPart.style"
      v-bind="crumbsTransition"
    >
      <template v-if="items">
        <template v-for="(item, index) in items" :key="crumbKey(item, index)">
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
                :class="iconPart.class"
                :style="iconPart.style"
              />
              {{ item.label }}
            </slot>
          </BreadcrumbItem>
          <BreadcrumbSeparator v-if="index < items.length - 1" />
        </template>
      </template>
      <slot v-else />
    </component>
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
import '../../motion/timing.css'
import { TransitionGroup, computed, useAttrs, useTemplateRef } from 'vue'
import BreadcrumbItem from '../BreadcrumbItem/BreadcrumbItem.vue'
import BreadcrumbSeparator from '../BreadcrumbSeparator/BreadcrumbSeparator.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import { useComponentList } from '../../motion/useMotion'
import { useMotionStyle } from '../../motion/context'
import type { BreadcrumbMotion } from '../../motion/types'
import { useMessages, breadcrumbMessages } from '../../messages'
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
    /** How it moves: its appearance, crumb by crumb (`{ initial: { item: { opacity: 0, x: -4 } }, stagger: 0.03 }`). Crumbs a new path adds or removes come and go the same way. `false` turns its own animation off. */
    motion?: BreadcrumbMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      list: UiPartValue
      /** The icon before a crumb's label, when you pass `items`. */
      icon: UiPartValue
    }>
  }>(),
  {
    wrap: false,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

defineSlots<{
  /** `BreadcrumbItem` and `BreadcrumbSeparator` children that you interleave. Has no effect when you pass `items`. */
  default(): unknown
  /** Custom label content for each crumb when you pass `items`. Falls back to plain text. */
  item(props: { item: T; index: number }): unknown
}>()

const messages = useMessages({ breadcrumb: breadcrumbMessages })
const ariaLabel = computed(() => props.ariaLabel ?? messages.value.breadcrumb.label)

const root = useTemplateRef<HTMLElement>('root')
// A crumb by its link, or its label: a new path adds and removes crumbs instead of relabelling them.
function crumbKey(item: T, index: number): string {
  const href = item.attrs?.href ?? item.attrs?.to
  return href !== undefined ? String(href) : `${item.label}:${index}`
}
// Yours (an object, or a shared style): crumbs come and go on the motion system.
const style = useMotionStyle()
const crumbsMotion =
  typeof props.motion === 'object' || style?.value?.breadcrumb || style?.value?.list
    ? useComponentList(() => props.motion, {
        key: 'breadcrumb',
        part: 'item',
        name: 'Breadcrumb',
        look: { opacity: 0, x: -4 },
      })
    : undefined
const crumbsTransition = computed(() =>
  crumbsMotion && props.motion !== false ? { tag: 'ol', ...crumbsMotion.transition } : undefined,
)
const parts = useStateMotion({
  key: 'breadcrumb',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  selectors: { root: '.ui-breadcrumb', item: '.ui-breadcrumb-item' },
  states: () => ({}),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.breadcrumb,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-breadcrumb'))
const iconPart = computed(() => resolveUiPart(cx, themedUi()?.icon, 'ui-breadcrumb-item-icon'))
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
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
