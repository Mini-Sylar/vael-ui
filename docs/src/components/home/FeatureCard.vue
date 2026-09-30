<template>
  <component
    :is="to ? RouterLink : 'article'"
    :to="to"
    class="feature-card"
    :class="{ 'feature-card--link': to }"
  >
    <div class="feature-visual" aria-hidden="true">
      <slot name="visual" />
    </div>
    <div class="feature-copy">
      <h2>
        <component :is="icon" :size="18" class="feature-icon" />
        {{ title }}
      </h2>
      <p>{{ body }}</p>
    </div>
  </component>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'

defineProps<{ icon: Component; title: string; body: string; to?: string }>()
</script>

<style scoped>
.feature-card {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
  color: inherit;
  text-decoration: none;
  /* Depth from layered shadows; the hairline ring keeps the card's edge. */
  box-shadow:
    0 0 0 1px var(--ui-border),
    0 1px 2px color-mix(in oklch, black 4%, transparent);
  overflow: hidden;
  transition: box-shadow var(--ui-duration-press) var(--ui-ease-out);
}

.feature-card--link:hover,
.feature-card--link:focus-visible {
  box-shadow:
    0 0 0 1px color-mix(in oklch, var(--docs-accent, var(--ui-text)) 45%, var(--ui-border)),
    0 6px 20px -8px color-mix(in oklch, black 18%, transparent);
}

.feature-card--link:focus-visible {
  outline: 2px solid var(--ui-text);
  outline-offset: 3px;
}

.feature-visual {
  position: relative;
  display: grid;
  place-items: center;
  block-size: 9.5rem;
  padding: 1rem;
  border-block-end: 1px solid var(--ui-border);
  background:
    radial-gradient(color-mix(in oklch, var(--ui-text) 9%, transparent) 1px, transparent 1px) 0 0 /
      14px 14px,
    var(--ui-muted);
  overflow: hidden;
}

.feature-copy {
  padding: 1rem 1.25rem 1.2rem;
}

.feature-copy h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.3rem;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.feature-icon {
  flex: none;
  color: var(--docs-accent, var(--ui-text));
}

.feature-copy p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
  text-wrap: pretty;
}
</style>
