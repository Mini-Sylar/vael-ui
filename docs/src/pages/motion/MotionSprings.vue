<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('motionDocs.springs.title') }}</h1>
    <p v-html="t('motionDocs.springs.intro')" />

    <h2 id="lab">{{ t('motionDocs.springs.labTitle') }}</h2>
    <div class="spring-lab">
      <div class="spring-controls">
        <SelectButton
          :model-value="preset"
          size="sm"
          :aria-label="t('motionDocs.springs.presets')"
          :items="
            PRESETS.map((p) => ({ label: t(`motionDocs.springs.preset.${p.id}`), value: p.id }))
          "
          @update:model-value="usePreset"
        />
        <label class="spring-row">
          <span><code>damping</code> {{ spring.damping.toFixed(2) }}</span>
          <Slider
            v-model="spring.damping"
            :min="0.2"
            :max="1.5"
            :step="0.05"
            aria-label="damping"
          />
        </label>
        <label class="spring-row">
          <span><code>response</code> {{ spring.response.toFixed(2) }}s</span>
          <Slider
            v-model="spring.response"
            :min="0.1"
            :max="1.2"
            :step="0.05"
            aria-label="response"
          />
        </label>
        <p class="spring-read">
          {{ t('motionDocs.springs.reads', { settle: Math.round(timing.duration) }) }}
        </p>
      </div>
      <div class="spring-visual">
        <svg
          class="spring-curve"
          viewBox="0 0 300 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1="0" :y1="target" x2="300" :y2="target" class="spring-target" />
          <path :d="curve" />
        </svg>
        <div class="spring-track">
          <span ref="ball" class="spring-ball" />
        </div>
        <Button size="sm" variant="outline" @click="play">{{
          t('motionDocs.springs.play')
        }}</Button>
      </div>
    </div>

    <h2 id="everywhere">{{ t('motionDocs.springs.everywhereTitle') }}</h2>
    <p v-html="t('motionDocs.springs.everywhereIntro')" />
    <ConfigProvider :motion="{ spring: { ...spring } }">
      <div class="spring-live">
        <Switch v-model="on" :label="t('motionDocs.springs.switch')" />
        <SelectButton
          v-model="tab"
          :allow-empty="false"
          :items="tabs.map((label) => ({ label, value: label }))"
          aria-label="Range"
        />
        <Button variant="secondary" @click="count += 128">
          <AnimatedNumber :value="count" />
        </Button>
        <Button @click="drawer = true">{{ t('motionDocs.springs.openDrawer') }}</Button>
        <Drawer v-model:open="drawer" :title="t('motionDocs.springs.drawerTitle')">
          <p>{{ t('motionDocs.springs.drawerBody') }}</p>
        </Drawer>
      </div>
    </ConfigProvider>
    <CodeBlock :code="snippet" />
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef, useTemplateRef } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import {
  AnimatedNumber,
  Button,
  ConfigProvider,
  Drawer,
  SelectButton,
  Slider,
  Switch,
  springEasing,
} from 'vael-ui'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'

const { t } = useI18n()
useHead({ title: () => t('motionDocs.springs.title') })

const PRESETS = [
  { id: 'snappy', damping: 1, response: 0.25 },
  { id: 'smooth', damping: 1, response: 0.4 },
  { id: 'bouncy', damping: 0.55, response: 0.45 },
  { id: 'gentle', damping: 0.9, response: 0.7 },
] as const
const spring = reactive({ damping: 0.85, response: 0.35 })
const preset = computed(
  () => PRESETS.find((p) => p.damping === spring.damping && p.response === spring.response)?.id,
)
function usePreset(id: unknown) {
  const p = PRESETS.find((x) => x.id === id)
  if (p) Object.assign(spring, { damping: p.damping, response: p.response })
}

// The library's own curve for this spring: what every component plays.
const timing = computed(() => springEasing({ ...spring }))

// Its position over time, drawn from the physics: 1 is where it settles.
const target = 30
const curve = computed(() => {
  const { damping: z, response } = spring
  const w = (2 * Math.PI) / response
  const end = timing.value.duration / 1000
  const points: string[] = []
  for (let i = 0; i <= 120; i++) {
    const s = (i / 120) * end
    let x: number
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z)
      x = 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + ((z * w) / wd) * Math.sin(wd * s))
    } else x = 1 - Math.exp(-w * s) * (1 + w * s)
    points.push(`${(i / 120) * 300},${110 - x * (110 - target)}`)
  }
  return `M${points.join(' L')}`
})

const ball = useTemplateRef<HTMLElement>('ball')
let away = false
function play() {
  const el = ball.value
  if (!el) return
  away = !away
  const distance = (el.parentElement?.clientWidth ?? 300) - el.offsetWidth
  const [from, to] = away ? [0, distance] : [distance, 0]
  el.animate([{ translate: `${from}px 0` }, { translate: `${to}px 0` }], {
    duration: timing.value.duration,
    easing: timing.value.easing,
    fill: 'forwards',
  })
}

const on = shallowRef(true)
const tabs = ['Day', 'Week', 'Month']
const tab = shallowRef('Day')
const count = shallowRef(1024)
const drawer = shallowRef(false)

const snippet = computed(
  () => `<ConfigProvider :motion="{ spring: { damping: ${spring.damping.toFixed(2)}, response: ${spring.response.toFixed(2)} } }">
  <App />
</ConfigProvider>`,
)

const tocLinks = computed(() => [
  { id: 'lab', label: t('motionDocs.springs.labTitle') },
  { id: 'everywhere', label: t('motionDocs.springs.everywhereTitle') },
])
</script>

<style scoped>
.spring-lab {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
}
.spring-controls {
  display: grid;
  align-content: start;
  gap: 1rem;
}
.spring-row {
  display: grid;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}
.spring-read {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
.spring-visual {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}
.spring-curve {
  inline-size: 100%;
  block-size: 7.5rem;
  overflow: visible;
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.spring-target {
  stroke: var(--ui-border);
  stroke-dasharray: 3 3;
}
.spring-track {
  inline-size: 100%;
  padding: 0.25rem;
  border-radius: 999px;
  background: var(--ui-muted);
}
.spring-ball {
  display: block;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  border-radius: 50%;
  background: var(--ui-primary);
}
.spring-live {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  margin-block-end: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
}
@media (max-width: 720px) {
  .spring-lab {
    grid-template-columns: 1fr;
  }
}
</style>
