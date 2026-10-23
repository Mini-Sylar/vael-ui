<template>
  <section class="demo">
    <h3>Extreme: a brand studio, every pick tweened through the page (GSAP)</h3>
    <p class="note">
      <code>#trigger</code> replaces the swatch with an orb that GSAP spins as the panel opens. Each
      pick tweens the page’s custom properties over 600 ms instead of switching at once. The default
      slot adds a “Recent” row that staggers in when the panel opens, <code>#preset</code> marks the
      current preset with a check, and <code>:show-eye-dropper="false"</code> hides the eyedropper.
    </p>
    <div ref="page" class="page">
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
              ref="orb"
              type="button"
              class="orb"
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
            <div ref="recentEl" class="recent">
              <span class="recent-label">Recent</span>
              <button
                v-for="color in recent"
                :key="color"
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
import { nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { ColorPicker } from 'vael-ui'

const presets = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0f766e']
const brand = shallowRef(presets[0])
const open = shallowRef(false)
const recent = shallowRef<string[]>([])
const page = useTemplateRef<HTMLElement>('page')
const orb = useTemplateRef<HTMLButtonElement>('orb')
const recentEl = useTemplateRef<HTMLElement>('recentEl')

// The page's custom properties tween to the new brand, so buttons, logo and hero shift together.
watch(brand, (color, previous) => {
  if (page.value) gsap.to(page.value, { '--brand': color, duration: 0.6, ease: 'power2.out' })
  if (previous && !recent.value.includes(previous))
    recent.value = [previous, ...recent.value].slice(0, 5)
})

watch(open, (value) => {
  if (orb.value) {
    gsap.to(orb.value, {
      rotate: value ? 180 : 0,
      scale: value ? 1.1 : 1,
      duration: 0.5,
      ease: 'back.out(1.6)',
    })
  }
  if (!value) return
  nextTick(() => {
    const chips = recentEl.value?.querySelectorAll('.recent-chip')
    if (chips?.length)
      gsap.from(chips, { y: 6, opacity: 0, stagger: 0.04, duration: 0.3, ease: 'power2.out' })
  })
})
</script>

<style scoped>
.page {
  --brand: #2563eb;
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
