<template>
  <section class="demo">
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
