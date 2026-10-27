<template>
  <section class="demo">
    <h3>A palette, edited live</h3>
    <p class="note">
      Five pickers bound to five custom properties on the card. Each panel offers the other four
      colors as presets, so the palette reuses its own colors. The card updates as you drag.
    </p>
    <div class="card" :style="cardStyle">
      <div class="card-head">
        <strong>Palette</strong>
        <span class="chip">{{ Object.keys(palette).length }} colors</span>
      </div>
      <div class="rows">
        <div v-for="(value, key) in palette" :key="key" class="row">
          <span class="row-name">{{ key }}</span>
          <ColorPicker
            v-model="palette[key]"
            size="sm"
            :label="`${key} color`"
            :presets="others(key)"
          />
          <code class="row-value">{{ value }}</code>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ColorPicker } from 'vael-ui'

const palette = reactive<Record<string, string>>({
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  accent: '#3b82f6',
  border: '#e2e8f0',
})
const others = (key: string) =>
  Object.entries(palette)
    .filter(([k]) => k !== key)
    .map(([, v]) => v)
const cardStyle = computed(() => ({
  '--card-bg': palette.background,
  '--card-surface': palette.surface,
  '--card-text': palette.text,
  '--card-accent': palette.accent,
  '--card-border': palette.border,
}))
</script>

<style scoped>
.card {
  max-inline-size: 26rem;
  padding: 1rem;
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-surface);
  background: var(--card-bg);
  color: var(--card-text);
  transition:
    background-color var(--ui-duration-press) ease,
    color var(--ui-duration-press) ease,
    border-color var(--ui-duration-press) ease;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block-end: 0.75rem;
}
.chip {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: var(--card-accent);
  color: #fff;
  font-size: 0.75rem;
}
.rows {
  display: grid;
  gap: 0.5rem;
}
.row {
  display: grid;
  grid-template-columns: 6rem auto 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--ui-radius);
  background: var(--card-surface);
}
.row-name {
  text-transform: capitalize;
}
.row-value {
  font-size: 0.8125rem;
  opacity: 0.7;
}
</style>
