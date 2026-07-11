<template>
  <div
    ref="list"
    role="toolbar"
    :aria-orientation="orientation === 'vertical' ? 'vertical' : undefined"
    :class="rootPart.class"
    :style="rootPart.style"
    @keydown="onKeydown"
  >
    <div :class="groupPart.class" :style="groupPart.style">
      <slot name="start" />
      <slot />
    </div>
    <div :class="groupPart.class" :style="groupPart.style">
      <slot name="center" />
    </div>
    <div :class="groupPart.class" :style="groupPart.style">
      <slot name="end" />
      <Menu v-if="hasOverflow" :items="overflowItems">
        <template #trigger>
          <button
            type="button"
            data-toolbar-ellipsis
            :class="overflowTriggerPart.class"
            :style="overflowTriggerPart.style"
            :aria-label="overflowLabel"
          >
            &hellip;
          </button>
        </template>
      </Menu>
    </div>
  </div>
</template>

<!-- role="toolbar"; heterogeneous slot content with roving tabindex; three groups (start/center/end) handle overflow ellipsis placement -->
<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useToolbar } from '../composables/useToolbar'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'
import Menu from './Menu.vue'
import type { MenuItemData } from './Menu.vue'

const props = withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical'
    overflowLabel?: string
    ui?: Partial<{ root: UiPartValue; group: UiPartValue; overflowTrigger: UiPartValue }>
  }>(),
  { orientation: 'horizontal', overflowLabel: 'More' },
)

const list = useTemplateRef<HTMLElement>('list')
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

// Menu items built from hidden children's labels; .click()s real element so handlers run as-is (can't re-render arbitrary slotted markup)
const overflowItems = computed<MenuItemData[]>(() =>
  collapsedItems.value.map((el) => ({
    label: el.getAttribute('aria-label') || el.textContent?.trim() || '',
    disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
    onSelect: () => el.click(),
  })),
)

defineExpose({ el: list })
</script>
