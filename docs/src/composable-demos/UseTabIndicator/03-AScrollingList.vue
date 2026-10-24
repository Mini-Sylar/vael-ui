<template>
  <section class="demo">
    <h3>A scrolling list with long jumps</h3>
    <p class="note">
      Focus the list and use the arrow keys, then Home and End. With <code>scroller</code> the
      indicator lives inside the scrolled content and scrolls with the rows. With
      <code>maxGlide: 3</code>, a move longer than three rows jumps instead of sweeping across the
      list. Select, Combobox and CommandPalette set the same three options.
    </p>
    <div
      ref="list"
      class="scroll-list"
      role="listbox"
      tabindex="0"
      aria-label="Countries"
      :aria-activedescendant="`country-${active}`"
      @keydown="onKeydown"
    >
      <div class="ui-indicator" :style="style" />
      <div
        v-for="(country, index) in countries"
        :id="`country-${index}`"
        :key="country"
        role="option"
        class="scroll-row"
        :aria-selected="index === active"
        :data-active="index === active || undefined"
        @click="move(index)"
      >
        {{ country }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import { useTabIndicator } from 'vael-ui'

const countries = [
  'Argentina',
  'Australia',
  'Brazil',
  'Canada',
  'Chile',
  'Denmark',
  'Egypt',
  'Finland',
  'France',
  'Germany',
  'Ghana',
  'India',
  'Italy',
  'Japan',
  'Kenya',
  'Mexico',
  'Norway',
  'Portugal',
  'Spain',
  'Sweden',
]
const active = shallowRef(2)

const list = useTemplateRef<HTMLElement>('list')
const { style } = useTabIndicator(active, {
  listEl: list,
  orientation: 'vertical',
  selector: '[data-active]',
  scroller: true,
  matchCross: true,
  maxGlide: 3,
})

async function move(index: number) {
  active.value = Math.min(Math.max(index, 0), countries.length - 1)
  await nextTick()
  list.value?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(event: KeyboardEvent) {
  const next =
    event.key === 'ArrowDown'
      ? active.value + 1
      : event.key === 'ArrowUp'
        ? active.value - 1
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? countries.length - 1
            : null
  if (next === null) return
  event.preventDefault()
  move(next)
}
</script>

<style scoped>
.scroll-list {
  position: relative;
  isolation: isolate;
  max-inline-size: 16rem;
  max-block-size: 12rem;
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.scroll-list:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
.scroll-row {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
}
</style>
