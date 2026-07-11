<template>
  <section class="demo">
    <h2>Select</h2>
    <p class="note">
      <code>usePopover</code> (position/lifecycle, reused verbatim from Menu/Popover) +
      <code>useListbox</code> (index-driven active-option tracking — real DOM focus never leaves the
      trigger, <code>aria-activedescendant</code> points at the active row instead) +
      <code>useVirtualizer</code> (own ~150-line uniform-row virtualizer, no dependency). The
      panel's width always matches the trigger (<code>matchReferenceWidth</code> on
      <code>useFloatingPosition</code>) — resize the window and reopen any Select below to see it
      track.
    </p>

    <h3>Basic — placeholder, clearable</h3>
    <div class="row">
      <Select v-model="fruit" :items="fruits" placeholder="Choose a fruit" clearable />
      <output class="panel-text">{{ fruit ?? '(none)' }}</output>
    </div>

    <h3>Multiple</h3>
    <div class="row">
      <Select
        v-model="fruitsMulti"
        :items="fruits"
        multiple
        placeholder="Choose fruits"
        clearable
      />
      <output class="panel-text">{{
        fruitsMulti.length ? fruitsMulti.join(', ') : '(none)'
      }}</output>
    </div>

    <h3>Multiple, with chips — <code>maxLabels</code></h3>
    <p class="note">
      Every selection renders as a removable chip (each carries its own <code>×</code>, real Tab
      stop, no need to reopen the panel to deselect one) — <code>maxLabels</code> collapses the rest
      into a trailing "+N", uncollapsed by default. The <code>#value</code> slot still overrides
      this entirely if you want your own display.
    </p>
    <Select
      v-model="fruitsChips"
      :items="fruits"
      multiple
      :max-labels="2"
      placeholder="Pick a few"
    />

    <h3>Multiple, display modes — <code>display</code></h3>
    <p class="note">
      <code>display</code> (multiple mode only, default <code>"chip"</code>) controls how the
      trigger summarizes more than one selection: removable chips, a comma-joined label list
      (<code>"text"</code>, the same rendering single-select already uses), or a localized count
      summary (<code>"count"</code> — <code>select.selectedCount</code> in messages.ts).
    </p>
    <div class="row">
      <div>
        <p class="panel-text">chip (default)</p>
        <Select
          v-model="displayChip"
          :items="fruits"
          multiple
          display="chip"
          placeholder="Pick a few"
        />
      </div>
      <div>
        <p class="panel-text">text</p>
        <Select
          v-model="displayText"
          :items="fruits"
          multiple
          display="text"
          placeholder="Pick a few"
        />
      </div>
      <div>
        <p class="panel-text">count</p>
        <Select
          v-model="displayCount"
          :items="fruits"
          multiple
          display="count"
          placeholder="Pick a few"
        />
      </div>
    </div>

    <h3>Virtualized — 10,000 rows</h3>
    <p class="note">
      Only the visible window (plus overscan) is ever in the DOM — open it and inspect the panel;
      there are nowhere near 10,000 <code>[role="option"]</code> elements. Auto-virtualizes past 100
      items (<code>virtualize</code> defaults to "auto"); Home/End/PageUp/PageDown-style jumps work
      correctly even through rows that haven't rendered yet, because navigation is index-driven, not
      DOM-driven.
    </p>
    <Select v-model="bigValue" :items="bigItems" placeholder="10,000 items" clearable />
    <p class="note">Selected index: {{ bigValue ?? '(none)' }}</p>

    <h3>Infinite loading — the TanStack Query fit</h3>
    <p class="note">
      Select stays dumb: bind <code>:loading</code>, listen for <code>@reach-end</code>, append to
      your own <code>items</code> array. This is exactly the <code>useInfiniteQuery</code> shape —
      <code
        >&#64;reach-end="() =&gt; !isFetchingNextPage &amp;&amp; hasNextPage &amp;&amp;
        fetchNextPage()"</code
      >, <code>:items="data.pages.flatMap(p =&gt; p.items)"</code>,
      <code>:loading="isFetchingNextPage"</code> — no adapter needed. <code>reach-end</code> fires
      once per items-length value and re-arms only once the array actually grows, so a slow page
      fetch can't be spammed by scroll ticks in between.
    </p>
    <Select
      v-model="pagedValue"
      :items="pagedItems"
      :loading="isFetchingNextPage"
      placeholder="Scroll to load more"
      @reach-end="fetchNextPage"
    />
    <p class="note">
      Loaded {{ pagedItems.length }} of {{ TOTAL_REMOTE_ITEMS }} —
      {{ isFetchingNextPage ? 'fetching…' : 'idle' }}
    </p>

    <h3>Adversarial: rapid open/close, reopen mid-exit</h3>
    <p class="note">
      A <code>beforeClose</code> that takes 400ms to resolve — click to open, click again to start
      closing, then click a THIRD time before the exit finishes. The panel must pick back up and
      reopen cleanly, never get stuck half-closed or double-fire <code>@select</code>. This is the
      philosophy memory's meta-lesson: real care here, not just the happy path.
    </p>
    <Select
      v-model="adversarialValue"
      :items="fruits"
      placeholder="Click me rapidly"
      :before-close="slowBeforeClose"
    />

    <h3>Motion-v: spring panel entrance/exit</h3>
    <p class="note">
      <code>force-mount</code> + <code>before-close(done)</code> + the exposed
      <code>panelEl</code> hand a motion-v spring the whole open/close pop — Select's own CSS
      transition never runs. Same shape as the Drawer's spring, rotated from a slide onto a
      scale+opacity pop. The panel's <code>positionerStyle.visibility</code> (also exposed) gates
      the entrance so it never starts before floating-ui has actually placed the panel. Close it by
      picking a fruit, pressing Escape, clicking outside, or re-clicking the trigger — all four now
      route through <code>beforeClose</code> (a real gap this demo caught:
      <code>onTriggerClick</code> used to write <code>open.value</code> directly, skipping
      <code>requestClose</code> and snapping shut with no spring — fixed in Select.vue).
    </p>
    <Select
      ref="springSelect"
      v-model="springValue"
      v-model:open="springOpen"
      :items="fruits"
      placeholder="Choose a fruit"
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

const fruits: SelectItemData[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Date', value: 'date' },
  { label: 'Elderberry', value: 'elderberry', disabled: true },
  { label: 'Fig', value: 'fig' },
  { label: 'Grape', value: 'grape' },
]

const fruit = shallowRef<string | number | null>(null)
const fruitsMulti = shallowRef<(string | number)[]>([])
const fruitsChips = shallowRef<(string | number)[]>(['apple', 'banana', 'cherry', 'date'])

const displayChip = shallowRef<(string | number)[]>(['apple', 'banana'])
const displayText = shallowRef<(string | number)[]>(['apple', 'banana'])
const displayCount = shallowRef<(string | number)[]>(['apple', 'banana', 'cherry'])

const bigItems: SelectItemData[] = Array.from({ length: 10000 }, (_, i) => ({
  label: `Item ${i.toLocaleString()}`,
  value: i,
}))
const bigValue = shallowRef<string | number | null>(null)

// Simulated TanStack-Query infinite pager with useInfiniteQuery shape
const TOTAL_REMOTE_ITEMS = 500
const PAGE_SIZE = 40
const remoteCatalog: SelectItemData[] = Array.from({ length: TOTAL_REMOTE_ITEMS }, (_, i) => ({
  label: `Remote result #${i + 1}`,
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
    const next = remoteCatalog.slice(0, pagedItems.value.length + PAGE_SIZE)
    pagedItems.value = next
    isFetchingNextPage.value = false
  }, 500)
}

const adversarialValue = shallowRef<string | number | null>(null)
function slowBeforeClose(done: () => void) {
  setTimeout(done, 400)
}

// Manual type: TS can't derive InstanceType from generic SFC
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

// Pre-set closed state before floating-ui positions to avoid race condition
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
