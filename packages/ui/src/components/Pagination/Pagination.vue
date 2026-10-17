<template>
  <nav
    :class="rootPart.class"
    :style="rootPart.style"
    :aria-label="messages.pagination.label"
    v-bind="attrs"
  >
    <ul ref="list" :class="listPart.class" :style="listPart.style">
      <!-- An <li>, since a <ul> may only hold list items; role="presentation"
           keeps it out of the list's item count. -->
      <li
        ref="indicatorEl"
        class="ui-pagination-indicator"
        role="presentation"
        aria-hidden="true"
        :style="indicator.style.value"
      />
      <li
        ref="labelsEl"
        class="ui-pagination-indicator-labels"
        role="presentation"
        aria-hidden="true"
        inert
        :style="labelsStyle"
      >
        <span v-for="n in 2" :key="`start-${n}`" class="ui-pagination-labels-spacer">
          <Button :class="labelPart.class" icon size="sm" variant="ghost" tabindex="-1" />
        </span>
        <span v-for="item in pageItems" :key="`label-${item}`">
          <span v-if="typeof item !== 'number'" :class="labelEllipsisPart.class">…</span>
          <Button
            v-else
            :class="labelPart.class"
            :style="labelPart.style"
            icon
            size="sm"
            variant="ghost"
            tabindex="-1"
          >
            {{ item }}
          </Button>
        </span>
        <span v-for="n in 2" :key="`end-${n}`" class="ui-pagination-labels-spacer">
          <Button :class="labelPart.class" icon size="sm" variant="ghost" tabindex="-1" />
        </span>
      </li>
      <li>
        <Button
          :class="navButtonPart.class"
          :style="navButtonPart.style"
          icon
          size="sm"
          variant="ghost"
          type="button"
          :aria-label="messages.pagination.first"
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
          :class="navButtonPart.class"
          :style="navButtonPart.style"
          icon
          size="sm"
          variant="ghost"
          type="button"
          :aria-label="messages.pagination.previous"
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
        <span
          v-if="typeof item !== 'number'"
          :class="ellipsisPart.class"
          :style="ellipsisPart.style"
          aria-hidden="true"
          >…</span
        >
        <Button
          v-else
          :class="pageButtonPart(item === page).class"
          :style="pageButtonPart(item === page).style"
          icon
          size="sm"
          variant="ghost"
          type="button"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="messages.pagination.page.replace('{page}', String(item))"
          @click="goToPage(item)"
        >
          {{ item }}
        </Button>
      </li>

      <li>
        <Button
          :class="navButtonPart.class"
          :style="navButtonPart.style"
          icon
          size="sm"
          variant="ghost"
          type="button"
          :aria-label="messages.pagination.next"
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
          :class="navButtonPart.class"
          :style="navButtonPart.style"
          icon
          size="sm"
          variant="ghost"
          type="button"
          :aria-label="messages.pagination.last"
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
      :class="sizeSelectPart.class"
      :style="sizeSelectPart.style"
      size="sm"
      :aria-label="messages.pagination.pageSize"
      :items="pageSizeItems"
      :model-value="pageSize"
      @update:model-value="onPageSizeChange"
    />
  </nav>
</template>

<!-- Uses MUI/PrimeVue sibling count algorithm for pagination layout. -->
<script setup lang="ts">
import './Pagination.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, useAttrs, useTemplateRef } from 'vue'
import Button from '../Button/Button.vue'
import Select from '../Select/Select.vue'
import type { SelectItemData } from '../Select/Select.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'
import { useTabIndicator } from '../../composables/useTabIndicator'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const messages = useUiMessages()

/** Current page, 1-based. @default 1 */
const page = defineModel<number>('page', { default: 1 })
/** Rows per page. Picking a size from the dropdown resets `page` to 1. @default 10 */
const pageSize = defineModel<number>('pageSize', { default: 10 })

const listEl = useTemplateRef<HTMLElement>('list')
const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
const labelsEl = useTemplateRef<HTMLElement>('labelsEl')
const indicator = useTabIndicator(page, { listEl, selector: '[aria-current="page"]' })
// The page numbers again in the contrast color, clipped to the indicator, so the
// color travels with it instead of flipping when the page changes.
const labelsStyle = computed(() => {
  const { insetInlineStart, inlineSize, transitionDuration } = indicator.style.value
  const left = parseFloat(insetInlineStart ?? '0') || 0
  const right = left + (parseFloat(inlineSize ?? '0') || 0)
  return {
    clipPath: `inset(0 calc(100% - ${right}px) 0 ${left}px round calc(var(--ui-radius) - 4px))`,
    transitionDuration: transitionDuration?.startsWith('0ms') ? '0ms' : undefined,
  }
})

const rawProps = withDefaults(
  defineProps<{
    /** Total item count across all pages, not the current page's row count. */
    total: number
    /** Page-size `<Select>` options. Omit it to hide the dropdown. */
    pageSizeOptions?: number[]
    /** Page-number buttons to show on each side of the current page before an ellipsis. @default 1 */
    siblingCount?: number
    /** `false` skips the indicator's built-in sliding; animate the exposed `indicatorEl` and `labelsEl` yourself. @default true */
    motionCss?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      list: UiPartValue
      button: UiPartValue
      ellipsis: UiPartValue
      sizeSelect: UiPartValue
    }>
  }>(),
  { siblingCount: 1, motionCss: undefined },
)
const props = withProviderDefaults(rawProps, { motionCss: true })

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
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-pagination',
    !props.motionCss && 'ui-pagination--no-motion',
  ),
)
const listPart = computed(() => resolveUiPart(cx, themedUi()?.list, 'ui-pagination-list'))
const navButtonPart = computed(() =>
  resolveUiPart(cx, themedUi()?.button, 'ui-pagination-nav-button'),
)
function pageButtonPart(active: boolean) {
  return resolveUiPart(
    cx,
    themedUi()?.button,
    'ui-pagination-page-button',
    active && 'ui-pagination-page-button--active',
  )
}
const labelPart = computed(() => resolveUiPart(cx, themedUi()?.button, 'ui-pagination-label'))
const labelEllipsisPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.ellipsis,
    'ui-pagination-label-ellipsis',
    'ui-pagination-labels-spacer',
  ),
)
const ellipsisPart = computed(() =>
  resolveUiPart(cx, themedUi()?.ellipsis, 'ui-pagination-ellipsis'),
)
const sizeSelectPart = computed(() =>
  resolveUiPart(cx, themedUi()?.sizeSelect, 'ui-pagination-size-select'),
)

defineExpose({
  /** The page-number list. */
  listEl,
  /** The sliding highlight behind the current page. */
  indicatorEl,
  /** The page numbers in the contrast color, clipped to the indicator. */
  labelsEl,
})
</script>
