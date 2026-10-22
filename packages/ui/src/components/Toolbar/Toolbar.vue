<template>
  <div
    ref="list"
    role="toolbar"
    :aria-orientation="orientation === 'vertical' ? 'vertical' : undefined"
    :class="rootPart.class"
    :style="rootPart.style"
    @keydown="onKeydown"
    v-bind="attrs"
  >
    <div
      ref="hoverEl"
      class="ui-indicator ui-toolbar-hover"
      :class="orientation !== 'vertical' && 'ui-indicator--inline'"
      :style="hoverStyle"
      aria-hidden="true"
    />
    <div v-if="slots.start || slots.default" :class="groupPart.class" :style="groupPart.style">
      <slot name="start" />
      <slot />
    </div>
    <div v-if="slots.center" :class="groupPart.class" :style="groupPart.style">
      <slot name="center" />
    </div>
    <div v-if="slots.end || hasOverflow" :class="groupPart.class" :style="groupPart.style">
      <slot name="end" />
      <Menu
        v-if="hasOverflow"
        :items="overflowItems"
        @update:open="(open) => open && buildOverflowItems()"
      >
        <template #trigger>
          <button
            type="button"
            data-toolbar-ellipsis
            :class="overflowTriggerPart.class"
            :style="overflowTriggerPart.style"
            :aria-label="overflowLabel"
          >
            <span class="ui-toolbar-overflow-label">&hellip;</span>
          </button>
        </template>
      </Menu>
    </div>
  </div>
</template>

<!-- role="toolbar"; heterogeneous slot content with roving tabindex; three groups (start/center/end) handle overflow ellipsis placement -->
<script setup lang="ts">
import './Toolbar.css'
import '../shared/indicator.css'
import { useHoverIndicator } from '../../composables/useHoverIndicator'
import '../shared/tokens.css'
import { computed, shallowRef, useAttrs, useSlots, useTemplateRef, watch } from 'vue'
import { useToolbar } from '../../composables/useToolbar'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import { useIndicatorMotion } from '../../composables/useIndicatorMotion'
import type { ToolbarMotion } from '../../motion/types'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
import Menu from '../Menu/Menu.vue'
import type { MenuItemData } from '../Menu/Menu.vue'

const props = withDefaults(
  defineProps<{
    /** Lays the controls out in a row or a column; arrow keys follow the axis. @default 'horizontal' */
    orientation?: 'horizontal' | 'vertical'
    /** Accessible label for the overflow (`…`) menu button. @default 'More' */
    overflowLabel?: string
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; group: UiPartValue; overflowTrigger: UiPartValue }>
    /** How it moves: its appearance, control by control (`{ initial: { item: { opacity: 0, y: 4 } }, stagger: 0.03 }`), over `root`, `item` (each control in a group) and the hover `indicator`. `spring` retimes the indicator; `move` hands its moves to your own animation. `false` turns its own animation off. */
    motion?: ToolbarMotion
  }>(),
  // `motion`: absent must read as unset, not `false` (Vue's boolean casting would turn it off).
  { orientation: 'horizontal', overflowLabel: 'More', motion: undefined },
)

defineSlots<{
  /** Controls at the start of the toolbar. Mark a child `data-toolbar-overflow` to let it collapse into the `…` menu. */
  start(): unknown
  /** Controls in the start group, after `#start`. */
  default(): unknown
  /** Controls in the center group. */
  center(): unknown
  /** Controls at the end of the toolbar, before the `…` overflow menu. */
  end(): unknown
}>()

const slots = useSlots()
const list = useTemplateRef<HTMLElement>('list')
// The hover and keyboard highlight slides between the toolbar's ghost and text buttons.
const hoverEl = useTemplateRef<HTMLElement>('hoverEl')
const indicatorMotion = useIndicatorMotion({
  name: 'Toolbar',
  motion: () => props.motion,
  indicator: () => hoverEl.value,
  parts: () => parts(),
})
const { style: hoverStyle } = useHoverIndicator(list, {
  itemSelector: '.ui-button:is(.ui-button--ghost, .ui-button--text)',
  scope: '[role="toolbar"]',
  orientation: () => (props.orientation === 'vertical' ? 'vertical' : 'horizontal'),
  indicatorEl: hoverEl,
  indicator: indicatorMotion.spring,
  motion: () => (indicatorMotion.handsOff() || props.motion === false ? false : undefined),
})
const parts = useStateMotion({
  key: 'toolbar',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => list.value,
  selectors: { root: '.ui-toolbar', item: '.ui-toolbar-group > *', indicator: '.ui-toolbar-hover' },
  states: () => ({}),
})
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.toolbar,
  () => props.ui,
)

const { onKeydown, collapsedItems, hasOverflow, hasOverflowCandidates } = useToolbar(list, {
  orientation: () => props.orientation,
})

const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-toolbar',
    props.orientation === 'vertical' && 'ui-toolbar--vertical',
    hasOverflowCandidates.value && 'ui-toolbar--overflow',
  ),
)
const groupPart = computed(() => resolveUiPart(cx, themedUi()?.group, 'ui-toolbar-group'))
const overflowTriggerPart = computed(() =>
  resolveUiPart(cx, themedUi()?.overflowTrigger, 'ui-toolbar-overflow-trigger'),
)

// Menu items built from hidden children's labels; .click()s real element so handlers run as-is (can't re-render arbitrary slotted markup).
// A toggle (aria-pressed) becomes a checkbox row. The DOM isn't reactive, so the rows are rebuilt
// whenever the hidden set changes and each time the menu opens, to show each toggle's current state.
const overflowItems = shallowRef<MenuItemData[]>([])
function buildOverflowItems() {
  overflowItems.value = collapsedItems.value.map((el) => ({
    label: el.getAttribute('aria-label') || el.textContent?.trim() || '',
    disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
    checked: el.hasAttribute('aria-pressed')
      ? el.getAttribute('aria-pressed') === 'true'
      : undefined,
    onSelect: () => el.click(),
  }))
}
watch(collapsedItems, buildOverflowItems, { immediate: true })

defineExpose({
  /** Root element. */
  el: list,
  /** The hover and keyboard highlight, sliding between buttons. Under a ConfigProvider with `motion: false` it moves at once, for your own animation. */
  highlightEl: hoverEl,
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
