<template>
  <nav
    ref="list"
    v-bind="attrs"
    :class="rootPart.class"
    :style="rootPart.style"
    @keydown="onKeydown"
  >
    <div
      v-if="hasActiveMatch"
      class="ui-menu-list-indicator"
      :style="indicatorStyle"
      aria-hidden="true"
    />
    <template v-for="(row, i) in flatRows" :key="row.key">
      <div
        v-if="row.kind === 'separator'"
        role="separator"
        :class="separatorPart.class"
        :style="separatorPart.style"
      />
      <!-- Group labels lack role="menuitem", so useMenu skips them automatically. -->
      <div
        v-else-if="row.kind === 'group'"
        :class="rowClass(row, 'group')"
        :style="[indentStyle(row.depth), itemPart.style]"
      >
        <slot name="item" :item="row.entry as T">
          <span v-if="row.entry.icon" class="ui-menu-list-item-icon">
            <component :is="row.entry.icon" />
          </span>
          <span class="ui-menu-list-item-label">{{ row.entry.label }}</span>
        </slot>
      </div>
      <component
        :is="tagOf(row.entry)"
        v-else
        :type="tagOf(row.entry) === 'button' ? 'button' : undefined"
        role="menuitem"
        :class="rowClass(row, 'item')"
        :disabled="tagOf(row.entry) === 'button' ? row.entry.disabled : undefined"
        :aria-disabled="tagOf(row.entry) !== 'button' ? row.entry.disabled || undefined : undefined"
        :data-menu-index="i"
        :aria-current="isActive(row.entry) ? 'page' : undefined"
        :style="[indentStyle(row.depth), itemPart.style]"
        v-bind="row.entry.attrs"
      >
        <slot name="item" :item="row.entry as T">
          <span v-if="row.entry.icon" class="ui-menu-list-item-icon">
            <component :is="row.entry.icon" />
          </span>
          <span class="ui-menu-list-item-label">{{ row.entry.label }}</span>
          <span v-if="row.entry.shortcut" class="ui-menu-list-item-shortcut">
            {{ row.entry.shortcut }}
          </span>
        </slot>
      </component>
    </template>
  </nav>
</template>

<script lang="ts">
import type { MenuEntry, MenuItemData, MenuSeparator } from '../Menu/Menu.vue'
import type { UiPartValue } from '../../classes'

export type { MenuEntry, MenuItemData, MenuSeparator }

// MenuItemData's own `as`/`attrs` (see Menu.vue) already cover link rows —
// this alias just keeps the more specific import name available.
export type MenuListItemData = MenuItemData

export interface MenuListProps<T extends MenuItemData = MenuItemData> {
  /** Same shape as `Menu`'s own `items` — a `MenuList` and a `Menu` can share one array. */
  items?: ReadonlyArray<MenuEntry<T>>
  /**
   * The current page's `value` — renders `aria-current="page"` on the
   * matching row.
   */
  active?: string | number | null
  ui?: Partial<{ root: UiPartValue; item: UiPartValue; separator: UiPartValue }>
}
</script>

<!--
  Reuses useMenu for keyboard/roving; ARIA compromise: role="menuitem" technically
  wrong in nav but necessary for useMenu's selector (reimplementing would be worse).
  Nested items are inert group labels (pair with Collapsible for collapsible groups).
-->
<script setup lang="ts" generic="T extends MenuItemData = MenuItemData">
import './MenuList.css'
import '../shared/tokens.css'
import { computed, onMounted, useAttrs, useTemplateRef } from 'vue'
import { useMenu } from '../../composables/useMenu'
import { useTabIndicator } from '../../composables/useTabIndicator'
import { useClassMerge, resolveUiPart, splitUiPart } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = defineProps<MenuListProps<T>>()

const emit = defineEmits<{
  /** Fires on click, or Enter/Space when the row has roving focus. */
  select: [item: T]
}>()

defineSlots<{
  /** Override one row's content while keeping its behavior. Fires for selectable rows and group labels. */
  item(props: { item: T }): unknown
}>()

function isSeparator(entry: MenuEntry<MenuItemData>): entry is MenuSeparator {
  return (entry as MenuSeparator).type === 'separator'
}

interface FlatRow {
  key: string
  depth: number
  kind: 'item' | 'group'
  entry: MenuItemData
}
interface FlatSeparator {
  key: string
  kind: 'separator'
}

// Row tag: 'button' by default (existing behavior, unaffected), or the
// consumer's own `as` for a real link — see MenuItemData.
function tagOf(entry: MenuItemData): string {
  return entry.as ?? 'button'
}

// Depth-first flatten: group entries become rows followed by children at depth+1 (always expanded).
// Nested entries are MenuItemData, not T — same as Menu's recursive limitation.
function flatten(
  entries: ReadonlyArray<MenuEntry<MenuItemData>>,
  depth: number,
  out: Array<FlatRow | FlatSeparator>,
) {
  for (const entry of entries) {
    if (isSeparator(entry)) {
      out.push({ key: `s${out.length}`, kind: 'separator' })
      continue
    }
    if (entry.items && entry.items.length > 0) {
      out.push({ key: `g${out.length}`, depth, kind: 'group', entry })
      flatten(entry.items, depth + 1, out)
    } else {
      out.push({ key: `i${out.length}`, depth, kind: 'item', entry })
    }
  }
}

const flatRows = computed<Array<FlatRow | FlatSeparator>>(() => {
  const out: Array<FlatRow | FlatSeparator> = []
  flatten(props.items ?? [], 0, out)
  return out
})

function isActive(entry: MenuItemData): boolean {
  return props.active != null && entry.value != null && entry.value === props.active
}

// CSS custom property (not inline padding) keeps indent size easy to override.
function indentStyle(depth: number) {
  return depth > 0 ? { '--ui-menu-list-depth': depth } : undefined
}

const list = useTemplateRef<HTMLElement>('list')

// Sliding indicator (Tabs pattern) for nav-item transitions; guards against non-matching active (page outside this list).
const hasActiveMatch = computed(() =>
  flatRows.value.some((row) => row.kind === 'item' && isActive(row.entry)),
)
const { style: indicatorStyle } = useTabIndicator(
  computed(() => props.active),
  { listEl: list, orientation: 'vertical', selector: '[aria-current="page"]' },
)

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.menuList,
  () => props.ui,
)

const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-menu-list'))
const separatorPart = computed(() =>
  resolveUiPart(cx, themedUi()?.separator, 'ui-menu-list-separator'),
)
const itemPart = computed(() => splitUiPart(themedUi()?.item))
function rowClass(row: FlatRow, kind: 'item' | 'group'): string {
  return cx(
    'ui-menu-list-item',
    kind === 'group' && 'ui-menu-list-item--group',
    row.entry.danger && 'ui-menu-list-item--danger',
    itemPart.value.class,
  )
}

const { onKeydown, initRoving } = useMenu({
  listEl: list,
  onSelect: (itemEl) => {
    const indexAttr = itemEl.dataset.menuIndex
    if (indexAttr === undefined) return
    const row = flatRows.value[Number(indexAttr)]
    if (!row || row.kind !== 'item') return
    emit('select', row.entry as T)
    row.entry.onSelect?.()
  },
  // No onExpand/onCollapse: MenuList never renders an `aria-haspopup="menu"`
  // row (nested `.items` entries become inert group labels, not submenu
  // triggers), so ArrowRight/ArrowLeft are no-ops here, same as a bare
  // top-level useMenu with neither wired.
})

// Initialize roving focus without stealing focus (unlike Menu, always on-screen).
onMounted(() => initRoving())

defineExpose({ el: list })
</script>
