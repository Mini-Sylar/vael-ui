<template>
  <section class="demo">
    <h2>Select</h2>
    <p class="note">
      <code>usePopover</code> (position/lifecycle, reused verbatim from Menu/Popover) plus
      <code>useListbox</code> (index-driven active-option tracking: real DOM focus never leaves the
      trigger, <code>aria-activedescendant</code> points at the active row instead) plus
      <code>useVirtualizer</code> (own ~150-line uniform-row virtualizer, no dependency, kicks in
      automatically past 100 items). The panel's width always matches the trigger (<code
        >matchReferenceWidth</code
      >
      on <code>useFloatingPosition</code>): resize the window and reopen any Select below to see it
      track.
    </p>

    <h3>Basic, placeholder, clearable</h3>
    <p class="note">
      A realistic long option list (30 countries, one disabled) so the dropdown's real scroll and
      keyboard-navigation behavior is visible, not just three toy options.
    </p>
    <div class="row">
      <Select
        v-model="destination"
        :items="countries"
        placeholder="Choose a destination"
        clearable
      />
      <output class="panel-text">{{ destination ?? '(none)' }}</output>
    </div>

    <h3>Multiple, removable chips</h3>
    <p class="note">
      Every selection renders as a removable chip (each carries its own <code>×</code>, a real Tab
      stop, no need to reopen the panel to deselect one). <code>maxLabels</code> collapses the rest
      into a trailing "+N" once there are more than fit; the <code>display</code> prop can also swap
      chips entirely for a comma-joined label list or a localized count summary.
    </p>
    <Select
      v-model="targetMarkets"
      :items="countries"
      multiple
      :max-labels="3"
      placeholder="Target markets"
    />

    <h3>Infinite loading, the TanStack Query fit</h3>
    <p class="note">
      Select stays dumb: bind <code>:loading</code>, listen for <code>@reach-end</code>, append to
      your own <code>items</code> array. This is exactly the <code>useInfiniteQuery</code> shape,
      <code
        >&#64;reach-end="() =&gt; !isFetchingNextPage &amp;&amp; hasNextPage &amp;&amp;
        fetchNextPage()"</code
      >, <code>:items="data.pages.flatMap(p =&gt; p.items)"</code>,
      <code>:loading="isFetchingNextPage"</code>, no adapter needed. <code>reach-end</code> fires
      once per items-length value and re-arms only once the array actually grows, so a slow page
      fetch can't be spammed by scroll ticks in between. Scrolling far enough also crosses Select's
      own 100-item auto-virtualize threshold.
    </p>
    <Select
      v-model="pagedValue"
      :items="pagedItems"
      :loading="isFetchingNextPage"
      placeholder="Scroll to load more invoices"
      @reach-end="fetchNextPage"
    />
    <p class="note">
      Loaded {{ pagedItems.length }} of {{ TOTAL_REMOTE_ITEMS }},
      {{ isFetchingNextPage ? 'fetching…' : 'idle' }}
    </p>

    <h3>Custom exit animation (motion-v)</h3>
    <p class="note">
      <code>force-mount</code> + <code>before-close(done)</code> + the exposed
      <code>panelEl</code> hand a motion-v spring the whole open/close pop; Select's own CSS
      transition never runs. The panel's <code>positionerStyle.visibility</code> (also exposed)
      gates the entrance so it never starts before floating-ui has actually placed the panel. Close
      it by picking an item, pressing Escape, clicking outside, or re-clicking the trigger: all four
      route through <code>beforeClose</code>.
    </p>
    <Select
      ref="springSelect"
      v-model="springValue"
      v-model:open="springOpen"
      :items="countries"
      placeholder="Choose a destination"
      force-mount
      :before-close="beforeCloseSpring"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { animate } from 'motion-v'
import { Select } from 'vael-ui'
import type { SelectItemData } from 'vael-ui'

// Shared with ComboboxDemo's basic/multiple sections so the two feel like
// siblings: same domain, same length, same shape.
const countries: SelectItemData[] = [
  { label: 'Ghana', value: 'GH' },
  { label: 'Nigeria', value: 'NG' },
  { label: 'Kenya', value: 'KE' },
  { label: 'South Africa', value: 'ZA' },
  { label: 'Egypt', value: 'EG' },
  { label: 'Morocco', value: 'MA' },
  { label: "Côte d'Ivoire", value: 'CI' },
  { label: 'Senegal', value: 'SN' },
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'Mexico', value: 'MX' },
  { label: 'Brazil', value: 'BR' },
  { label: 'Argentina', value: 'AR' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'France', value: 'FR' },
  { label: 'Germany', value: 'DE' },
  { label: 'Spain', value: 'ES' },
  { label: 'Portugal', value: 'PT' },
  { label: 'Türkiye', value: 'TR' },
  { label: 'Poland', value: 'PL' },
  { label: 'Sweden', value: 'SE' },
  { label: 'Switzerland', value: 'CH' },
  { label: 'India', value: 'IN' },
  { label: 'China', value: 'CN' },
  { label: 'Japan', value: 'JP' },
  { label: 'South Korea', value: 'KR' },
  { label: 'Indonesia', value: 'ID' },
  { label: 'Vietnam', value: 'VN' },
  { label: 'Australia', value: 'AU' },
  { label: 'Antarctica', value: 'AQ', disabled: true },
]

const destination = shallowRef<string | number | null>(null)
const targetMarkets = shallowRef<(string | number)[]>(['GH', 'NG', 'US'])

// Simulated TanStack-Query infinite pager with the useInfiniteQuery shape
const TOTAL_REMOTE_ITEMS = 500
const PAGE_SIZE = 40
const remoteCatalog: SelectItemData[] = Array.from({ length: TOTAL_REMOTE_ITEMS }, (_, i) => ({
  label: `Invoice #${1000 + i}`,
  value: i,
}))
const pagedItems = shallowRef<SelectItemData[]>(remoteCatalog.slice(0, PAGE_SIZE))
const pagedValue = shallowRef<string | number | null>(null)
const isFetchingNextPage = shallowRef(false)
function fetchNextPage() {
  if (isFetchingNextPage.value) return
  if (pagedItems.value.length >= TOTAL_REMOTE_ITEMS) return
  isFetchingNextPage.value = true
  setTimeout(() => {
    pagedItems.value = remoteCatalog.slice(0, pagedItems.value.length + PAGE_SIZE)
    isFetchingNextPage.value = false
  }, 500)
}

// Manual type: TS can't derive InstanceType from a generic SFC
const springSelect = useTemplateRef<{
  panelEl: HTMLElement | null
  positionerStyle: { visibility: string }
}>('springSelect')
const springOpen = shallowRef(false)
const springValue = shallowRef<string | number | null>(null)

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function animatePanel(panel: HTMLElement, target: { scale: number; opacity: number }) {
  if (reducedMotion()) {
    panel.style.transform = ''
    panel.style.opacity = ''
    return Promise.resolve()
  }
  const controls = animate(panel, target, { type: 'spring', visualDuration: 0.28, bounce: 0.28 })
  return controls.finished.then(() => {
    panel.style.transform = ''
    panel.style.opacity = ''
  })
}

// Pre-set closed state before floating-ui positions, to avoid a race
watch(springOpen, (isOpen) => {
  if (!isOpen) return
  const panel = springSelect.value?.panelEl
  if (panel && !reducedMotion()) {
    panel.style.transform = 'scale(0.92)'
    panel.style.opacity = '0'
  }
})

watch(
  () => springOpen.value && springSelect.value?.positionerStyle.visibility === 'visible',
  (ready) => {
    const panel = springSelect.value?.panelEl
    if (!ready || !panel) return
    void animatePanel(panel, { scale: 1, opacity: 1 })
  },
)

function beforeCloseSpring(done: () => void) {
  const panel = springSelect.value?.panelEl
  if (!panel) {
    done()
    return
  }
  void animatePanel(panel, { scale: 0.92, opacity: 0 }).then(done)
}
</script>
