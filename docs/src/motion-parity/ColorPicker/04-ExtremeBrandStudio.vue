<template>
  <section class="demo">
    <h3>Extreme: a brand studio, every pick tweened through the page</h3>
    <p class="note">
      <code>#trigger</code> replaces the swatch with an orb that <code>v-animate</code>'s
      <code>animate</code> spins open. Each pick eases the mock page's brand colour over 600ms the
      same way instead of snapping, the default slot adds a "recent" strip whose chips
      <code>v-animate</code> staggers in when the panel opens, and <code>#preset</code> marks the
      current preset with a check. The eyedropper is hidden with
      <code>:show-eye-dropper="false"</code>.
    </p>
    <div v-animate="{ animate: { '--studio-brand': { value: brand, ...pageEase } } }" class="page">
      <header class="page-head">
        <span class="logo" />
        <strong>Northwind</strong>
        <ColorPicker
          v-model="brand"
          v-model:open="open"
          :presets="presets"
          :show-eye-dropper="false"
          label="Brand color"
        >
          <template #trigger="{ color, open: isOpen }">
            <button
              type="button"
              class="orb"
              v-animate="{
                animate: { rotate: isOpen ? 180 : 0, scale: isOpen ? 1.1 : 1 },
                ...orbEase,
              }"
              :style="{ '--orb': color }"
              :aria-expanded="isOpen"
              aria-label="Brand color"
            />
          </template>
          <template #preset="{ selected }">
            <svg
              v-if="selected"
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              aria-hidden="true"
            >
              <path d="M3 8.5l3 3 7-7" stroke="#fff" stroke-width="2" stroke-linecap="round" />
            </svg>
          </template>
          <template #default="{ pick }">
            <div class="recent">
              <span class="recent-label">Recent</span>
              <button
                v-for="color in recent"
                :key="color"
                v-animate:chips="chips"
                type="button"
                class="recent-chip"
                :style="{ background: color }"
                :aria-label="color"
                @click="pick(color)"
              />
            </div>
          </template>
        </ColorPicker>
      </header>
      <h2 class="hero">Ship faster with less noise.</h2>
      <p class="lede">A landing page that follows the brand color the moment it changes.</p>
      <div class="actions">
        <button type="button" class="cta">Start free</button>
        <button type="button" class="cta cta--ghost">See pricing</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { ColorPicker, vAnimate } from 'vael-ui'

const presets = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0f766e']
const brand = shallowRef(presets[0]!)
const open = shallowRef(false)
const recent = shallowRef<string[]>([])

// Eased out (cubic), like GSAP's power2.out.
const easeOut = 'cubic-bezier(0.215, 0.61, 0.355, 1)'
// The page's brand eases from the colour on screen to each pick (a registered custom property).
// Its own timing: given for the whole look, a colour would be capped to a quick fade.
const pageEase = { duration: 600, easing: easeOut }
// GSAP's back.out(1.6): overshoots ~9% once, then settles.
const backOut =
  'linear(0, 0.1112, 0.2148, 0.3112, 0.4006, 0.4832, 0.5593, 0.6291, 0.6928, 0.7507, 0.8031, 0.8502, 0.8922, 0.9294, 0.962, 0.9902, 1.0144, 1.0347, 1.0514, 1.0648, 1.075, 1.0824, 1.0871, 1.0894, 1.0896, 1.0879, 1.0845, 1.0797, 1.0738, 1.0669, 1.0594, 1.0514, 1.0432, 1.0351, 1.0272, 1.0199, 1.0134, 1.0079, 1.0037, 1.001, 1)'
// The orb turns over and swells while the panel is open.
const orbEase = { duration: 500, easing: backOut }

watch(brand, (_, previous) => {
  if (previous && !recent.value.includes(previous))
    recent.value = [previous, ...recent.value].slice(0, 5)
})

// Recent chips rise in one after another each time the panel opens.
const chips = { initial: { opacity: 0, y: 6 }, stagger: 0.04, duration: 300, easing: easeOut }
</script>

<style>
/* Registered, so the brand colour interpolates instead of snapping. */
@property --studio-brand {
  syntax: '<color>';
  inherits: true;
  initial-value: #2563eb;
}
</style>

<style scoped>
.page {
  --studio-brand: #2563eb;
  --brand: var(--studio-brand);
  max-inline-size: 30rem;
  padding: 1.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
}
.page-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 1.5rem;
}
.page-head strong {
  flex: 1;
}
.logo {
  inline-size: 1.25rem;
  block-size: 1.25rem;
  border-radius: 0.375rem;
  background: var(--brand);
}
.orb {
  inline-size: 2.25rem;
  block-size: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: 9999px;
  background: conic-gradient(from 0deg, var(--orb), #fff 50%, var(--orb));
  box-shadow:
    0 0 0 2px var(--ui-surface),
    0 0 0 3px var(--orb);
  cursor: pointer;
}
.orb:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
.hero {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--brand);
}
.lede {
  margin: 0 0 1rem;
  color: var(--ui-text-muted);
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.cta {
  padding: 0.5rem 1rem;
  border: 1px solid var(--brand);
  border-radius: var(--ui-radius);
  background: var(--brand);
  color: #fff;
  font: inherit;
  cursor: pointer;
}
.cta--ghost {
  background: transparent;
  color: var(--brand);
}
.recent {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-block-start: 0.25rem;
  border-block-start: 1px solid var(--ui-border);
}
.recent-label {
  margin-inline-end: 0.25rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
.recent-chip {
  inline-size: 1.25rem;
  block-size: 1.25rem;
  padding: 0;
  border: 1px solid rgb(0 0 0 / 0.1);
  border-radius: 9999px;
  cursor: pointer;
}
</style>
