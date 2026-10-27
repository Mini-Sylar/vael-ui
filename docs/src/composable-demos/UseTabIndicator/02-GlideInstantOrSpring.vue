<template>
  <section class="demo">
    <h3>Glide, instant or spring</h3>
    <p class="note">
      <code>indicator</code> picks how it moves: a CSS glide (the default), an instant move, or a
      spring given as <code>{ damping, response }</code>. A spring writes each frame straight to
      <code>indicatorEl</code>, so pass that too. Below a damping of 1 it overshoots. With
      <code>orientation: 'vertical'</code> it follows the block axis, and
      <code>matchCross</code> fits it to the row's inset width as well.
    </p>
    <SelectButton v-model="mode" size="sm" :items="modes" :allow-empty="false" aria-label="Mode" />
    <nav ref="nav" class="side-nav" aria-label="Settings">
      <div ref="indicatorEl" class="ui-indicator side-nav-indicator" :style="style" />
      <a
        v-for="item in pages"
        :key="item"
        href="#"
        class="side-nav-link"
        :aria-current="page === item ? 'page' : undefined"
        @click.prevent="page = item"
      >
        {{ item }}
      </a>
    </nav>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { SelectButton, useTabIndicator } from 'vael-ui'

const pages = ['Profile', 'Account', 'Notifications', 'Billing', 'Integrations', 'Security']
const page = shallowRef('Account')

const modes = [
  { label: 'Glide', value: 'glide' },
  { label: 'Instant', value: 'instant' },
  { label: 'Spring', value: 'spring' },
]
const mode = shallowRef('spring')

const nav = useTemplateRef<HTMLElement>('nav')
const indicatorEl = useTemplateRef<HTMLElement>('indicatorEl')
const { style } = useTabIndicator(page, {
  listEl: nav,
  orientation: 'vertical',
  selector: '[aria-current="page"]',
  matchCross: true,
  indicator: computed(() =>
    mode.value === 'spring'
      ? { damping: 0.55, response: 0.4 }
      : (mode.value as 'glide' | 'instant'),
  ),
  indicatorEl,
})
</script>

<style scoped>
.side-nav {
  position: relative;
  isolation: isolate;
  display: grid;
  max-inline-size: 14rem;
  padding: 0.375rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
.side-nav-indicator {
  background: color-mix(in oklch, var(--ui-primary) 14%, var(--ui-surface));
}
.side-nav-link {
  padding: 0.5rem 0.75rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  text-decoration: none;
}
.side-nav-link[aria-current='page'] {
  color: var(--ui-text);
  font-weight: 500;
}
</style>
