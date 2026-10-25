<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('motionDocs.engines.title') }}</h1>
    <p v-html="t('motionDocs.engines.intro')" />

    <h2 id="side-by-side">{{ t('motionDocs.engines.compareTitle') }}</h2>
    <p v-html="t('motionDocs.engines.compareIntro')" />
    <Button class="engines-play" @click="openAll">{{ t('motionDocs.engines.openAll') }}</Button>
    <div class="engines">
      <section v-for="column in columns" :key="column.id" class="engine">
        <p class="engine-name">{{ column.name }}</p>
        <ConfigProvider :motion="column.style">
          <Popover v-model:open="open[column.id]" side="bottom" align="start">
            <template #trigger="{ setTriggerEl }">
              <Button :ref="setTriggerEl" variant="outline" size="sm" @click="toggle(column.id)">
                {{ t('motionDocs.engines.open') }}
              </Button>
            </template>
            <div class="engine-panel">
              <strong>{{ column.name }}</strong>
              <span>{{ t(`motionDocs.engines.note.${column.id}`) }}</span>
            </div>
          </Popover>
        </ConfigProvider>
      </section>
    </div>

    <h2 id="adapters">{{ t('motionDocs.engines.adaptersTitle') }}</h2>
    <p v-html="t('motionDocs.engines.adaptersIntro')" />
    <CodeBlock lang="typescript" :code="GSAP_CODE" />
    <CodeBlock lang="typescript" :code="MOTION_CODE" />

    <h2 id="app-wide">{{ t('motionDocs.engines.appWideTitle') }}</h2>
    <p v-html="t('motionDocs.engines.appWideIntro')" />
    <CodeBlock :code="APP_CODE" />
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { animate } from 'motion-v'
import { Button, ConfigProvider, Popover } from 'vael-ui'
import type { MotionEngine, MotionStyle } from 'vael-ui/motion'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'

const { t } = useI18n()
useHead({ title: () => t('motionDocs.engines.title') })

// What every engine plays: the same values, in vael-ui's names.
const overlay = { initial: { opacity: 0, y: 12, scale: 0.9 } }

const gsapEngine: MotionEngine = (el, from, to, { duration, delay }) =>
  gsap.fromTo(el, { ...from }, { ...to, duration, delay, ease: 'power3.out', overwrite: 'auto' })

const motionEngine: MotionEngine = (el, from, to, { duration, delay, spring }) => {
  const keyframes = Object.fromEntries(Object.keys(to).map((key) => [key, [from[key], to[key]]]))
  return animate(
    el,
    keyframes,
    spring
      ? {
          type: 'spring',
          visualDuration: spring.response,
          bounce: Math.max(0, 1 - (spring.damping ?? 1)),
          delay,
        }
      : { duration, delay, ease: [0.23, 1, 0.32, 1] },
  )
}

const columns: { id: string; name: string; style: MotionStyle }[] = [
  { id: 'waapi', name: 'Web Animations', style: { version: 1, overlay } },
  { id: 'gsap', name: 'GSAP', style: { version: 1, overlay, engine: gsapEngine } },
  {
    id: 'motion',
    name: 'motion',
    style: { version: 1, overlay, engine: motionEngine, spring: { damping: 0.6, response: 0.4 } },
  },
]
const open = reactive<Record<string, boolean>>({ waapi: false, gsap: false, motion: false })
const toggle = (id: string) => (open[id] = !open[id])
function openAll() {
  const next = !Object.values(open).some(Boolean)
  for (const key of Object.keys(open)) open[key] = next
}

const GSAP_CODE = `import { gsap } from 'gsap'
import type { MotionEngine } from 'vael-ui/motion'

// The engine receives the element, its values and the timing in seconds; return the tween.
export const gsapEngine: MotionEngine = (el, from, to, { duration, delay }) =>
  gsap.fromTo(el, from, { ...to, duration, delay, ease: 'power3.out' })`

const MOTION_CODE = `import { animate } from 'motion'
import type { MotionEngine } from 'vael-ui/motion'

// The spring behind vael-ui's timing, when there is one, in motion's own terms.
export const motionEngine: MotionEngine = (el, from, to, { duration, delay, spring }) =>
  animate(
    el,
    Object.fromEntries(Object.keys(to).map((key) => [key, [from[key], to[key]]])),
    spring
      ? {
          type: 'spring',
          visualDuration: spring.response,
          bounce: Math.max(0, 1 - (spring.damping ?? 1)),
          delay,
        }
      : { duration, delay },
  )`

// Split so the SFC parser doesn't read it as the end of this block.
const SCRIPT_END = '</' + 'script>'
const APP_CODE = `<script setup lang="ts">
import { ConfigProvider } from 'vael-ui'
import { gsapEngine } from './gsapEngine'
${SCRIPT_END}

<template>
  <ConfigProvider :motion="{ version: 1, engine: gsapEngine }">
    <RouterView />
  </ConfigProvider>
</template>`

const tocLinks = computed(() => [
  { id: 'side-by-side', label: t('motionDocs.engines.compareTitle') },
  { id: 'adapters', label: t('motionDocs.engines.adaptersTitle') },
  { id: 'app-wide', label: t('motionDocs.engines.appWideTitle') },
])
</script>

<style scoped>
.engines-play {
  margin-block-end: 1rem;
}
.engines {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-block-end: 2rem;
}
.engine {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  min-block-size: 9rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
}
.engine-name {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}
.engine-panel {
  display: grid;
  gap: 0.25rem;
  max-inline-size: 10.5rem;
  padding: 0.75rem;
  font-size: 0.875rem;
}
.engine-panel span {
  color: var(--ui-text-muted);
}
@media (max-width: 720px) {
  .engines {
    grid-template-columns: 1fr;
  }
}
</style>
