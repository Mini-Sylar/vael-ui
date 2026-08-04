<template>
  <div
    ref="list"
    role="tablist"
    :aria-orientation="props.orientation === 'vertical' ? 'vertical' : undefined"
    :class="listPart.class"
    :style="listPart.style"
    @keydown="onKeydown"
  >
    <slot :active="active" :focused="focused" :select="select" :items="props.items" />
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import './Tabs.css'
import { computed, useTemplateRef } from 'vue'
import { useTabs } from '../../composables/useTabs'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const active = defineModel<T>('active', { required: true })

const props = withDefaults(
  defineProps<{
    items: T[]
    /** Vertical layout with ↑/↓ navigation. */
    orientation?: 'horizontal' | 'vertical'
    /** `automatic` (default): arrow keys select. `manual`: arrow keys move focus only; Enter/Space selects. */
    activation?: 'automatic' | 'manual'
    ui?: Partial<{ list: UiPartValue }>
  }>(),
  { orientation: 'horizontal', activation: 'automatic' },
)

const emit = defineEmits<{
  change: [item: T]
}>()

defineSlots<{
  /** Render `role="tab"` elements and indicator. `focused` tracks roving tabindex (diverges from `active` in `manual` mode). */
  default(props: { active: T; focused: T; select: (item: T) => void; items: T[] }): unknown
}>()

const listEl = useTemplateRef<HTMLElement>('list')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.tabs,
  () => props.ui,
)

const { select, onKeydown, focused } = useTabs<T>(active, {
  items: () => props.items,
  listEl,
  orientation: () => props.orientation,
  activation: () => props.activation,
  onChange: (item) => emit('change', item),
})

const listPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.list,
    'ui-tabs',
    props.orientation === 'vertical' && 'ui-tabs--vertical',
  ),
)

defineExpose({ listEl })
</script>
