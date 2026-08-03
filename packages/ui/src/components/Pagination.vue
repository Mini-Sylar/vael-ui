<template>
  <nav :class="rootPart.class" :style="rootPart.style" aria-label="Pagination">
    <ul :class="listPart.class" :style="listPart.style">
      <li>
        <Button
          class="ui-pagination-nav-button"
          icon
          size="sm"
          variant="ghost"
          type="button"
          aria-label="First page"
          :disabled="isFirstPage"
          @click="goToPage(1)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M11 4l-4 4 4 4M6 4l-4 4 4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Button>
      </li>
      <li>
        <Button
          class="ui-pagination-nav-button"
          icon
          size="sm"
          variant="ghost"
          type="button"
          aria-label="Previous page"
          :disabled="isFirstPage"
          @click="goToPage(page - 1)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M10 4l-4 4 4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Button>
      </li>

      <li v-for="item in pageItems" :key="item">
        <span v-if="typeof item !== 'number'" class="ui-pagination-ellipsis" aria-hidden="true"
          >…</span
        >
        <Button
          v-else
          class="ui-pagination-page-button"
          icon
          size="sm"
          type="button"
          :variant="item === page ? 'primary' : 'ghost'"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="`Page ${item}`"
          @click="goToPage(item)"
        >
          {{ item }}
        </Button>
      </li>

      <li>
        <Button
          class="ui-pagination-nav-button"
          icon
          size="sm"
          variant="ghost"
          type="button"
          aria-label="Next page"
          :disabled="isLastPage"
          @click="goToPage(page + 1)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Button>
      </li>
      <li>
        <Button
          class="ui-pagination-nav-button"
          icon
          size="sm"
          variant="ghost"
          type="button"
          aria-label="Last page"
          :disabled="isLastPage"
          @click="goToPage(totalPages)"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M5 4l4 4-4 4M10 4l4 4-4 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Button>
      </li>
    </ul>

    <Select
      v-if="pageSizeOptions && pageSizeOptions.length > 0"
      class="ui-pagination-size-select"
      size="sm"
      :items="pageSizeItems"
      :model-value="pageSize"
      @update:model-value="onPageSizeChange"
    />
  </nav>
</template>

<!-- Uses MUI/PrimeVue sibling count algorithm for pagination layout. -->
<script setup lang="ts">
import { computed } from 'vue'
import Button from './Button/Button.vue'
import Select from './Select.vue'
import type { SelectItemData } from './Select.vue'
import { useClassMerge, resolveUiPart } from '../classes'
import type { UiPartValue } from '../classes'
import { useThemedUi } from '../theme'

const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })

const props = withDefaults(
  defineProps<{
    /** Total item count across all pages (not current page's row count). */
    total: number
    /** Page-size `<Select>` options. Omitted hides the dropdown. */
    pageSizeOptions?: number[]
    /** Page-number buttons to show on each side of current page before ellipsis. */
    siblingCount?: number
    ui?: Partial<{
      root: UiPartValue
      list: UiPartValue
      button: UiPartValue
      ellipsis: UiPartValue
      sizeSelect: UiPartValue
    }>
  }>(),
  { siblingCount: 1 },
)

const totalPages = computed(() => {
  if (pageSize.value <= 0) return 1
  return Math.max(1, Math.ceil(props.total / pageSize.value))
})
const isFirstPage = computed(() => page.value <= 1)
const isLastPage = computed(() => page.value >= totalPages.value)

function goToPage(target: number) {
  const clamped = Math.min(Math.max(Math.trunc(target), 1), totalPages.value)
  if (clamped !== page.value) page.value = clamped
}

// Page-size change makes old page invalid (page 8 of 20 rows/page may not exist at 50 rows/page); reset to 1.
function onPageSizeChange(value: string | number | (string | number)[] | null) {
  if (typeof value !== 'number') return
  pageSize.value = value
  page.value = 1
}

const pageSizeItems = computed<SelectItemData[]>(
  () => props.pageSizeOptions?.map((size) => ({ value: size, label: String(size) })) ?? [],
)

type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

const pageItems = computed<PageItem[]>(() => {
  const total = totalPages.value
  const current = Math.min(Math.max(page.value, 1), total)
  const sibling = Math.max(props.siblingCount, 0)
  const totalVisibleSlots = sibling * 2 + 5 // first + last + current + 2 ellipses worth of room

  if (total <= totalVisibleSlots) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const leftSibling = Math.max(current - sibling, 1)
  const rightSibling = Math.min(current + sibling, total)
  const showLeftEllipsis = leftSibling > 2
  const showRightEllipsis = rightSibling < total - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + sibling * 2
    const left = Array.from({ length: leftCount }, (_, i) => i + 1)
    return [...left, 'ellipsis-end', total]
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + sibling * 2
    const right = Array.from({ length: rightCount }, (_, i) => total - rightCount + i + 1)
    return [1, 'ellipsis-start', ...right]
  }
  const middle = Array.from({ length: rightSibling - leftSibling + 1 }, (_, i) => leftSibling + i)
  return [1, 'ellipsis-start', ...middle, 'ellipsis-end', total]
})

const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.pagination,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-pagination'))
const listPart = computed(() => resolveUiPart(cx, themedUi()?.list, 'ui-pagination-list'))
</script>
