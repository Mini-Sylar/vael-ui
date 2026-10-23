<!-- A toolbar of icon actions: the one you hover or focus grows into its label, and the bar follows. -->
<template>
  <section class="demo">
    <h3>Expandable action bar</h3>
    <div class="bar" role="toolbar" aria-label="Post actions" @pointerleave="active = -1">
      <button
        v-for="(action, i) in actions"
        :key="action.label"
        v-animate.size="quick"
        type="button"
        class="action"
        :aria-label="action.label"
        @pointerenter="active = i"
        @focus="active = i"
        @blur="active = -1"
      >
        <component :is="action.icon" :size="18" />
        <span v-if="active === i" v-animate="label">{{ action.label }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { vAnimate } from 'vael-ui'
import { PhBookmarkSimple, PhCopy, PhHeart, PhShareFat } from '@phosphor-icons/vue'

const actions = [
  { label: 'Like', icon: PhHeart },
  { label: 'Share', icon: PhShareFat },
  { label: 'Copy link', icon: PhCopy },
  { label: 'Save', icon: PhBookmarkSimple },
]
const active = shallowRef(-1)
// Hover happens all day: quick, no bounce.
const quick = { spring: { damping: 1, response: 0.25 } }
const label = {
  initial: { opacity: 0, blur: 2 },
  duration: 150,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
}
</script>

<style scoped>
.demo {
  display: grid;
  place-items: center;
  min-block-size: 8rem;
}
.bar {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: var(--ui-muted);
}
.action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  block-size: 2.25rem;
  padding-inline: 0.625rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ui-text);
  font: inherit;
  font-size: 0.875rem;
  white-space: nowrap;
  cursor: pointer;
}
.action:hover,
.action:focus-visible {
  background: var(--ui-surface);
}
.action svg {
  flex: none;
}
</style>
