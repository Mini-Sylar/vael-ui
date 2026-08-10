<template>
  <span
    ref="root"
    :class="rootClass"
    :style="[rootStyle, attrs.style as never]"
    :data-state="open ? 'open' : 'closed'"
  >
    <Button
      ref="mainRef"
      v-bind="mainAttrs"
      :variant="variant"
      :size="size"
      :disabled="disabled"
      :loading="loading"
      :ui="mainUi"
    >
      <slot />
    </Button>
    <Menu
      ref="menuRef"
      v-model:open="open"
      :items="items"
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      :align-offset="alignOffset"
      :close-on-esc="closeOnEsc"
      :close-on-outside="closeOnOutside"
      :before-close="beforeClose"
      :force-mount="forceMount"
      :teleport-to="teleportTo"
      :scroll-fade="scrollFade"
      :ui="{ positioner: themedUi()?.positioner, panel: themedUi()?.panel }"
      @open-change="(value, details) => emit('open-change', value, details)"
      @select="(item) => emit('select', item)"
    >
      <template #trigger>
        <Button
          ref="triggerRef"
          :variant="variant"
          :size="size"
          :disabled="disabled"
          icon
          :ui="triggerUi"
          :aria-label="resolvedTriggerLabel"
        >
          <svg
            class="ui-split-button-chevron"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Button>
      </template>
      <template v-if="$slots.item" #item="slotProps">
        <slot name="item" v-bind="slotProps" />
      </template>
    </Menu>
  </span>
</template>

<!--
  Two real <button> elements (main + chevron) in Menu's #trigger slot; Button's auto-loading
  forwards through. Attrs: class/style on wrapper, onClick/name/aria-* to main only (not chevron).
  Visual join via inner-corners zeroed + trigger's colored border-inline-start (color-mix).
-->
<script lang="ts">
import type { MenuAlign, MenuSide } from '../Menu/Menu.vue'

export type { MenuAlign as SplitButtonAlign, MenuSide as SplitButtonSide }
</script>

<script setup lang="ts" generic="T extends MenuItemData = MenuItemData">
import './SplitButton.css'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import Button from '../Button/Button.vue'
import type { ButtonSize, ButtonVariant } from '../Button/Button.vue'
import Menu from '../Menu/Menu.vue'
import type { MenuEntry, MenuItemData } from '../Menu/Menu.vue'
import type { PopoverOpenChangeDetails } from '../../composables/usePopover'
import { useUiMessages } from '../../messages'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    /** Dropdown rows — same shape as Menu.vue's `items`. */
    items: ReadonlyArray<MenuEntry<T>>
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
    /** Forwarded to the main action Button only. */
    loading?: boolean | 'auto'
    /** aria-label for the chevron button. Default: localized "More actions". */
    triggerLabel?: string
    side?: MenuSide
    align?: MenuAlign
    sideOffset?: number
    alignOffset?: number
    closeOnEsc?: boolean
    closeOnOutside?: boolean
    beforeClose?: (done: () => void) => void
    forceMount?: boolean
    teleportTo?: string | HTMLElement
    scrollFade?: boolean
    ui?: Partial<{
      root: UiPartValue
      main: UiPartValue
      trigger: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
    }>
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: 'auto',
    closeOnEsc: undefined,
    closeOnOutside: undefined,
    scrollFade: undefined,
  },
)

const emit = defineEmits<{
  'open-change': [value: boolean, details: PopoverOpenChangeDetails]
  select: [item: T]
}>()

defineSlots<{
  /** Main action button content. */
  default(): unknown
  /** Override one dropdown row's content while keeping its behavior — forwarded to Menu's own `#item`. */
  item(props: { item: T }): unknown
}>()

const attrs = useAttrs()
const mainAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const messages = useUiMessages()
const resolvedTriggerLabel = computed(() => props.triggerLabel ?? messages.value.splitButton.more)

const root = useTemplateRef<HTMLElement>('root')
const mainRef = useTemplateRef<ComponentExposed<typeof Button>>('mainRef')
const triggerRef = useTemplateRef<ComponentExposed<typeof Button>>('triggerRef')
const menuRef = useTemplateRef<ComponentExposed<typeof Menu>>('menuRef')

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.splitButton,
  () => props.ui,
)
// Theme override, then attrs win last (see Input.vue).
const rootSplit = computed(() => splitUiPart(themedUi()?.root))
const rootClass = computed(() =>
  cx('ui-split-button', rootSplit.value.class, attrs.class as string | undefined),
)
const rootStyle = computed(() => rootSplit.value.style)
const mainUi = computed(() => ({
  root: resolveUiPart(cx, themedUi()?.main, 'ui-split-button-main'),
}))
const triggerUi = computed(() => ({
  root: resolveUiPart(cx, themedUi()?.trigger, 'ui-split-button-trigger'),
}))

defineExpose({
  el: root,
  mainEl: computed(() => mainRef.value?.el ?? null),
  triggerEl: computed(() => triggerRef.value?.el ?? null),
  panelEl: computed(() => menuRef.value?.panelEl ?? null),
  positionerEl: computed(() => menuRef.value?.positionerEl ?? null),
  isClosing: computed(() => menuRef.value?.isClosing ?? false),
  open: () => {
    open.value = true
  },
  close: () => menuRef.value?.close(),
  cancelClose: () => menuRef.value?.cancelClose(),
})
</script>
